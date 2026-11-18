"""HTTP request logging, internal auth and exception handling middleware."""
from __future__ import annotations

import time
from typing import Awaitable, Callable
from uuid import uuid4

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse, Response

from .config import AI_INTERNAL_AUTH_TOKEN, _log_event, _serialize_error

async def request_logging_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Authenticate internal calls and log every request."""
    request_id = request.headers.get("x-request-id", "").strip() or uuid4().hex
    request.state.request_id = request_id

    if (
        AI_INTERNAL_AUTH_TOKEN
        and request.url.path.startswith("/ai/")
        and request.url.path != "/ai/health"
    ):
        provided_token = request.headers.get("x-internal-service-token", "").strip()
        if provided_token != AI_INTERNAL_AUTH_TOKEN:
            _log_event(
                "warning",
                "auth.internal_token_rejected",
                requestId=request_id,
                method=request.method,
                path=request.url.path,
            )
            return JSONResponse(
                status_code=401,
                content={
                    "error": "not_authenticated",
                    "message": "Not authenticated",
                    "code": "NOT_AUTHENTICATED",
                    "requestId": request_id,
                },
            )

    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        duration_ms = round((time.perf_counter() - started) * 1000)
        _log_event(
            "error",
            "http.request.failed",
            requestId=request_id,
            method=request.method,
            path=request.url.path,
            latencyMs=duration_ms,
            error=_serialize_error(exc),
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_server_error",
                "message": "Internal server error",
                "code": "INTERNAL_SERVER_ERROR",
                "requestId": request_id,
            },
        )

    duration_ms = round((time.perf_counter() - started) * 1000)
    level = "info"
    if response.status_code >= 500:
        level = "error"
    elif response.status_code >= 400 or duration_ms >= 1200:
        level = "warning"
    _log_event(
        level,
        "http.request.completed",
        requestId=request_id,
        method=request.method,
        path=request.url.path,
        statusCode=response.status_code,
        latencyMs=duration_ms,
    )
    response.headers["X-Request-Id"] = request_id
    return response


async def http_exception_handler(
    request: Request, exc: HTTPException
) -> JSONResponse:
    """Render HTTP errors with the service error envelope."""
    message = str(exc.detail or "Request failed")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "request_failed"
            if exc.status_code < 500
            else "internal_server_error",
            "message": message if exc.status_code < 500 else "Internal server error",
            "code": "REQUEST_FAILED"
            if exc.status_code < 500
            else "INTERNAL_SERVER_ERROR",
            "requestId": getattr(request.state, "request_id", None),
        },
    )
