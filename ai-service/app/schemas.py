"""Pydantic request/response models for the AI service."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

class ResumeParseResponse(BaseModel):
    parsedData: Dict[str, Any]
    skills: List[str]


class MatchRequest(BaseModel):
    resumeSkills: List[str]
    jobRequirements: str
    jobRequiredSkills: Optional[List[str]] = None
    includeExplanation: bool = False


class MatchResponse(BaseModel):
    matchScore: float
    matchedSkills: List[str]
    missingSkills: List[str]
    explanation: Optional[str] = None


class StudentAssistantRequest(BaseModel):
    feature: str
    prompt: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)


class StudentAssistantResponse(BaseModel):
    provider: str
    model: Optional[str] = None
    feature: str
    title: str
    summary: str
    actionItems: List[str]
    followUpQuestions: List[str]
