import api, { cachedGet } from "@/lib/api";
import { invalidateAdminResumeCaches } from "@/lib/dashboardApi/shared";
import { AdminMonitoringData, AdminResumeRecord, PaginationMeta, User } from "@/types";

export const getAdminMonitoring = async (): Promise<AdminMonitoringData> => {
  const payload = await cachedGet<{ data?: AdminMonitoringData }>(
    "/admin/monitoring",
    { ttlMs: 12000 },
  );
  return (
    payload.data || {
      totalUsers: 0,
      totalStudents: 0,
      totalRecruiters: 0,
      totalAdmins: 0,
      totalResumes: 0,
      totalJobs: 0,
      recruiterAccessRequests: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      },
      activeJobs: 0,
      closedJobs: 0,
      totalApplications: 0,
      averageResumeScore: 0,
      averageMatchPercentage: 0,
      resumeMonitoring: {
        successfulParses: 0,
        failedParses: 0,
        flaggedResumes: 0,
      },
      applicationSummary: {
        totalApplications: 0,
        averageMatchPercentage: 0,
        byStatus: { pending: 0, shortlisted: 0, interview: 0, rejected: 0 },
        applicationsPerJob: [],
        applicationsPerStudent: [],
        trendLastDays: [],
      },
      mostAppliedJob: null,
      recentAdminActions: [],
      platformHealth: {
        uptimeSeconds: 0,
        totalRequests: 0,
        totalErrors: 0,
        apiErrorRate: 0,
        authFailures: 0,
        slowRequests: 0,
        slowThresholdMs: 1200,
        avgResponseMs: 0,
        aiService: { status: "unknown", statusCode: null, latencyMs: null },
        alerts: [],
        slowEndpoints: [],
      },
    }
  );
};

export const getAdminUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  sortBy?:
    | "createdAt"
    | "name"
    | "email"
    | "role"
    | "applications"
    | "jobs"
    | "resumeScore";
  order?: "asc" | "desc";
}): Promise<{ data: User[]; meta: PaginationMeta }> => {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.search) query.append("search", params.search);
  if (params?.role) query.append("role", params.role);
  if (params?.sortBy) query.append("sortBy", params.sortBy);
  if (params?.order) query.append("order", params.order);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const payload = await cachedGet<{ data?: User[]; meta?: PaginationMeta }>(
    `/users${suffix}`,
    {
      ttlMs: 7000,
    },
  );
  return {
    data: payload.data || [],
    meta: payload.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
};

export const getAdminUserDetails = async (userId: string): Promise<User | undefined> => {
  const payload = await cachedGet<{ data?: User }>(`/users/${userId}`, {
    ttlMs: 7000,
  });
  return payload.data;
};

export interface AdminLogEntry {
  id: string;
  adminId?: string | null;
  adminName?: string;
  actionType?: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt?: string;
}

export const getAdminLogs = async (params?: {
  page?: number;
  limit?: number;
  actionType?: string;
  targetType?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.actionType) query.append("actionType", params.actionType);
  if (params?.targetType) query.append("targetType", params.targetType);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const payload = await cachedGet<{ data?: AdminLogEntry[]; meta?: PaginationMeta }>(
    `/admin/logs${suffix}`,
    {
      ttlMs: 6000,
    },
  );
  return {
    data: payload.data || [],
    meta: payload.meta || { page: 1, limit: 30, total: 0, totalPages: 0 },
  };
};

export const getAdminResumes = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  parseStatus?: "success" | "failed";
  flaggedOnly?: boolean;
  sortBy?: "updatedAt" | "createdAt" | "score" | "student";
  order?: "asc" | "desc";
}): Promise<{
  data: AdminResumeRecord[];
  meta: PaginationMeta;
  summary: {
    total: number;
    success: number;
    failed: number;
    flagged: number;
  };
}> => {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.search) query.append("search", params.search);
  if (params?.parseStatus) query.append("parseStatus", params.parseStatus);
  if (typeof params?.flaggedOnly === "boolean")
    query.append("flaggedOnly", String(params.flaggedOnly));
  if (params?.sortBy) query.append("sortBy", params.sortBy);
  if (params?.order) query.append("order", params.order);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const payload = await cachedGet<{
    data?: AdminResumeRecord[];
    meta?: PaginationMeta;
    summary?: {
      total: number;
      success: number;
      failed: number;
      flagged: number;
    };
  }>(`/admin/resumes${suffix}`, { ttlMs: 6000 });
  return {
    data: payload.data || [],
    meta: payload.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    summary: payload.summary || { total: 0, success: 0, failed: 0, flagged: 0 },
  };
};

export const moderateAdminResume = async (
  resumeId: string,
  payload: {
    status: "clean" | "flagged" | "review";
    notes?: string;
  },
) => {
  const res = await api.put(`/admin/resumes/${resumeId}/moderation`, payload);
  invalidateAdminResumeCaches();
  return res.data.data as AdminResumeRecord;
};

export const deleteAdminResume = async (resumeId: string) => {
  await api.delete(`/admin/resumes/${resumeId}`);
  invalidateAdminResumeCaches();
};
