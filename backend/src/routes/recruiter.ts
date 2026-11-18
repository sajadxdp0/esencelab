/** Recruiter candidate-ranking and analytics routes. */
import type { Application } from "express";
import { roleMatches } from "../auth/roles";
import { getProfileFromAuth } from "../auth";
import { RECRUITER_OVERVIEW_CACHE_TTL_MS } from "../config";
import { expensiveOperationLimiter } from "../middleware";
import { db, recruiterOverviewCache } from "../state";
import { buildRecruiterOverviewCacheKey, getCandidateMatchesForJob, getRecruiterJobAnalytics, pruneRecruiterOverviewCache } from "../services/matching";
import { toSortDirection, toSortKey } from "../utils";

export const registerRecruiterRoutes = (app: Application): void => {
  app.get(
    "/api/jobs/:id/candidate-matches",
    expensiveOperationLimiter,
    async (req, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (
        !(
          roleMatches(profile.role, "recruiter") ||
          roleMatches(profile.role, "admin")
        )
      )
        return res.status(403).json({ message: "Not authorized" });

      const job = db.jobs.find((entry: any) => entry.id === req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      if (
        roleMatches(profile.role, "recruiter") &&
        job.employerId !== profile.id
      ) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const sortBy = toSortKey(req.query?.sortBy);
      const order = toSortDirection(req.query?.order);
      const requestedAppliedOnly =
        String(req.query?.appliedOnly || "").toLowerCase() === "true";
      const appliedOnly = roleMatches(profile.role, "recruiter")
        ? true
        : requestedAppliedOnly;
      const requestedLimit = Number(req.query?.limit);
      const limit =
        Number.isFinite(requestedLimit) && requestedLimit > 0
          ? requestedLimit
          : 100;

      const { matches, meta } = await getCandidateMatchesForJob(job, {
        sortBy,
        order,
        appliedOnly,
        limit,
      });

      res.json({
        data: matches,
        meta: {
          ...meta,
          sortBy,
          order,
          appliedOnly,
          limit: Math.min(limit, 200),
        },
      });
    },
  );

  // Recruiter routes: recruiter dashboard, candidate ranking, and hiring analytics.
  app.get(
    "/api/recruiter/overview",
    expensiveOperationLimiter,
    async (req, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (
        !(
          roleMatches(profile.role, "recruiter") ||
          roleMatches(profile.role, "admin")
        )
      ) {
        return res.status(403).json({ message: "Not authorized" });
      }

      pruneRecruiterOverviewCache();
      const overviewCacheKey = buildRecruiterOverviewCacheKey(profile);
      const cachedOverview = recruiterOverviewCache.get(overviewCacheKey);
      if (cachedOverview && cachedOverview.expiresAt > Date.now()) {
        return res.json({ data: cachedOverview.data });
      }

      const recruiterJobs = roleMatches(profile.role, "admin")
        ? [...db.jobs]
        : db.jobs.filter((entry: any) => entry.employerId === profile.id);
      const recentJobs = [...recruiterJobs]
        .sort(
          (left: any, right: any) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )
        .slice(0, 6);
      const allJobIds = recruiterJobs.map((entry: any) => entry.id);
      const applications = db.applications.filter((entry: any) =>
        allJobIds.includes(entry.jobId),
      );
      const appliedCandidates = new Set(
        applications.map((entry: any) => entry.candidateId),
      );

      const perJobAnalytics = await Promise.all(
        recentJobs.map(async (job: any) => {
          const { matches } = await getCandidateMatchesForJob(job, {
            sortBy: "match",
            order: "desc",
            limit: 50,
            appliedOnly: true,
          });
          return getRecruiterJobAnalytics(job, matches);
        }),
      );

      const topCandidateMap = new Map<string, any>();
      for (const job of recentJobs) {
        const { matches } = await getCandidateMatchesForJob(job, {
          sortBy: "match",
          order: "desc",
          limit: 5,
          appliedOnly: true,
        });
        for (const candidate of matches) {
          const existing = topCandidateMap.get(candidate.studentId);
          if (!existing || candidate.matchScore > existing.matchScore) {
            topCandidateMap.set(candidate.studentId, {
              ...candidate,
              jobId: job.id,
              jobTitle: job.title,
            });
          }
        }
      }

      const rankedTopCandidates = Array.from(topCandidateMap.values())
        .sort(
          (left, right) =>
            Number(right.matchScore || 0) - Number(left.matchScore || 0),
        )
        .slice(0, 5);

      const missingSkillFrequency = new Map<string, number>();
      for (const job of recentJobs) {
        const { matches } = await getCandidateMatchesForJob(job, {
          sortBy: "match",
          order: "desc",
          limit: 50,
          appliedOnly: true,
        });
        for (const match of matches) {
          for (const skill of match.missingSkills || []) {
            const key = String(skill).trim();
            if (!key) continue;
            missingSkillFrequency.set(
              key,
              (missingSkillFrequency.get(key) || 0) + 1,
            );
          }
        }
      }

      const skillDemandInsights = Array.from(missingSkillFrequency.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([skill, count]) => ({ skill, count }));

      const averageMatchAcrossJobs =
        perJobAnalytics.length > 0
          ? Math.round(
              perJobAnalytics.reduce(
                (sum: number, entry: any) =>
                  sum + Number(entry.averageMatch || 0),
                0,
              ) / perJobAnalytics.length,
            )
          : 0;

      const responsePayload = {
        postedJobs: recruiterJobs.length,
        activeJobs: recruiterJobs.filter(
          (entry: any) => entry.status === "active",
        ).length,
        totalApplicants: applications.length,
        uniqueApplicants: appliedCandidates.size,
        averageMatchAcrossJobs,
        perJobAnalytics,
        topCandidates: rankedTopCandidates,
        skillDemandInsights,
      };

      recruiterOverviewCache.set(overviewCacheKey, {
        expiresAt: Date.now() + RECRUITER_OVERVIEW_CACHE_TTL_MS,
        data: responsePayload,
      });

      res.json({ data: responsePayload });
    },
  );

  app.get(
    "/api/recruiter/jobs/:id/analytics",
    expensiveOperationLimiter,
    async (req, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (
        !(
          roleMatches(profile.role, "recruiter") ||
          roleMatches(profile.role, "admin")
        )
      ) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const job = db.jobs.find((entry: any) => entry.id === req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      if (
        roleMatches(profile.role, "recruiter") &&
        job.employerId !== profile.id
      ) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const { matches, meta } = await getCandidateMatchesForJob(job, {
        sortBy: "match",
        order: "desc",
        limit: 100,
        appliedOnly: roleMatches(profile.role, "recruiter"),
      });
      const analytics = getRecruiterJobAnalytics(job, matches);
      res.json({
        data: {
          ...analytics,
          matches,
        },
        meta,
      });
    },
  );
};
