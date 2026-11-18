import api, { cachedGet, invalidateApiCache } from "@/lib/api";
import { PaginationMeta, RecruiterAccessRequest, RecruiterAccessRequestStatus, RecruiterAccessRequestSummary, RecruiterCandidateMatch, RecruiterOverview } from "@/types";

export const submitRecruiterAccessRequest = async (payload: {
  name: string;
  email: string;
  companyName: string;
  companyWebsite?: string;
  jobTitle?: string;
  message: string;
}): Promise<RecruiterAccessRequest> => {
  const res = await api.post("/recruiter-requests", payload);
  return res.data.data;
};

export const getAdminRecruiterRequests = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: RecruiterAccessRequestStatus | "all";
  sortBy?: "createdAt" | "name" | "company" | "status" | "reviewedAt";
  order?: "asc" | "desc";
}): Promise<{
  data: RecruiterAccessRequest[];
  meta: PaginationMeta;
  summary: RecruiterAccessRequestSummary;
}> => {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.search) query.append("search", params.search);
  if (params?.status) query.append("status", params.status);
  if (params?.sortBy) query.append("sortBy", params.sortBy);
  if (params?.order) query.append("order", params.order);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const payload = await cachedGet<{
    data?: RecruiterAccessRequest[];
    meta?: PaginationMeta;
    summary?: RecruiterAccessRequestSummary;
  }>(`/admin/recruiter-requests${suffix}`, { ttlMs: 5000 });
  return {
    data: payload.data || [],
    meta: payload.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    summary: payload.summary || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    },
  };
};

export const reviewRecruiterAccessRequest = async (
  requestId: string,
  payload: {
    status: Exclude<RecruiterAccessRequestStatus, "pending">;
    adminNotes?: string;
    temporaryPassword?: string;
  },
): Promise<{
  data: RecruiterAccessRequest;
  temporaryPassword?: string | null;
  message?: string;
}> => {
  const res = await api.patch(
    `/admin/recruiter-requests/${requestId}`,
    payload,
  );
  invalidateApiCache(
    (key) =>
      key.includes("/admin/recruiter-requests") ||
      key.includes("/admin/monitoring") ||
      key.includes("/users"),
  );
  return res.data;
};

export const getCandidateMatches = async (
  jobId: string,
  options?: {
    sortBy?: "match" | "resume" | "experience";
    order?: "asc" | "desc";
    limit?: number;
    appliedOnly?: boolean;
  },
): Promise<RecruiterCandidateMatch[]> => {
  const params = new URLSearchParams();
  if (options?.sortBy) params.append("sortBy", options.sortBy);
  if (options?.order) params.append("order", options.order);
  if (typeof options?.limit === "number")
    params.append("limit", String(options.limit));
  if (typeof options?.appliedOnly === "boolean")
    params.append("appliedOnly", String(options.appliedOnly));
  const query = params.toString() ? `?${params.toString()}` : "";
  const payload = await cachedGet<{ data?: RecruiterCandidateMatch[] }>(
    `/jobs/${jobId}/candidate-matches${query}`,
    {
      ttlMs: 5000,
    },
  );
  return payload.data || [];
};

export const getRecruiterOverview = async (): Promise<RecruiterOverview> => {
  const payload = await cachedGet<{ data?: RecruiterOverview }>(
    "/recruiter/overview",
    { ttlMs: 9000 },
  );
  return (
    payload.data || {
      postedJobs: 0,
      activeJobs: 0,
      totalApplicants: 0,
      uniqueApplicants: 0,
      averageMatchAcrossJobs: 0,
      perJobAnalytics: [],
      topCandidates: [],
      skillDemandInsights: [],
    }
  );
};
