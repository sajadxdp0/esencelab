/**
 * Environment-backed configuration and startup validation.
 *
 * Importing this module loads `.env` and validates production settings before
 * the Express application is wired together.
 */
import dotenv from "dotenv";

dotenv.config();

export const toBooleanEnv = (name: string, defaultValue = false) => {
  const rawValue = process.env[name];
  if (
    rawValue === undefined ||
    rawValue === null ||
    String(rawValue).trim() === ""
  ) {
    return defaultValue;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
};
export const ALLOW_INSECURE_PASSWORD_RESET_TOKEN_RESPONSE = toBooleanEnv(
  "ALLOW_INSECURE_PASSWORD_RESET_TOKEN_RESPONSE",
);
export const DATA_PROVIDER = String(process.env.DATA_PROVIDER || "supabase")
  .trim()
  .toLowerCase();
export const parseEnvList = (rawValue: string) =>
  rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const looksLikePlaceholderValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.startsWith("change-this") ||
    normalized.startsWith("your-") ||
    normalized === "xxx"
  );
};
export const assertProductionSafety = () => {
  if (!IS_PRODUCTION) return;

  if (ALLOW_INSECURE_PASSWORD_RESET_TOKEN_RESPONSE) {
    throw new Error(
      "ALLOW_INSECURE_PASSWORD_RESET_TOKEN_RESPONSE must remain disabled in production.",
    );
  }
  if (JWT_SECRET.length < 32 || looksLikePlaceholderValue(JWT_SECRET)) {
    throw new Error(
      "Production requires a strong non-placeholder JWT_SECRET with at least 32 characters.",
    );
  }
  if (
    !AI_INTERNAL_AUTH_TOKEN ||
    AI_INTERNAL_AUTH_TOKEN.length < 24 ||
    looksLikePlaceholderValue(AI_INTERNAL_AUTH_TOKEN)
  ) {
    throw new Error(
      "Production requires AI_INTERNAL_AUTH_TOKEN with at least 24 non-placeholder characters.",
    );
  }

  const configuredFrontendOrigins = parseEnvList(
    process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "",
  );
  if (configuredFrontendOrigins.length === 0) {
    throw new Error(
      "Production requires FRONTEND_URLS or FRONTEND_URL to be configured.",
    );
  }
  if (configuredFrontendOrigins.includes("*")) {
    throw new Error(
      "Production does not allow wildcard FRONTEND_URLS origins.",
    );
  }
  for (const origin of configuredFrontendOrigins) {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error(`FRONTEND_URLS contains an invalid origin: ${origin}`);
    }
    const isLocalOrigin = ["localhost", "127.0.0.1"].includes(
      parsedOrigin.hostname,
    );
    if (!isLocalOrigin && parsedOrigin.protocol !== "https:") {
      throw new Error(`Production frontend origins must use https: ${origin}`);
    }
  }

  const bootstrapPrefixes = ["INITIAL_ADMIN", "INITIAL_RECRUITER"];
  for (const prefix of bootstrapPrefixes) {
    const email = String(process.env[`${prefix}_EMAIL`] || "")
      .trim()
      .toLowerCase();
    const password = String(process.env[`${prefix}_PASSWORD`] || "").trim();

    if (!email && !password) continue;

    if (!email || !password) {
      throw new Error(
        `${prefix}_EMAIL and ${prefix}_PASSWORD must both be set when bootstrapping users in production.`,
      );
    }
    if (password.length < 12) {
      throw new Error(`${prefix}_PASSWORD must be at least 12 characters.`);
    }
  }
};

if (DATA_PROVIDER !== "supabase") {
  throw new Error("DATA_PROVIDER must be set to supabase.");
}

assertProductionSafety();
export const buildAiServiceHeaders = (headers: Record<string, string> = {}) => {
  if (!AI_INTERNAL_AUTH_TOKEN) {
    return headers;
  }
  return {
    ...headers,
    "x-internal-service-token": AI_INTERNAL_AUTH_TOKEN,
  };
};


export const PORT = process.env.PORT || 3001;
export const NODE_ENV = String(process.env.NODE_ENV || "development")
  .trim()
  .toLowerCase();
export const IS_PRODUCTION = NODE_ENV === "production";
export const JWT_SECRET = String(process.env.JWT_SECRET || "").trim();
export const AI_SERVICE_URL =
  String(process.env.AI_SERVICE_URL || "http://localhost:3002").trim() ||
  "http://localhost:3002";
export const AI_INTERNAL_AUTH_TOKEN = String(
  process.env.AI_INTERNAL_AUTH_TOKEN || "",
).trim();

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required.");
}

export const SERVER_STARTED_AT = Date.now();
export const SLOW_ENDPOINT_THRESHOLD_MS = Number(
  process.env.SLOW_ENDPOINT_THRESHOLD_MS || 1200,
);
export const GENERAL_RATE_LIMIT_WINDOW_MS = Math.max(
  60_000,
  Number(process.env.GENERAL_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
);
export const GENERAL_RATE_LIMIT_MAX_REQUESTS = Math.max(
  100,
  Number(process.env.GENERAL_RATE_LIMIT_MAX_REQUESTS || 400),
);
export const MAX_RESUME_FILE_SIZE_MB = Math.max(
  1,
  Math.min(4.4, Number(process.env.MAX_RESUME_FILE_SIZE_MB || 4)),
);
export const MAX_RESUME_FILE_SIZE_BYTES = Math.floor(
  MAX_RESUME_FILE_SIZE_MB * 1024 * 1024,
);
export const METRIC_SAMPLE_LIMIT = Math.max(
  50,
  Number(process.env.METRIC_SAMPLE_LIMIT || 240),
);
export const AI_REQUEST_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.AI_REQUEST_TIMEOUT_MS || 12000),
);
export const AI_MATCH_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.AI_MATCH_TIMEOUT_MS || 8000),
);
export const CANDIDATE_MATCH_CONCURRENCY = Math.max(
  1,
  Math.min(12, Number(process.env.CANDIDATE_MATCH_CONCURRENCY || 4)),
);
export const CANDIDATE_MATCH_CACHE_MAX_ENTRIES = Math.max(
  20,
  Math.min(500, Number(process.env.CANDIDATE_MATCH_CACHE_MAX_ENTRIES || 120)),
);
export const AI_HEALTH_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.AI_HEALTH_TIMEOUT_MS || 3500),
);
export const SHUTDOWN_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000),
);
export const AUTH_RATE_LIMIT_MAX_REQUESTS = (() => {
  const parsed = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 15);
  return Math.max(5, Number.isFinite(parsed) ? parsed : 15);
})();
export const RECRUITER_REQUEST_RATE_LIMIT_PER_HOUR = (() => {
  const parsed = Number(process.env.RECRUITER_REQUEST_RATE_LIMIT_PER_HOUR || 8);
  return Math.max(4, Number.isFinite(parsed) ? parsed : 8);
})();
export const EXPENSIVE_OPERATION_RATE_LIMIT_PER_MINUTE = Math.max(
  10,
  Number(process.env.EXPENSIVE_OPERATION_RATE_LIMIT_PER_MINUTE || 45),
);
export const FRONTEND_ORIGINS = (() => {
  const rawOrigins =
    process.env.FRONTEND_URLS ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000";
  return parseEnvList(rawOrigins);
})();
export const ALLOW_ALL_FRONTEND_ORIGINS = FRONTEND_ORIGINS.includes("*");
export const TRUST_PROXY_RAW = String(process.env.TRUST_PROXY || "")
  .trim()
  .toLowerCase();

export const PLATFORM_HEALTH_CACHE_TTL_MS = 8000;
export const CANDIDATE_MATCH_CACHE_TTL_MS = 60 * 1000;
export const STUDENT_RECOMMENDATIONS_CACHE_TTL_MS = 20 * 1000;
export const RECRUITER_OVERVIEW_CACHE_TTL_MS = 10 * 1000;

export const toAlertThreshold = (
  envName: string,
  defaultValue: number,
  minimumValue: number,
) => {
  const parsed = Number(process.env[envName] || defaultValue);
  return Math.max(
    minimumValue,
    Number.isFinite(parsed) ? parsed : defaultValue,
  );
};
export const ALERT_API_ERROR_RATE_PERCENT = toAlertThreshold(
  "ALERT_API_ERROR_RATE_PERCENT", 5, 1,
);
export const ALERT_AUTH_FAILURES = toAlertThreshold("ALERT_AUTH_FAILURES", 25, 5);
export const ALERT_SLOW_REQUESTS = toAlertThreshold("ALERT_SLOW_REQUESTS", 25, 5);
export const ALERT_P95_LATENCY_MS = toAlertThreshold(
  "ALERT_P95_LATENCY_MS", 2500, 500,
);
