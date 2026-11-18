"""Thin FastAPI entry point for the Esencelab AI service."""
from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS, ALLOW_CREDENTIALS
from .middleware import http_exception_handler, request_logging_middleware
from .routes import router

app = FastAPI(title="Esencelab AI Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(request_logging_middleware)
app.add_exception_handler(HTTPException, http_exception_handler)
app.include_router(router)

# Backwards-compatible re-exports used by the service tests.
from .matching import calculate_tfidf_match  # noqa: E402
from .parsing import extract_skills, parse_resume_text  # noqa: E402
from .routes import health, match_jobs  # noqa: E402
from .schemas import MatchRequest  # noqa: E402

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
