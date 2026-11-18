/**
 * Dashboard API public surface.
 *
 * The implementation is split by domain under ./dashboardApi; this barrel keeps
 * every existing named import path (`@/lib/dashboardApi`) working unchanged.
 */
export * from "@/lib/dashboardApi/shared";
export * from "@/lib/dashboardApi/dashboard";
export * from "@/lib/dashboardApi/admin";
export * from "@/lib/dashboardApi/recruiter";
export * from "@/lib/dashboardApi/jobs";
export * from "@/lib/dashboardApi/resume";
export * from "@/lib/dashboardApi/career";
