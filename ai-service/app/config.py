"""Environment configuration, logging and startup validation for the AI service."""
from __future__ import annotations

import json
import logging
import os
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict

from dotenv import load_dotenv

load_dotenv()

def _int_env(name: str, default: int, minimum: int, maximum: int) -> int:
    raw = str(os.getenv(name, str(default))).strip()
    try:
        parsed = int(raw)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))
NODE_ENV = str(os.getenv("NODE_ENV", "development")).strip().lower()
IS_PRODUCTION = NODE_ENV == "production"
AI_INTERNAL_AUTH_TOKEN = str(os.getenv("AI_INTERNAL_AUTH_TOKEN", "")).strip()
MAX_RESUME_FILE_SIZE_MB = _int_env("AI_MAX_UPLOAD_MB", 4, 1, 8)
MAX_RESUME_FILE_SIZE_BYTES = MAX_RESUME_FILE_SIZE_MB * 1024 * 1024
LOG_LEVEL = str(os.getenv("LOG_LEVEL", "INFO")).strip().upper() or "INFO"

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO), format="%(message)s"
)
logger = logging.getLogger("esencelab.ai")
def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _log_event(level: str, event: str, **payload: Any) -> None:
    entry = {
        "ts": _timestamp(),
        "level": level.lower(),
        "event": event,
        **payload,
    }
    getattr(logger, level.lower(), logger.info)(json.dumps(entry, ensure_ascii=True))


def _serialize_error(error: Exception) -> Dict[str, Any]:
    return {
        "type": error.__class__.__name__,
        "message": str(error),
    }


def _parse_allowed_origins() -> List[str]:
    raw = os.getenv("AI_ALLOWED_ORIGINS", "").strip()
    if not raw:
        return ["*"] if not IS_PRODUCTION else []
    if raw == "*":
        return ["*"]
    return [entry.strip() for entry in raw.split(",") if entry.strip()]


ALLOWED_ORIGINS = _parse_allowed_origins()
ALLOW_CREDENTIALS = ALLOWED_ORIGINS != ["*"]
def _looks_like_placeholder_value(value: str) -> bool:
    normalized = value.strip().lower()
    if not normalized:
        return True
    return (
        normalized.startswith("change-this")
        or normalized.startswith("your-")
        or "example" in normalized
        or normalized == "xxx"
    )


def _assert_production_safety() -> None:
    if not IS_PRODUCTION:
        return
    if not ALLOWED_ORIGINS or ALLOWED_ORIGINS == ["*"]:
        raise RuntimeError("Production requires explicit AI_ALLOWED_ORIGINS values.")
    if (
        not AI_INTERNAL_AUTH_TOKEN
        or len(AI_INTERNAL_AUTH_TOKEN) < 24
        or _looks_like_placeholder_value(AI_INTERNAL_AUTH_TOKEN)
    ):
        raise RuntimeError(
            "Production requires AI_INTERNAL_AUTH_TOKEN with at least 24 non-placeholder characters."
        )
    for origin in ALLOWED_ORIGINS:
        parsed = urllib.parse.urlparse(origin)
        if not parsed.scheme or not parsed.netloc:
            raise RuntimeError(f"Invalid AI_ALLOWED_ORIGINS origin: {origin}")
        is_local = parsed.hostname in {"localhost", "127.0.0.1"}
        if not is_local and parsed.scheme != "https":
            raise RuntimeError(
                f"Production AI_ALLOWED_ORIGINS must use https: {origin}"
            )


_assert_production_safety()
