import type { SupabaseClient } from "@supabase/supabase-js";

export type AnyRecord = Record<string, any>;
export type QueryResult<T = any> = { data: T | null; error: any };

export const RETRYABLE_STATUS_CODES = new Set([
  408, 409, 425, 429, 500, 502, 503, 504,
]);
export const RETRYABLE_ERROR_CODES = new Set([
  "aborted",
  "eai_again",
  "econnaborted",
  "econnrefused",
  "econnreset",
  "enetdown",
  "enetreset",
  "enetwork",
  "enotfound",
  "etimedout",
]);
export const RETRYABLE_MESSAGE_FRAGMENTS = [
  "connection terminated unexpectedly",
  "dns lookup timed out",
  "fetch failed",
  "network request failed",
  "network timeout",
  "socket hang up",
  "timed out",
  "timeout",
  "too many requests",
  "try again later",
];
export const TRANSIENT_RETRY_DELAYS_MS = [150, 450, 900];
export const SUPABASE_BOOTSTRAP_PAGE_SIZE = Math.max(
  100,
  Math.min(1000, Number(process.env.SUPABASE_BOOTSTRAP_PAGE_SIZE || 1000)),
);

export const toArray = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const toDate = (value: any): Date => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export const toIso = (value: any): string => {
  const date = toDate(value);
  return date.toISOString();
};

export const toNumberOrNull = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toNumberOrZero = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toJsonArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
};

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const stringifyError = (error: any): string => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;

  const message = error.message || error.details || error.hint || String(error);
  const code =
    error.code || error.status || error.statusCode || error.cause?.code;
  return code ? `${message} (code: ${code})` : String(message);
};

export const getErrorStatus = (error: any): number | null => {
  const raw = error?.status ?? error?.statusCode ?? error?.code;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getErrorCode = (error: any): string => {
  return String(error?.code || error?.cause?.code || "")
    .trim()
    .toLowerCase();
};

export const isRetryableError = (error: any): boolean => {
  const status = getErrorStatus(error);
  if (status !== null && RETRYABLE_STATUS_CODES.has(status)) {
    return true;
  }

  const code = getErrorCode(error);
  if (code && RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }

  const message = stringifyError(error).toLowerCase();
  return RETRYABLE_MESSAGE_FRAGMENTS.some((fragment) =>
    message.includes(fragment),
  );
};
