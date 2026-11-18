"""Resume-to-job matching and explanation helpers."""
from __future__ import annotations

from typing import List

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except Exception:  # pragma: no cover
    TfidfVectorizer = None
    cosine_similarity = None

from .parsing import extract_skills

def calculate_tfidf_match(
    resume_skills: List[str],
    required_skills: List[str],
    job_requirements: str = "",
) -> float:
    """
    Compute a similarity score between resume skills and job requirements.

    When scikit-learn is available, we use TF-IDF plus cosine similarity.
    Otherwise we fall back to a deterministic skill-overlap ratio so matching
    still works in reduced environments.
    """
    if not resume_skills or (not required_skills and not job_requirements.strip()):
        return 0.0

    resume_text = " ".join(resume_skills)
    required_text = " ".join(required_skills).strip() or job_requirements.strip()
    corpus = [resume_text, required_text]

    if TfidfVectorizer is None or cosine_similarity is None:
        resume_set = {skill.lower() for skill in resume_skills}
        required_set = {skill.lower() for skill in required_skills} or {
            skill.lower() for skill in extract_skills(job_requirements)
        }
        if not required_set:
            return 0.0
        return len(resume_set & required_set) / len(required_set)

    resume_set = {skill.lower() for skill in resume_skills}
    required_set = {skill.lower() for skill in required_skills} or {
        skill.lower() for skill in extract_skills(job_requirements)
    }
    if not required_set:
        return 0.0

    try:
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2), token_pattern=r"(?u)\b\w[\w+#.\-/]*\b"
        )
        tfidf_matrix = vectorizer.fit_transform(corpus)
        score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        return max(0.0, min(score, 1.0))
    except ValueError:
        return len(resume_set & required_set) / len(required_set)


def generate_explanation(
    match_score: float, matched: List[str], missing: List[str]
) -> str:
    if match_score >= 0.75:
        verdict = "strong match"
    elif match_score >= 0.5:
        verdict = "moderate match"
    else:
        verdict = "low match"

    missing_hint = ", ".join(missing[:5]) if missing else "no major gaps"
    return f"Candidate is a {verdict}. Matched skills: {', '.join(matched[:6]) or 'none'}. Missing focus areas: {missing_hint}."
