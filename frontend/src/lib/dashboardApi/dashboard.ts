import { cachedGet } from "@/lib/api";
import { DashboardStats } from "@/types";

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const payload = await cachedGet<{ data?: DashboardStats }>("/dashboard/stats", {
    ttlMs: 8000,
  });
  return payload.data || {};
};
