/** Structured logging and error-response normalization helpers. */
import type { Request } from "express";
import { SLOW_ENDPOINT_THRESHOLD_MS } from "./config";
import type { LogLevel } from "./types";

export const toSerializableError = (error: any) => ({
  message: String(error?.message || error || "Unknown error"),
  name: String(error?.name || "Error"),
  stack: typeof error?.stack === "string" ? error.stack : undefined,
  code: error?.code ? String(error.code) : undefined,
});
export const logEvent = (
  level: LogLevel,
  event: string,
  payload: Record<string, any> = {},
) => {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...payload,
  });
  if (level === "error") {
    console.error(entry);
  } else if (level === "warn") {
    console.warn(entry);
  } else {
    console.log(entry);
  }
};

export const logError = (
  event: string,
  error: any,
  payload: Record<string, any> = {},
) => {
  logEvent("error", event, {
    ...payload,
    error: toSerializableError(error),
  });
};
export const toRequestPath = (req: Request) =>
  (req.originalUrl || req.url || "/").split("?")[0] || "/";
export const getResponseLogLevel = (
  statusCode: number,
  durationMs: number,
): LogLevel => {
  if (statusCode >= 500) return "error";
  if (statusCode >= 400 || durationMs >= SLOW_ENDPOINT_THRESHOLD_MS)
    return "warn";
  return "info";
};

export const toErrorName = (statusCode: number) => {
  switch (statusCode) {
    case 400:
      return "bad_request";
    case 401:
      return "not_authenticated";
    case 403:
      return "not_authorized";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 413:
      return "payload_too_large";
    case 429:
      return "rate_limited";
    default:
      return statusCode >= 500 ? "internal_server_error" : "request_failed";
  }
};

export const toErrorCode = (statusCode: number) => {
  switch (statusCode) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "NOT_AUTHENTICATED";
    case 403:
      return "NOT_AUTHORIZED";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 429:
      return "RATE_LIMITED";
    default:
      return statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED";
  }
};
export const normalizeErrorResponseBody = (
  statusCode: number,
  body: any,
  requestId?: string,
) => {
  if (statusCode < 400) {
    return body;
  }

  const safeMessage = statusCode >= 500 ? "Internal server error" : undefined;

  if (body && typeof body === "object" && !Array.isArray(body)) {
    if (typeof body.error === "string" && typeof body.message === "string") {
      return {
        ...body,
        code: body.code || toErrorCode(statusCode),
        requestId: body.requestId || requestId,
      };
    }

    if (typeof body.message === "string") {
      return {
        ...body,
        error: body.error || toErrorName(statusCode),
        message: safeMessage || body.message,
        code: body.code || toErrorCode(statusCode),
        requestId: body.requestId || requestId,
      };
    }
  }

  if (typeof body === "string") {
    return {
      error: toErrorName(statusCode),
      message: safeMessage || body,
      code: toErrorCode(statusCode),
      requestId,
    };
  }

  return {
    error: toErrorName(statusCode),
    message: safeMessage || "Request failed",
    code: toErrorCode(statusCode),
    requestId,
  };
};
