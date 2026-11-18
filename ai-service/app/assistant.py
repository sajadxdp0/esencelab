"""Student assistant fallback guidance, Groq integration and response caching."""
from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.request
from collections import OrderedDict
from typing import Any, Dict, List

from .config import _int_env, _log_event, _serialize_error

SUPPORTED_STUDENT_FEATURES = {
    "skill_gap",
    "resume_improvement",
    "interview_prep",
    "project_ideas",
    "study_plan",
}

STUDENT_ASSISTANT_PROMPTS = {
    "skill_gap": "Analyze skill gaps and suggest high-impact next skills with practical actions.",
    "resume_improvement": "Improve resume quality with precise, ATS-friendly and recruiter-friendly suggestions.",
    "interview_prep": "Generate technical and behavioral interview prep advice with actionable practice steps.",
    "project_ideas": "Suggest portfolio-worthy project ideas aligned to the target role and missing skills.",
    "study_plan": "Create a concise weekly study plan with milestones and realistic outcomes.",
}
ASSISTANT_CACHE_TTL_SEC = _int_env("STUDENT_ASSISTANT_CACHE_TTL_SEC", 300, 30, 3600)
ASSISTANT_CACHE_MAX_ENTRIES = _int_env(
    "STUDENT_ASSISTANT_CACHE_MAX_ENTRIES", 256, 16, 4096
)
_assistant_cache: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
def _as_list(value: Any) -> List[Any]:
    return value if isinstance(value, list) else []


def _as_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _compact_context(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Keep only the fields that matter for the student assistant request.

    This protects latency and token usage by trimming large objects before we
    send the payload to Groq.
    """
    safe_context = _as_dict(context)
    role = str(safe_context.get("targetRole") or "").strip()
    skills = [
        str(item).strip()
        for item in _as_list(safe_context.get("skills"))
        if str(item).strip()
    ]
    missing_skills = [
        str(item).strip()
        for item in _as_list(safe_context.get("missingSkills"))
        if str(item).strip()
    ]
    resume_summary = str(safe_context.get("resumeSummary") or "").strip()
    readiness = safe_context.get("readinessScore")
    roadmap_highlights = [
        str(item).strip()
        for item in _as_list(safe_context.get("roadmapHighlights"))
        if str(item).strip()
    ]
    top_resources = []
    for item in _as_list(safe_context.get("topResources"))[:3]:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        provider = str(item.get("provider") or "").strip()
        url = str(item.get("url") or "").strip()
        if title:
            top_resources.append(
                {
                    "title": title[:120],
                    "provider": provider[:80],
                    "url": url[:240],
                }
            )
    top_jobs = []
    for item in _as_list(safe_context.get("topRecommendedJobs"))[:3]:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        company = str(item.get("company") or "").strip()
        match_score = item.get("matchScore")
        if title:
            top_jobs.append(
                {
                    "title": title[:120],
                    "company": company[:120],
                    "matchScore": match_score,
                }
            )
    score_sections = _as_dict(safe_context.get("scoreSections"))
    application_status_counts = _as_dict(safe_context.get("applicationStatusCounts"))
    role = role[:120]
    resume_summary = resume_summary[:700]
    skills = skills[:30]
    missing_skills = missing_skills[:30]
    roadmap_highlights = roadmap_highlights[:8]
    return {
        "targetRole": role,
        "skills": skills,
        "missingSkills": missing_skills,
        "resumeSummary": resume_summary,
        "readinessScore": readiness,
        "roadmapHighlights": roadmap_highlights,
        "topResources": top_resources,
        "topRecommendedJobs": top_jobs,
        "scoreSections": score_sections,
        "applicationStatusCounts": application_status_counts,
    }


def _assistant_cache_key(feature: str, prompt: str, context: Dict[str, Any]) -> str:
    payload = {
        "feature": feature,
        "prompt": prompt.strip().lower(),
        "context": _compact_context(context),
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _prune_assistant_cache() -> None:
    now = time.time()
    stale_keys = [
        key
        for key, entry in _assistant_cache.items()
        if entry.get("expiresAt", 0) <= now
    ]
    for key in stale_keys:
        _assistant_cache.pop(key, None)

    while len(_assistant_cache) > ASSISTANT_CACHE_MAX_ENTRIES:
        _assistant_cache.popitem(last=False)


def _extract_json_object(raw_text: str) -> Dict[str, Any]:
    text = (raw_text or "").strip()
    if not text:
        return {}

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        candidate = text[start : end + 1]
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return {}
    return {}
def _fallback_student_assistant(
    feature: str, prompt: str, context: Dict[str, Any]
) -> Dict[str, Any]:
    clean_context = _compact_context(context)
    role = clean_context.get("targetRole") or "your target role"
    missing = clean_context.get("missingSkills") or []
    top_missing = ", ".join(missing[:3]) if missing else "core role skills"

    if feature == "resume_improvement":
        return {
            "provider": "fallback",
            "model": None,
            "feature": feature,
            "title": "Resume Upgrade Plan",
            "summary": f"Improve your resume for {role} with stronger impact-based bullet points and clearer skill evidence.",
            "actionItems": [
                "Rewrite top 3 project bullets using action + outcome + metric format.",
                "Place role-relevant skills in a focused skills section near the top.",
                "Add one quantified achievement for internship or project work.",
                "Keep resume length to one page with consistent section headings.",
            ],
            "followUpQuestions": [
                "Do you want bullet-point rewrites for one project?",
                "Should I generate ATS keywords for your target role?",
            ],
        }

    if feature == "interview_prep":
        return {
            "provider": "fallback",
            "model": None,
            "feature": feature,
            "title": "Interview Prep Sprint",
            "summary": f"Prepare for {role} interviews with focused technical practice and concise storytelling.",
            "actionItems": [
                "Practice 5 role-specific technical questions and time each answer to 90 seconds.",
                "Prepare 3 STAR-format stories for teamwork, failure, and ownership.",
                "Review one project deeply: architecture, tradeoffs, and performance decisions.",
                "Run one mock interview this week and note weak areas.",
            ],
            "followUpQuestions": [
                "Need 10 likely interview questions for your role?",
                "Want a mock interviewer checklist?",
            ],
        }

    if feature == "project_ideas":
        return {
            "provider": "fallback",
            "model": None,
            "feature": feature,
            "title": "Portfolio Project Ideas",
            "summary": f"Build role-aligned projects that close gaps in {top_missing}.",
            "actionItems": [
                f"Project 1: Build a mini app focused on {missing[0] if missing else 'core backend/frontend'} with deployment.",
                "Project 2: Add analytics, testing, and monitoring to show production readiness.",
                "Project 3: Publish architecture notes and a walkthrough video in your portfolio.",
                "Track measurable outcomes: performance, uptime, or user interactions.",
            ],
            "followUpQuestions": [
                "Should I break one project into weekly milestones?",
                "Need project ideas tailored to your current skill stack?",
            ],
        }

    if feature == "study_plan":
        return {
            "provider": "fallback",
            "model": None,
            "feature": feature,
            "title": "4-Week Learning Plan",
            "summary": f"Structured plan for {role} with focus on {top_missing}.",
            "actionItems": [
                "Week 1: Strengthen one missing core skill and finish 6-8 guided lessons.",
                "Week 2: Build a small feature project using that skill.",
                "Week 3: Add tests, edge-case handling, and deployment.",
                "Week 4: Revise resume + portfolio and do one mock interview.",
            ],
            "followUpQuestions": [
                "Want this converted to a daily checklist?",
                "Need free learning resources mapped to each week?",
            ],
        }

    return {
        "provider": "fallback",
        "model": None,
        "feature": "skill_gap",
        "title": "Skill Gap Action Plan",
        "summary": f"Prioritize the highest-impact missing skills for {role}: {top_missing}.",
        "actionItems": [
            "Pick one missing skill and complete a guided learning module this week.",
            "Implement that skill in a mini project section and document outcomes.",
            "Update resume skills and project bullets after completion.",
            "Measure progress by weekly mock interview or coding challenge.",
        ],
        "followUpQuestions": [
            "Should I rank missing skills by hiring impact?",
            "Want a beginner-to-advanced resource path?",
        ],
    }


def _call_groq_assistant(
    feature: str, prompt: str, context: Dict[str, Any]
) -> Dict[str, Any]:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    model = (
        os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip() or "openai/gpt-oss-120b"
    )
    reasoning_effort = (
        os.getenv("GROQ_REASONING_EFFORT", "high").strip().lower() or "high"
    )
    service_tier = os.getenv("GROQ_SERVICE_TIER", "auto").strip().lower() or "auto"
    if not api_key:
        return _fallback_student_assistant(feature, prompt, context)

    feature_hint = STUDENT_ASSISTANT_PROMPTS.get(
        feature, STUDENT_ASSISTANT_PROMPTS["skill_gap"]
    )
    clean_context = _compact_context(context)
    safe_prompt = prompt.strip()[:1200]
    system_prompt = (
        "You are a direct, practical AI career coach for students. "
        "Use the student context to give high-value advice that is specific, realistic, and immediately useful. "
        "Prefer next actions that improve resume strength, interview readiness, role fit, and portfolio quality. "
        "When resources are present in the context, use them in the action plan instead of generic advice. "
        "Return strict JSON only with keys: title, summary, actionItems, followUpQuestions. "
        "actionItems and followUpQuestions must be arrays of short strings. "
        "No markdown, no extra keys."
    )
    user_payload = {
        "task": feature_hint,
        "feature": feature,
        "studentContext": clean_context,
        "studentPrompt": safe_prompt or "Provide concise actionable guidance.",
    }

    body = {
        "model": model,
        "temperature": 0.2,
        "max_tokens": 900,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=True)},
        ],
    }
    if "llama-3.3" in model or "llama-3.1" in model:
        body["response_format"] = {"type": "json_object"}
    if "gpt-oss" in model:
        body["reasoning_effort"] = reasoning_effort
        body["service_tier"] = service_tier

    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "User-Agent": "Esencelab-AI/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=18) as response:
            payload = json.loads(response.read().decode("utf-8"))
            choices = payload.get("choices") if isinstance(payload, dict) else None
            if not isinstance(choices, list) or not choices:
                return _fallback_student_assistant(feature, prompt, context)
            message = (
                choices[0].get("message") if isinstance(choices[0], dict) else None
            )
            content = message.get("content", "") if isinstance(message, dict) else ""
            parsed = _extract_json_object(content)
            title = str(parsed.get("title") or "").strip() or "AI Career Guidance"
            summary = str(parsed.get("summary") or "").strip()
            action_items = [
                str(item).strip()
                for item in _as_list(parsed.get("actionItems"))
                if str(item).strip()
            ][:8]
            follow_ups = [
                str(item).strip()
                for item in _as_list(parsed.get("followUpQuestions"))
                if str(item).strip()
            ][:5]

            if not summary or not action_items:
                return _fallback_student_assistant(feature, prompt, context)

            return {
                "provider": "groq",
                "model": model,
                "feature": feature,
                "title": title[:120],
                "summary": summary[:900],
                "actionItems": action_items,
                "followUpQuestions": follow_ups
                or ["Do you want a more advanced version of this plan?"],
            }
    except Exception as exc:
        _log_event(
            "warning", "assistant.provider_fallback", error=_serialize_error(exc)
        )
        return _fallback_student_assistant(feature, prompt, context)
