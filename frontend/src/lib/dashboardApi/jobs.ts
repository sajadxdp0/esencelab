import api, { cachedGet } from "@/lib/api";
import { invalidateJobCaches } from "@/lib/dashboardApi/shared";
import { Job } from "@/types";

export const getLatestJobs = async (limit = 6): Promise<Job[]> => {
  const payload = await cachedGet<{ data?: { jobs?: Job[] } }>(
    `/jobs?limit=${limit}`,
    { ttlMs: 10000 },
  );
  return payload.data?.jobs || [];
};

export const getEmployerJobs = async (): Promise<Job[]> => {
  const payload = await cachedGet<{ data?: { jobs?: Job[] } }>(
    "/jobs?my=true&status=active",
    {
      ttlMs: 8000,
    },
  );
  return payload.data?.jobs || [];
};

export const createJob = async (payload: {
  title: string;
  company: string;
  location?: string;
  requirements: string;
  description?: string;
  experienceLevel?: "entry" | "junior" | "mid" | "senior" | "lead";
  jobType?: "full_time" | "part_time" | "internship" | "contract";
  status?: "active" | "closed";
  salaryMin?: number | null;
  salaryMax?: number | null;
}) => {
  const requirements = payload.requirements
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const safeRequirements =
    requirements.length > 0
      ? requirements
      : ["Communication", "Problem Solving"];

  const res = await api.post("/jobs", {
    title: payload.title,
    company: payload.company,
    location: payload.location?.trim() || "Remote",
    description:
      payload.description?.trim() ||
      `Opportunity for ${payload.title} candidates.`,
    requirements: safeRequirements,
    skills: safeRequirements,
    experienceLevel: payload.experienceLevel || "mid",
    jobType: payload.jobType || "full_time",
    status: payload.status || "active",
    salaryMin: payload.salaryMin ?? null,
    salaryMax: payload.salaryMax ?? null,
  });
  invalidateJobCaches();
  return res.data.data;
};

export const updateJob = async (
  jobId: string,
  payload: Partial<{
    title: string;
    company: string;
    description: string;
    location: string;
    requirements: string[] | string;
    skills: string[];
    experienceLevel: "entry" | "junior" | "mid" | "senior" | "lead";
    jobType: "full_time" | "part_time" | "internship" | "contract";
    status: "active" | "closed";
    salaryMin: number | null;
    salaryMax: number | null;
  }>,
) => {
  const res = await api.put(`/jobs/${jobId}`, payload);
  invalidateJobCaches();
  return res.data.data;
};

export const deleteJob = async (jobId: string) => {
  await api.delete(`/jobs/${jobId}`);
  invalidateJobCaches();
};
