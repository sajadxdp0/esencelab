"""FastAPI route handlers for the AI service."""
from __future__ import annotations

import time
from typing import Dict, List

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from starlette.concurrency import run_in_threadpool

from .assistant import (
    SUPPORTED_STUDENT_FEATURES,
    _as_list,
    _assistant_cache,
    _assistant_cache_key,
    ASSISTANT_CACHE_TTL_SEC,
    _call_groq_assistant,
    _prune_assistant_cache,
)
from .config import (
    MAX_RESUME_FILE_SIZE_BYTES,
    MAX_RESUME_FILE_SIZE_MB,
    _log_event,
    _serialize_error,
)
from .matching import calculate_tfidf_match, generate_explanation
from .parsing import (
    empty_parsed_resume,
    extract_skills,
    extract_text_from_pdf_bytes,
    normalize_skill_list,
    parse_resume_text,
    preprocess_text,
)
from .schemas import (
    MatchRequest,
    MatchResponse,
    ResumeParseResponse,
    StudentAssistantRequest,
    StudentAssistantResponse,
)

router = APIRouter()


@router.get("/")
async def root() -> Dict[str, str]:
    """Service identity endpoint."""
    return {"message": "Esencelab AI Service is running"}


@router.get("/health")
async def health() -> Dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}


@router.get("/ai/health")
async def ai_health_alias() -> Dict[str, str]:
    """Aliased liveness probe under the internal /ai prefix."""
    return await health()


@router.post("/ai/parse-resume", response_model=ResumeParseResponse)
async def parse_resume_endpoint(
    request: Request, file: UploadFile = File(...)
) -> ResumeParseResponse:
    """Parse an uploaded PDF resume into structured fields."""
    filename = str(file.filename or "").strip().lower()
    content_length = request.headers.get("content-length")
    try:
        raw_content_length = int(content_length) if content_length else 0
    except ValueError:
        raw_content_length = 0
    if raw_content_length > MAX_RESUME_FILE_SIZE_BYTES + 2048:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_RESUME_FILE_SIZE_MB}MB.",
        )
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        chunks: List[bytes] = []
        bytes_read = 0
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            bytes_read += len(chunk)
            if bytes_read > MAX_RESUME_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size is {MAX_RESUME_FILE_SIZE_MB}MB.",
                )
            chunks.append(chunk)
        content = b"".join(chunks)
        parsed_data = empty_parsed_resume()

        try:
            text = await run_in_threadpool(extract_text_from_pdf_bytes, content)
            if text:
                parsed_data = await run_in_threadpool(parse_resume_text, text)
        except Exception as exc:
            _log_event(
                "warning",
                "resume.parse.fallback_used",
                requestId=getattr(request.state, "request_id", None),
                error=_serialize_error(exc),
            )
            # Do not fail the full flow for malformed or scanned PDFs.
            parsed_data = empty_parsed_resume()

        return ResumeParseResponse(
            parsedData=parsed_data, skills=parsed_data.get("skills", [])
        )
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        _log_event(
            "error",
            "resume.parse.failed",
            requestId=getattr(request.state, "request_id", None),
            error=_serialize_error(exc),
        )
        raise HTTPException(
            status_code=422,
            detail="Could not parse resume. Please ensure the file is a valid PDF with extractable text.",
        )


@router.post("/ai/match", response_model=MatchResponse)
async def match_jobs(
    request: MatchRequest, http_request: Request
) -> MatchResponse:
    """Score a resume against a job and explain the match."""
    try:
        resume_skills = normalize_skill_list(request.resumeSkills)
        job_skills = normalize_skill_list(
            request.jobRequiredSkills
            if request.jobRequiredSkills
            else extract_skills(request.jobRequirements)
        )

        resume_set = {skill.lower() for skill in resume_skills}
        job_set = {skill.lower() for skill in job_skills}
        display_map = {skill.lower(): skill for skill in job_skills}

        matched = sorted(
            [display_map.get(skill, skill.title()) for skill in (resume_set & job_set)]
        )
        missing = sorted(
            [display_map.get(skill, skill.title()) for skill in (job_set - resume_set)]
        )

        skill_overlap = len(matched) / len(job_set) if job_set else 0.0
        tfidf_score = await run_in_threadpool(
            calculate_tfidf_match,
            resume_skills,
            job_skills,
            request.jobRequirements,
        )
        final_score = round(((skill_overlap * 0.55) + (tfidf_score * 0.45)), 4)

        explanation = (
            generate_explanation(final_score, matched, missing)
            if request.includeExplanation
            else None
        )

        return MatchResponse(
            matchScore=max(0.0, min(final_score, 1.0)),
            matchedSkills=matched,
            missingSkills=missing,
            explanation=explanation,
        )
    except Exception as exc:
        _log_event(
            "error",
            "match.failed",
            requestId=getattr(http_request.state, "request_id", None),
            error=_serialize_error(exc),
        )
        raise HTTPException(status_code=500, detail="Failed to calculate match")


@router.post("/ai/extract-skills")
async def extract_skills_endpoint(
    http_request: Request, text: str = Form(...)
) -> Dict[str, List[str]]:
    """Extract known skills from raw text."""
    try:
        return {"skills": extract_skills(preprocess_text(text))}
    except Exception as exc:
        _log_event(
            "error",
            "skills.extract.failed",
            requestId=getattr(http_request.state, "request_id", None),
            error=_serialize_error(exc),
        )
        raise HTTPException(status_code=500, detail="Failed to extract skills")


@router.post("/ai/student-assistant", response_model=StudentAssistantResponse)
async def student_assistant_endpoint(
    request: StudentAssistantRequest, http_request: Request
) -> StudentAssistantResponse:
    """Return cached or freshly generated student guidance."""
    feature = str(request.feature or "").strip().lower()
    if feature not in SUPPORTED_STUDENT_FEATURES:
        feature = "skill_gap"

    prompt = str(request.prompt or "").strip()
    context = request.context or {}
    cache_key = _assistant_cache_key(feature, prompt, context)
    _prune_assistant_cache()
    cached = _assistant_cache.get(cache_key)
    if cached and cached.get("expiresAt", 0) > time.time():
        _assistant_cache.move_to_end(cache_key)
        return StudentAssistantResponse(**cached["data"])

    result = await run_in_threadpool(_call_groq_assistant, feature, prompt, context)
    # Ensure response safety and shape
    safe_result = {
        "provider": str(result.get("provider") or "fallback"),
        "model": result.get("model"),
        "feature": feature,
        "title": str(result.get("title") or "AI Career Guidance")[:120],
        "summary": str(result.get("summary") or "No guidance generated right now.")[
            :900
        ],
        "actionItems": [
            str(item).strip()
            for item in _as_list(result.get("actionItems"))
            if str(item).strip()
        ][:8]
        or ["Try again with a more specific question."],
        "followUpQuestions": [
            str(item).strip()
            for item in _as_list(result.get("followUpQuestions"))
            if str(item).strip()
        ][:5],
    }

    _assistant_cache[cache_key] = {
        "expiresAt": time.time() + max(30, ASSISTANT_CACHE_TTL_SEC),
        "data": safe_result,
    }
    _assistant_cache.move_to_end(cache_key)
    _prune_assistant_cache()
    _log_event(
        "info",
        "student_assistant.completed",
        requestId=getattr(http_request.state, "request_id", None),
        feature=feature,
        provider=safe_result["provider"],
    )
    return StudentAssistantResponse(**safe_result)
