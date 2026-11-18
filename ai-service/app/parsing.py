"""Resume text extraction and structured-resume parsing helpers."""
from __future__ import annotations

import importlib
import io
import os
import re
from typing import Any, Dict, List, Optional

try:
    import pdfplumber
except Exception:  # pragma: no cover
    pdfplumber = None

try:
    pypdf = importlib.import_module("pypdf")
except Exception:  # pragma: no cover
    pypdf = None

try:
    import spacy
except Exception:  # pragma: no cover
    spacy = None

NLP_MODEL = None
if spacy and str(os.getenv("AI_ENABLE_SPACY", "true")).strip().lower() != "false":
    try:
        NLP_MODEL = spacy.load("en_core_web_sm")
    except Exception:
        NLP_MODEL = None
SKILL_KEYWORDS = [
    "python",
    "javascript",
    "typescript",
    "java",
    "c++",
    "c#",
    "ruby",
    "go",
    "rust",
    "php",
    "react",
    "angular",
    "vue",
    "node.js",
    "express",
    "django",
    "flask",
    "spring",
    "rails",
    "html",
    "css",
    "sass",
    "tailwind",
    "bootstrap",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "redis",
    "elasticsearch",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "terraform",
    "jenkins",
    "git",
    "machine learning",
    "deep learning",
    "tensorflow",
    "pytorch",
    "keras",
    "scikit-learn",
    "data analysis",
    "data science",
    "data engineering",
    "etl",
    "pandas",
    "numpy",
    "nlp",
    "natural language processing",
    "computer vision",
    "opencv",
    "agile",
    "scrum",
    "jira",
    "confluence",
    "rest api",
    "graphql",
    "microservices",
    "linux",
    "unix",
    "bash",
    "shell scripting",
    "testing",
    "unit testing",
    "integration testing",
    "selenium",
    "jest",
    "ci/cd",
    "devops",
    "firebase",
    "figma",
]

EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE_REGEX = re.compile(
    r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
)
YEAR_REGEX = re.compile(r"\b(?:19|20)\d{2}\b")

EDUCATION_KEYWORDS = [
    "education",
    "academic",
    "qualification",
]

EXPERIENCE_KEYWORDS = [
    "experience",
    "work history",
    "employment",
    "internship",
]
def extract_text_from_pdf_bytes(content: bytes) -> str:
    if not content.startswith(b"%PDF"):
        raise ValueError("Uploaded file is not a valid PDF")

    if pdfplumber is not None:
        try:
            text_chunks: List[str] = []
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    text_chunks.append(page.extract_text() or "")
            extracted = "\n".join(text_chunks).strip()
            if extracted:
                return extracted
        except Exception:
            pass

    if pypdf is not None:
        try:
            text_chunks = []
            reader = pypdf.PdfReader(io.BytesIO(content))
            for page in reader.pages:
                text_chunks.append(page.extract_text() or "")
            extracted = "\n".join(text_chunks).strip()
            if extracted:
                return extracted
        except Exception:
            pass

    raise ValueError("Could not extract text from PDF")
def preprocess_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract_name(lines: List[str], normalized_text: str) -> Optional[str]:
    if NLP_MODEL:
        try:
            doc = NLP_MODEL(normalized_text[:5000])
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    candidate = ent.text.strip()
                    if len(candidate.split()) <= 4:
                        return candidate
        except Exception:
            pass

    for line in lines[:10]:
        clean = line.strip()
        if not clean:
            continue
        if any(
            token in clean.lower()
            for token in ["resume", "curriculum", "vitae", "email", "phone"]
        ):
            continue
        if len(clean.split()) <= 4 and len(clean) <= 40:
            return clean

    return None


def _skill_display_name(skill: str) -> str:
    special = {
        "c++": "C++",
        "c#": "C#",
        "node.js": "Node.js",
        "ci/cd": "CI/CD",
        "aws": "AWS",
        "gcp": "GCP",
        "html": "HTML",
        "css": "CSS",
        "sql": "SQL",
        "nlp": "NLP",
        "etl": "ETL",
    }
    normalized = skill.strip().lower()
    return special.get(normalized, skill.title() if len(skill) > 3 else skill.upper())


def _skill_pattern(skill: str) -> re.Pattern[str]:
    escaped = re.escape(skill.lower())
    return re.compile(rf"(?<![a-z0-9+#.]){escaped}(?![a-z0-9+#.])", re.IGNORECASE)


def extract_skills(text: str) -> List[str]:
    text_lower = text.lower()
    found_skills: List[str] = []

    for skill in sorted(SKILL_KEYWORDS, key=len, reverse=True):
        if _skill_pattern(skill).search(text_lower):
            formatted = _skill_display_name(skill)
            if formatted not in found_skills:
                found_skills.append(formatted)

    return found_skills
def split_sections(lines: List[str]) -> Dict[str, List[str]]:
    sections: Dict[str, List[str]] = {
        "education": [],
        "experience": [],
        "summary": [],
    }
    current_section: Optional[str] = None

    for line in lines:
        lower = line.lower()
        if any(keyword in lower for keyword in EDUCATION_KEYWORDS):
            current_section = "education"
            continue
        if any(keyword in lower for keyword in EXPERIENCE_KEYWORDS):
            current_section = "experience"
            continue
        if any(keyword in lower for keyword in ["summary", "objective", "profile"]):
            current_section = "summary"
            continue

        if current_section and line.strip():
            sections[current_section].append(line.strip())

    return sections


def parse_education_entries(lines: List[str]) -> List[Dict[str, str]]:
    entries: List[Dict[str, str]] = []
    for line in lines[:8]:
        year_match = YEAR_REGEX.search(line)
        year = year_match.group(0) if year_match else ""
        cleaned = line.replace(year, "").strip(" ,-") if year else line.strip()
        if not cleaned:
            continue
        entries.append(
            {
                "institution": cleaned,
                "degree": "",
                "field": "",
                "year": year,
            }
        )
    return entries


def parse_experience_entries(lines: List[str]) -> List[Dict[str, str]]:
    entries: List[Dict[str, str]] = []
    for line in lines[:10]:
        year_matches = YEAR_REGEX.findall(line)
        duration = ""
        if len(year_matches) >= 2:
            duration = f"{year_matches[0]} - {year_matches[-1]}"
        elif len(year_matches) == 1:
            duration = year_matches[0]
        clean_line = line.strip()
        if not clean_line:
            continue
        entries.append(
            {
                "company": clean_line,
                "title": "",
                "duration": duration,
                "description": clean_line,
            }
        )
    return entries
def extract_orgs_and_dates(text: str) -> Dict[str, List[str]]:
    organizations: List[str] = []
    dates: List[str] = []

    if NLP_MODEL:
        try:
            doc = NLP_MODEL(text[:15000])
            for ent in doc.ents:
                if ent.label_ == "ORG" and ent.text not in organizations:
                    organizations.append(ent.text.strip())
                if ent.label_ in {"DATE", "TIME"} and ent.text not in dates:
                    dates.append(ent.text.strip())
        except Exception:
            pass

    if not dates:
        for match in YEAR_REGEX.findall(text):
            year = str(match)
            if year not in dates:
                dates.append(year)

    return {"organizations": organizations[:20], "dates": dates[:30]}


def parse_resume_text(text: str) -> Dict[str, Any]:
    """
    Convert free-form resume text into the structured fields used elsewhere.

    The parser is intentionally simple and predictable. It combines regex,
    section splitting, lightweight entity extraction, and skill lookup so the
    backend can still work in local or low-dependency environments.
    """
    normalized_text = preprocess_text(text)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    sections = split_sections(lines)

    emails = EMAIL_REGEX.findall(text)
    phones = PHONE_REGEX.findall(text)
    skills = extract_skills(normalized_text)
    entities = extract_orgs_and_dates(text)

    summary = " ".join(sections["summary"][:3]).strip() if sections["summary"] else None

    if not summary:
        for line in lines:
            lower = line.lower()
            if (
                any(keyword in lower for keyword in ["summary", "objective", "profile"])
                and len(line) > 20
            ):
                summary = line
                break

    parsed = {
        "name": extract_name(lines, normalized_text),
        "email": emails[0] if emails else None,
        "phone": phones[0] if phones else None,
        "summary": summary,
        "education": parse_education_entries(sections["education"]),
        "experience": parse_experience_entries(sections["experience"]),
        "skills": skills,
        "organizations": entities["organizations"],
        "dates": entities["dates"],
    }

    return parsed


def empty_parsed_resume() -> Dict[str, Any]:
    return {
        "name": None,
        "email": None,
        "phone": None,
        "summary": None,
        "education": [],
        "experience": [],
        "skills": [],
        "organizations": [],
        "dates": [],
    }


def normalize_skill_list(skills: List[str]) -> List[str]:
    deduped: Dict[str, str] = {}
    for skill in skills:
        cleaned = str(skill or "").strip()
        if not cleaned:
            continue
        key = cleaned.lower()
        if key not in deduped:
            deduped[key] = cleaned
    return list(deduped.values())
