import api, { cachedGet, invalidateApiCache } from "@/lib/api";
import {
  getRecommendationCacheKey,
  getRecommendationCacheTtl,
  RecommendationCachePayload,
  invalidateCareerCaches,
  invalidateJobTrackerCaches,
  invalidateTrackedApplicationCaches,
  safeJsonParse,
  safeSessionGet,
  safeSessionRemove,
  safeSessionSet,
} from "@/lib/dashboardApi/shared";
import { CareerOverview, CareerRole, JobTrackerData, LearningPlan, MockInterviewPack, RoadmapItem, StudentAICoachResponse, StudentRecommendations } from "@/types";

export const getStudentRecommendations = async (
  userId: string,
  forceRefresh = false,
): Promise<StudentRecommendations | null> => {
  const cacheKey = getRecommendationCacheKey(userId);
  const canUseCache = !forceRefresh && typeof window !== "undefined";

  if (canUseCache) {
    const cached = safeJsonParse<RecommendationCachePayload>(
      safeSessionGet(cacheKey),
    );
    if (cached && Date.now() - cached.ts < getRecommendationCacheTtl()) {
      return cached.data;
    }
  }

  const res = await api.get("/recommendations");
  const data = (res.data.data || null) as StudentRecommendations | null;

  if (data && typeof window !== "undefined") {
    const payload: RecommendationCachePayload = { ts: Date.now(), data };
    safeSessionSet(cacheKey, JSON.stringify(payload));
  }

  return data;
};

export const clearRecommendationCache = (userId: string) => {
  safeSessionRemove(getRecommendationCacheKey(userId));
};

export const getCareerRoles = async (): Promise<CareerRole[]> => {
  const payload = await cachedGet<{ data?: CareerRole[] }>("/career/roles", {
    ttlMs: 15 * 60 * 1000,
  });
  return payload.data || [];
};

export const askStudentAICoach = async (payload: {
  feature:
    | "skill_gap"
    | "resume_improvement"
    | "interview_prep"
    | "project_ideas"
    | "study_plan";
  prompt?: string;
}): Promise<StudentAICoachResponse> => {
  const res = await api.post("/career/ai-coach", payload);
  return res.data.data;
};

export const setTargetRole = async (roleId: string) => {
  const res = await api.post("/career/target-role", { roleId });
  invalidateCareerCaches();
  invalidateApiCache("/recommendations");
  return res.data.data;
};

export const getCareerOverview = async (): Promise<CareerOverview> => {
  const payload = await cachedGet<{ data: CareerOverview }>(
    "/career/overview",
    { ttlMs: 7000 },
  );
  return payload.data;
};

export const getCareerRoadmap = async (
  roleId?: string,
): Promise<{ role: CareerRole; roadmap: RoadmapItem[] }> => {
  const query = roleId ? `?roleId=${encodeURIComponent(roleId)}` : "";
  const payload = await cachedGet<{
    data: { role: CareerRole; roadmap: RoadmapItem[] };
  }>(`/career/roadmap${query}`, {
    ttlMs: 7000,
  });
  return payload.data;
};

export const updateRoadmapSkill = async (payload: {
  roleId: string;
  skillName: string;
  status: "completed" | "in_progress" | "missing";
}) => {
  const res = await api.put("/career/roadmap/skill", payload);
  invalidateCareerCaches();
  return res.data.data;
};

export const getLearningPlan = async (
  roleId?: string,
  durationDays: 30 | 60 = 30,
): Promise<LearningPlan> => {
  const params = new URLSearchParams();
  params.append("durationDays", String(durationDays));
  if (roleId) params.append("roleId", roleId);
  const payload = await cachedGet<{ data: LearningPlan }>(
    `/career/learning-plan?${params.toString()}`,
    {
      ttlMs: 20_000,
    },
  );
  return payload.data;
};

export const regenerateLearningPlan = async (
  roleId?: string,
  durationDays: 30 | 60 = 30,
): Promise<LearningPlan> => {
  const res = await api.post("/career/learning-plan", {
    roleId,
    durationDays,
  });
  invalidateApiCache("/career/learning-plan");
  invalidateApiCache("/career/overview");
  return res.data.data;
};

export const getMockInterview = async (
  roleId?: string,
): Promise<MockInterviewPack> => {
  const query = roleId ? `?roleId=${encodeURIComponent(roleId)}` : "";
  const payload = await cachedGet<{ data: MockInterviewPack }>(
    `/career/mock-interview${query}`,
    {
      ttlMs: 20_000,
    },
  );
  return payload.data;
};

export const saveInterviewSession = async (payload: {
  roleId: string;
  question: string;
  answer: string;
  rating?: number;
}) => {
  const res = await api.post("/career/mock-interview/session", payload);
  invalidateApiCache("/career/mock-interview/sessions");
  invalidateApiCache("/career/overview");
  return res.data.data;
};

export interface MockInterviewSession {
  id: string;
  roleId: string;
  roleName?: string;
  question: string;
  answer: string;
  rating: number;
  createdAt: string;
}

export const getMockInterviewSessions = async (): Promise<MockInterviewSession[]> => {
  const payload = await cachedGet<{ data?: MockInterviewSession[] }>(
    "/career/mock-interview/sessions",
    { ttlMs: 7000 },
  );
  return payload.data || [];
};

export const getJobTracker = async (): Promise<JobTrackerData> => {
  const payload = await cachedGet<{ data?: JobTrackerData }>(
    "/career/job-tracker",
    { ttlMs: 5000 },
  );
  return (
    payload.data || {
      savedJobs: [],
      applications: [],
      statusCounts: {
        saved: 0,
        applied: 0,
        interviewing: 0,
        offer: 0,
        rejected: 0,
      },
    }
  );
};

export const saveJobForLater = async (jobId: string) => {
  const res = await api.post("/career/job-tracker/save", { jobId });
  invalidateJobTrackerCaches();
  return res.data.data;
};

export const removeSavedJob = async (jobId: string) => {
  await api.delete(`/career/job-tracker/save/${jobId}`);
  invalidateJobTrackerCaches();
};

export const updateTrackedApplication = async (
  applicationId: string,
  payload: {
    notes?: string;
    status?:
      | "pending"
      | "shortlisted"
      | "interview"
      | "rejected"
      | "applied"
      | "interviewing"
      | "offer";
  },
) => {
  const res = await api.put(
    `/career/job-tracker/application/${applicationId}`,
    payload,
  );
  invalidateTrackedApplicationCaches();
  return res.data.data;
};

export const deleteTrackedApplication = async (applicationId: string) => {
  await api.delete(`/career/job-tracker/application/${applicationId}`);
  invalidateTrackedApplicationCaches();
};
