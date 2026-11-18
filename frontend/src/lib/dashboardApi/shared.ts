import { invalidateApiCache } from "@/lib/api";
import { StudentRecommendations } from "@/types";

/**
 * Shared helpers for dashboard API modules: response parsing, session storage,
 * error formatting, and grouped cache invalidation.
 */

export interface RecommendationCachePayload {
  ts: number;
  data: StudentRecommendations;
}

export interface ApiErrorLike {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  } | null;
}

const RECOMMENDATION_CACHE_PREFIX = "esencelab.recommendations.";
const RECOMMENDATION_CACHE_TTL_MS = 5 * 60 * 1000;

export const getRecommendationCacheKey = (userId: string): string =>
  `${RECOMMENDATION_CACHE_PREFIX}${userId}`;

export const getRecommendationCacheTtl = (): number =>
  RECOMMENDATION_CACHE_TTL_MS;

export const safeJsonParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const safeSessionGet = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeSessionSet = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage quota/privacy-mode failures and continue with network data.
  }
};

export const safeSessionRemove = (key: string): void => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
};

export const invalidateJobCaches = (): void => {
  invalidateApiCache("/jobs");
  invalidateApiCache("/recruiter/overview");
  invalidateApiCache("/dashboard/stats");
  invalidateApiCache("/admin/monitoring");
};

export const invalidateResumeCaches = (): void => {
  invalidateApiCache("/resume");
  invalidateApiCache("/recommendations");
  invalidateApiCache("/career/overview");
  invalidateApiCache("/career/roadmap");
  invalidateApiCache("/career/learning-plan");
  invalidateApiCache("/dashboard/stats");
  invalidateApiCache("/admin/resumes");
  invalidateApiCache("/admin/monitoring");
};

export const invalidateAdminResumeCaches = (): void => {
  invalidateApiCache("/admin/resumes");
  invalidateApiCache("/admin/monitoring");
  invalidateApiCache("/admin/logs");
};

export const invalidateCareerCaches = (): void => {
  invalidateApiCache("/career/overview");
  invalidateApiCache("/career/roadmap");
  invalidateApiCache("/career/learning-plan");
};

export const invalidateJobTrackerCaches = (): void => {
  invalidateApiCache("/career/job-tracker");
  invalidateApiCache("/career/overview");
};

export const invalidateTrackedApplicationCaches = (): void => {
  invalidateApiCache("/career/job-tracker");
  invalidateApiCache("/career/overview");
  invalidateApiCache("/applications");
};

export const getReadableErrorMessage = (error: unknown, fallback: string): string => {
  const err = (error || null) as ApiErrorLike | null;
  const status = err?.response?.status;
  const serverMessage = err?.response?.data?.message;

  if (status === 401) return "Your session has expired. Please login again.";
  if (status === 400 && serverMessage) return serverMessage;
  if (status !== undefined && status >= 500)
    return "Server error occurred. Please try again in a moment.";
  return serverMessage || fallback;
};
