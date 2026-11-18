/**
 * Shared mutable runtime state.
 *
 * The in-memory store, Supabase adapter, token registries and response caches
 * are module singletons so every route observes the same data. Tests replace
 * entries on `db` directly, so collections are always read fresh.
 */
import { SupabaseStore } from "./supabaseStore";

export const createEmptyDb = () => ({
  profiles: [] as any[],
  jobs: [] as any[],
  candidates: [] as any[],
  applications: [] as any[],
  courses: [] as any[],
  resumes: [] as any[],
  recommendations: [] as any[],
  resumeScores: [] as any[],
  skillProgress: [] as any[],
  learningPlans: [] as any[],
  mockInterviewSessions: [] as any[],
  savedJobs: [] as any[],
  careerPreferences: [] as any[],
  recruiterAccessRequests: [] as any[],
  adminLogs: [] as any[],
  requestMetrics: {
    totalRequests: 0,
    totalErrors: 0,
    authFailures: 0,
    slowRequests: 0,
    endpoints: {} as Record<string, any>,
  },
});


export const db: any = createEmptyDb();
export const supabaseStore = new SupabaseStore();

export const resetTokens = new Map<string, { userId: string; expiresAt: number }>();
export const revokedTokens = new Set<string>();

export interface CachedResponse<T> {
  expiresAt: number;
  data: T;
}

export interface CandidateMatchCacheEntry {
  expiresAt: number;
  data: any[];
  meta: {
    totalCandidates: number;
    candidatesWithResume: number;
    candidatesWithoutResume: number;
    generatedAt: string;
    source: "computed" | "cache";
  };
}

export const candidateMatchCache = new Map<string, CandidateMatchCacheEntry>();
export const studentRecommendationCache = new Map<string, CachedResponse<any>>();
export const recruiterOverviewCache = new Map<string, CachedResponse<any>>();
