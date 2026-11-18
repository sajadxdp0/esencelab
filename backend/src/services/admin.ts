/** Admin-facing summaries, audit logging and platform monitoring. */
import crypto from "crypto";
import {
  ALERT_API_ERROR_RATE_PERCENT,
  ALERT_AUTH_FAILURES,
  ALERT_P95_LATENCY_MS,
  ALERT_SLOW_REQUESTS,
  AI_HEALTH_TIMEOUT_MS,
  AI_SERVICE_URL,
  PLATFORM_HEALTH_CACHE_TTL_MS,
  SERVER_STARTED_AT,
  SLOW_ENDPOINT_THRESHOLD_MS,
  buildAiServiceHeaders,
} from "../config";
import { sanitizeUser, toCanonicalRole } from "../auth/roles";
import { getLatestResumeScore } from "./career";
import { average, getMetricSamples, normalizeRecruiterAccessRequestStatus, normalizeSkillList, toPercentile, toStorageApplicationStatus } from "../utils";
import { db, supabaseStore } from "../state";

export let platformHealthCache: {
  expiresAt: number;
  key: string;
  data: any;
} | null = null;

export const summarizeUserForAdmin = (profile: any) => {
  const canonicalRole = toCanonicalRole(profile.role);
  const resume =
    db.resumes.find((entry: any) => entry.userId === profile.id) || null;
  const latestResumeScore = getLatestResumeScore(profile.id);
  const applications = db.applications.filter(
    (entry: any) => entry.candidateId === profile.id,
  );
  const jobsPosted = db.jobs.filter(
    (entry: any) => entry.employerId === profile.id,
  );

  return {
    ...sanitizeUser(profile),
    canonicalRole,
    resumeUploaded: !!resume,
    resumeId: resume?.id || null,
    latestResumeScore: latestResumeScore?.score || 0,
    totalApplications: applications.length,
    totalJobsPosted: jobsPosted.length,
    lastActivityAt:
      resume?.updatedAt ||
      latestResumeScore?.createdAt ||
      applications[applications.length - 1]?.updatedAt ||
      profile.updatedAt ||
      profile.createdAt,
  };
};

export const appendAdminLog = async (
  adminProfile: any,
  actionType: string,
  targetType: string,
  targetId: string,
  details: Record<string, any> = {},
) => {
  const record = {
    id: crypto.randomUUID(),
    adminId: adminProfile?.id || null,
    adminName: adminProfile?.name || "Admin",
    actionType,
    targetType,
    targetId,
    details,
    createdAt: new Date(),
  };
  db.adminLogs.unshift(record);
  if (db.adminLogs.length > 5000) db.adminLogs.length = 5000;

  await (supabaseStore as any).insertAdminLog?.(record);
  return record;
};
export const summarizeRecruiterAccessRequests = () => {
  const requests = db.recruiterAccessRequests || [];
  return {
    total: requests.length,
    pending: requests.filter(
      (entry: any) =>
        normalizeRecruiterAccessRequestStatus(entry.status) === "pending",
    ).length,
    approved: requests.filter(
      (entry: any) =>
        normalizeRecruiterAccessRequestStatus(entry.status) === "approved",
    ).length,
    rejected: requests.filter(
      (entry: any) =>
        normalizeRecruiterAccessRequestStatus(entry.status) === "rejected",
    ).length,
  };
};
export const buildResumeMonitoringRecord = (resume: any) => {
  const student =
    db.profiles.find((entry: any) => entry.id === resume.userId) || null;
  const latestScore = getLatestResumeScore(resume.userId);
  const parsedData =
    resume?.parsedData && typeof resume.parsedData === "object"
      ? resume.parsedData
      : {};
  const extractedSkills = normalizeSkillList(
    parsedData.skills || resume.skills || [],
  );
  const hasStructuredData =
    extractedSkills.length > 0 ||
    (Array.isArray(parsedData.education) && parsedData.education.length > 0) ||
    (Array.isArray(parsedData.experience) &&
      parsedData.experience.length > 0) ||
    (Array.isArray(parsedData.projects) && parsedData.projects.length > 0);
  const parseStatus = hasStructuredData ? "success" : "failed";

  const flags: string[] = [];
  if (
    !resume.fileName ||
    !String(resume.fileName).toLowerCase().endsWith(".pdf")
  )
    flags.push("invalid_filename");
  if (extractedSkills.length === 0) flags.push("no_skills_extracted");
  if (!parsedData || Object.keys(parsedData).length === 0)
    flags.push("empty_parsed_data");
  if (resume.moderationStatus === "flagged") flags.push("flagged_by_admin");

  return {
    id: resume.id,
    userId: resume.userId,
    student: student ? sanitizeUser(student) : null,
    fileName: resume.fileName,
    fileUrl: resume.fileUrl,
    skills: extractedSkills,
    parseStatus,
    flags,
    resumeScore: latestScore?.score || 0,
    parsedData,
    moderationStatus: resume.moderationStatus || "clean",
    moderationNotes: resume.moderationNotes || "",
    moderationUpdatedAt: resume.moderationUpdatedAt || null,
    moderationUpdatedBy: resume.moderationUpdatedBy || null,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
  };
};
export const buildAdminApplicationSummary = (days = 30) => {
  const totalApplications = db.applications.length;
  const byStatus = db.applications.reduce(
    (acc: Record<string, number>, entry: any) => {
      const key = toStorageApplicationStatus(entry.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { pending: 0, shortlisted: 0, interview: 0, rejected: 0 },
  );

  const perJobMap = new Map<
    string,
    { jobId: string; title: string; company: string; applications: number }
  >();
  for (const application of db.applications) {
    const job = db.jobs.find((entry: any) => entry.id === application.jobId);
    if (!job) continue;
    const current = perJobMap.get(job.id) || {
      jobId: job.id,
      title: job.title,
      company: job.company,
      applications: 0,
    };
    current.applications += 1;
    perJobMap.set(job.id, current);
  }

  const perStudentMap = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      applications: number;
    }
  >();
  for (const application of db.applications) {
    const student = db.profiles.find(
      (entry: any) => entry.id === application.candidateId,
    );
    if (!student) continue;
    const current = perStudentMap.get(student.id) || {
      userId: student.id,
      name: student.name,
      email: student.email,
      applications: 0,
    };
    current.applications += 1;
    perStudentMap.set(student.id, current);
  }

  const today = new Date();
  const dailyMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, 0);
  }
  for (const application of db.applications) {
    const date = new Date(
      application.appliedAt || application.createdAt || Date.now(),
    );
    const dayKey = date.toISOString().slice(0, 10);
    if (dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);
    }
  }

  const matchScores = db.applications
    .map((entry: any) => Number(entry.matchScore || 0))
    .filter((entry: number) => Number.isFinite(entry) && entry > 0);

  return {
    totalApplications,
    averageMatchPercentage: Math.round(average(matchScores)),
    byStatus,
    applicationsPerJob: Array.from(perJobMap.values())
      .sort((left, right) => right.applications - left.applications)
      .slice(0, 10),
    applicationsPerStudent: Array.from(perStudentMap.values())
      .sort((left, right) => right.applications - left.applications)
      .slice(0, 10),
    trendLastDays: Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      count,
    })),
  };
};
export const getPlatformHealthSnapshot = async () => {
  const cacheKey = [
    Number(db.requestMetrics.totalRequests || 0),
    Number(db.requestMetrics.totalErrors || 0),
    Number(db.requestMetrics.authFailures || 0),
    Number(db.requestMetrics.slowRequests || 0),
    Object.keys(db.requestMetrics.endpoints || {}).length,
  ].join(":");
  if (
    platformHealthCache &&
    platformHealthCache.expiresAt > Date.now() &&
    platformHealthCache.key === cacheKey
  ) {
    return platformHealthCache.data;
  }

  const totalRequests = Number(db.requestMetrics.totalRequests || 0);
  const totalErrors = Number(db.requestMetrics.totalErrors || 0);
  const authFailures = Number(db.requestMetrics.authFailures || 0);
  const endpoints = db.requestMetrics.endpoints || {};

  const endpointStats = Object.entries(endpoints).map(
    ([name, entry]: [string, any]) => {
      const count = Number(entry?.count || 0);
      const totalDurationMs = Number(entry?.totalDurationMs || 0);
      const avgDurationMs = count > 0 ? totalDurationMs / count : 0;
      return {
        endpoint: name,
        count,
        errors: Number(entry?.errors || 0),
        avgDurationMs: Math.round(avgDurationMs),
        maxDurationMs: Number(entry?.maxDurationMs || 0),
        slowCount: Number(entry?.slowCount || 0),
        errorRate:
          count > 0
            ? Math.round((Number(entry?.errors || 0) / count) * 10000) / 100
            : 0,
        lastStatusCode: Number(entry?.lastStatusCode || 0),
        lastSeenAt: entry?.lastSeenAt || null,
      };
    },
  );

  const slowEndpoints = [...endpointStats]
    .filter(
      (entry) =>
        entry.avgDurationMs >= SLOW_ENDPOINT_THRESHOLD_MS ||
        entry.slowCount > 0,
    )
    .sort((left, right) => right.avgDurationMs - left.avgDurationMs)
    .slice(0, 6);

  const aiHealth = {
    status: "unknown",
    statusCode: null as number | null,
    latencyMs: null as number | null,
  };
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_HEALTH_TIMEOUT_MS);
  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/health`, {
      method: "GET",
      headers: buildAiServiceHeaders(),
      signal: controller.signal,
    });
    aiHealth.status = aiResponse.ok ? "up" : "degraded";
    aiHealth.statusCode = aiResponse.status;
    aiHealth.latencyMs = Date.now() - started;
  } catch {
    aiHealth.status = "down";
    aiHealth.latencyMs = Date.now() - started;
  } finally {
    clearTimeout(timeout);
  }

  const uptimeSeconds = Math.floor((Date.now() - SERVER_STARTED_AT) / 1000);
  const apiErrorRate =
    totalRequests > 0
      ? Math.round((totalErrors / totalRequests) * 10000) / 100
      : 0;
  const latencySamples = endpointStats.flatMap((entry) =>
    getMetricSamples(endpoints[entry.endpoint]),
  );
  const requestsPerMinute =
    uptimeSeconds > 0
      ? Math.round((totalRequests / Math.max(1, uptimeSeconds)) * 60 * 100) /
        100
      : 0;
  const latencyPercentilesMs = {
    p50: toPercentile(latencySamples, 50),
    p95: toPercentile(latencySamples, 95),
    p99: toPercentile(latencySamples, 99),
  };
  const alerts = [] as Array<{
    id: string;
    severity: "info" | "warning" | "critical";
    title: string;
    message: string;
    metric: string;
    value: number | string;
    threshold?: number;
  }>;
  if (apiErrorRate >= ALERT_API_ERROR_RATE_PERCENT) {
    alerts.push({
      id: "api_error_rate_high",
      severity:
        apiErrorRate >= ALERT_API_ERROR_RATE_PERCENT * 2
          ? "critical"
          : "warning",
      title: "API error rate is elevated",
      message: "Investigate recent 4xx/5xx responses and failing endpoints.",
      metric: "apiErrorRate",
      value: apiErrorRate,
      threshold: ALERT_API_ERROR_RATE_PERCENT,
    });
  }
  if (authFailures >= ALERT_AUTH_FAILURES) {
    alerts.push({
      id: "auth_failures_high",
      severity:
        authFailures >= ALERT_AUTH_FAILURES * 2 ? "critical" : "warning",
      title: "Authentication failures are elevated",
      message:
        "Check for credential attacks, expired sessions, or role-access regressions.",
      metric: "authFailures",
      value: authFailures,
      threshold: ALERT_AUTH_FAILURES,
    });
  }
  if (Number(db.requestMetrics.slowRequests || 0) >= ALERT_SLOW_REQUESTS) {
    alerts.push({
      id: "slow_requests_high",
      severity: "warning",
      title: "Slow request count is elevated",
      message: "Review slow endpoints, AI calls, and database latency.",
      metric: "slowRequests",
      value: Number(db.requestMetrics.slowRequests || 0),
      threshold: ALERT_SLOW_REQUESTS,
    });
  }
  if (latencyPercentilesMs.p95 >= ALERT_P95_LATENCY_MS) {
    alerts.push({
      id: "p95_latency_high",
      severity:
        latencyPercentilesMs.p95 >= ALERT_P95_LATENCY_MS * 2
          ? "critical"
          : "warning",
      title: "P95 latency is elevated",
      message: "Investigate expensive endpoints and upstream service latency.",
      metric: "latencyPercentilesMs.p95",
      value: latencyPercentilesMs.p95,
      threshold: ALERT_P95_LATENCY_MS,
    });
  }
  if (aiHealth.status === "down" || aiHealth.status === "degraded") {
    alerts.push({
      id: "ai_service_unhealthy",
      severity: aiHealth.status === "down" ? "critical" : "warning",
      title: "AI service health degraded",
      message:
        "Resume parsing, matching, or coach responses may use fallbacks.",
      metric: "aiService.status",
      value: aiHealth.status,
    });
  }

  const snapshot = {
    uptimeSeconds,
    totalRequests,
    totalErrors,
    apiErrorRate,
    authFailures,
    requestsPerMinute,
    slowRequests: Number(db.requestMetrics.slowRequests || 0),
    slowThresholdMs: SLOW_ENDPOINT_THRESHOLD_MS,
    avgResponseMs:
      endpointStats.length > 0
        ? Math.round(
            average(
              endpointStats.map((entry) => Number(entry.avgDurationMs || 0)),
            ),
          )
        : 0,
    latencyPercentilesMs,
    alerts,
    slowEndpoints,
    aiService: aiHealth,
  };
  platformHealthCache = {
    expiresAt: Date.now() + PLATFORM_HEALTH_CACHE_TTL_MS,
    key: cacheKey,
    data: snapshot,
  };
  return snapshot;
};
