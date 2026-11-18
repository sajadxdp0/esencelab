/** Recommendations and student job-tracker routes. */
import crypto from "crypto";
import type { Application } from "express";
import { getProfileFromAuth, requireAuth, requireRoles } from "../auth";
import { buildRecommendationExplanation } from "../careerEngine";
import { STUDENT_RECOMMENDATIONS_CACHE_TTL_MS } from "../config";
import { expensiveOperationLimiter } from "../middleware";
import { db, studentRecommendationCache, supabaseStore } from "../state";
import { getMatchInsights, pruneStudentRecommendationCache } from "../services/matching";
import type { RequestWithAuth } from "../types";
import { courseSkillMatches, getCollectionVersion, toHumanReadableImpact, toSkillList, toStorageApplicationStatus, withApplicationDetails } from "../utils";

export const registerRecommendationRoutes = (app: Application): void => {
  // Recommendation Routes
  app.get("/api/recommendations", expensiveOperationLimiter, async (req, res) => {
    const profile = getProfileFromAuth(req);
    if (!profile) return res.status(401).json({ message: "Not authenticated" });
    if (profile.role !== "student")
      return res.status(403).json({ message: "Not authorized" });
    const requestedLimit = Number(req.query.limit || 3);
    const recommendationLimit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(10, Math.floor(requestedLimit)))
      : 3;

    pruneStudentRecommendationCache();
    const candidate = db.candidates.find(
      (entry: any) => entry.userId === profile.id,
    );
    const resume = db.resumes.find((entry: any) => entry.userId === profile.id);
    const recommendationCacheKey = [
      profile.id,
      recommendationLimit,
      new Date(resume?.updatedAt || resume?.createdAt || 0).getTime(),
      new Date(candidate?.updatedAt || candidate?.createdAt || 0).getTime(),
      db.jobs.length,
      getCollectionVersion(db.jobs),
      db.courses.length,
      getCollectionVersion(db.courses),
    ].join(":");
    const cachedRecommendations = studentRecommendationCache.get(
      recommendationCacheKey,
    );
    if (cachedRecommendations && cachedRecommendations.expiresAt > Date.now()) {
      return res.json({ data: cachedRecommendations.data });
    }
    const resumeSkills = Array.from(
      new Set([
        ...toSkillList(candidate?.skills),
        ...toSkillList(resume?.skills),
        ...toSkillList(resume?.parsedData?.skills),
      ]),
    );

    if (resumeSkills.length === 0) {
      const emptyPayload = {
        generatedAt: new Date(),
        recommendedJobs: [],
        missingSkills: [],
        recommendedCourses: [],
      };
      studentRecommendationCache.set(recommendationCacheKey, {
        expiresAt: Date.now() + STUDENT_RECOMMENDATIONS_CACHE_TTL_MS,
        data: emptyPayload,
      });
      return res.json({ data: emptyPayload });
    }

    const activeJobs = db.jobs.filter((job: any) => job.status === "active");
    const scoredJobs = await Promise.all(
      activeJobs.map(async (job: any) => {
        const insights = await getMatchInsights(resumeSkills, job);
        const requiredSkills = toSkillList(
          job.skills?.length ? job.skills : job.requirements,
        );
        const explanation = buildRecommendationExplanation(
          resumeSkills,
          requiredSkills,
        );
        return {
          job,
          matchScore: insights.matchScore,
          requiredSkills,
          matchedSkills: insights.matchedSkills,
          missingSkills: insights.missingSkills,
          explanation: insights.explanation || explanation.summary,
          shortSummary: (insights.explanation || explanation.summary || "").slice(
            0,
            180,
          ),
          explanationMeta: {
            summary: explanation.summary,
            matchedCount: explanation.matchedCount,
            totalRequired: explanation.totalRequired,
            improvementImpacts: explanation.improvementImpacts.map((entry) => ({
              ...entry,
              impact: toHumanReadableImpact(entry.impact),
            })),
          },
        };
      }),
    );

    const recommendedJobs = scoredJobs
      .sort((left, right) => right.matchScore - left.matchScore)
      .slice(0, recommendationLimit);

    const missingSkills = Array.from(
      new Set(
        recommendedJobs
          .slice(0, 5)
          .flatMap((entry) => entry.missingSkills)
          .map((entry) => entry.toLowerCase()),
      ),
    );

    const recommendedCourses = db.courses
      .map((course: any) => {
        const courseSkills = toSkillList(course.skills).map((entry) =>
          entry.toLowerCase(),
        );
        const matchedMissing = missingSkills.filter((skill) =>
          courseSkillMatches(courseSkills, skill),
        );
        return {
          ...course,
          matchedMissingSkills: matchedMissing,
          relevanceScore: matchedMissing.length,
        };
      })
      .filter((course: any) => course.relevanceScore > 0)
      .sort(
        (left: any, right: any) =>
          right.relevanceScore - left.relevanceScore ||
          (right.rating || 0) - (left.rating || 0),
      )
      .slice(0, 6);

    db.recommendations = db.recommendations.filter(
      (entry: any) => entry.userId !== profile.id,
    );
    await supabaseStore.deleteRecommendationsByUser(profile.id);
    const now = new Date();
    for (const recommendation of recommendedJobs) {
      const recommendationRecord = {
        id: crypto.randomUUID(),
        userId: profile.id,
        jobId: recommendation.job.id,
        matchScore: recommendation.matchScore,
        matchedSkills: recommendation.matchedSkills,
        missingSkills: recommendation.missingSkills,
        explanation: recommendation.explanation,
        explanationMeta: recommendation.explanationMeta,
        createdAt: now,
      };
      db.recommendations.push(recommendationRecord);
      await supabaseStore.upsertRecommendation(recommendationRecord);
    }

    const responsePayload = {
      generatedAt: now,
      recommendedJobs,
      missingSkills,
      recommendedCourses,
      summary: recommendedJobs.length
        ? `You are matching ${recommendedJobs[0].explanationMeta?.matchedCount || 0} out of ${
            recommendedJobs[0].explanationMeta?.totalRequired || 0
          } key skills for your top role.`
        : activeJobs.length === 0
          ? "Your resume is parsed. Recommendations will appear once active jobs are available."
          : "Your resume is parsed. Keep improving your missing skills to unlock stronger recommendations.",
    };
    studentRecommendationCache.set(recommendationCacheKey, {
      expiresAt: Date.now() + STUDENT_RECOMMENDATIONS_CACHE_TTL_MS,
      data: responsePayload,
    });

    res.json({ data: responsePayload });
  });
};

export const registerJobTrackerRoutes = (app: Application): void => {
  app.get("/api/career/job-tracker", (req, res) => {
    const profile = getProfileFromAuth(req);
    if (!profile) return res.status(401).json({ message: "Not authenticated" });
    if (profile.role !== "student")
      return res.status(403).json({ message: "Not authorized" });

    const saved = db.savedJobs
      .filter((entry: any) => entry.userId === profile.id)
      .map((entry: any) => ({
        ...entry,
        job: db.jobs.find((job: any) => job.id === entry.jobId) || null,
      }))
      .filter((entry: any) => entry.job !== null);
    const applications = withApplicationDetails(
      db.applications.filter((entry: any) => entry.candidateId === profile.id),
    );
    const statusCounts = applications.reduce(
      (acc: any, entry: any) => {
        acc[entry.trackerStatus] = (acc[entry.trackerStatus] || 0) + 1;
        return acc;
      },
      { saved: saved.length, applied: 0, interviewing: 0, offer: 0, rejected: 0 },
    );
    res.json({
      data: {
        savedJobs: saved.sort(
          (left: any, right: any) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        ),
        applications: applications.sort(
          (left: any, right: any) =>
            new Date(right.appliedAt || right.createdAt || Date.now()).getTime() -
            new Date(left.appliedAt || left.createdAt || Date.now()).getTime(),
        ),
        statusCounts,
      },
    });
  });

  app.post(
    "/api/career/job-tracker/save",
    requireAuth,
    requireRoles("student"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "student")
        return res.status(403).json({ message: "Not authorized" });

      const jobId = String(req.body?.jobId || "");
      if (!jobId) return res.status(400).json({ message: "jobId is required" });
      const job = db.jobs.find(
        (entry: any) => entry.id === jobId && entry.status === "active",
      );
      if (!job) return res.status(404).json({ message: "Job not found" });

      const exists = db.savedJobs.find(
        (entry: any) => entry.userId === profile.id && entry.jobId === jobId,
      );
      if (exists) return res.json({ data: exists });

      const record = {
        id: crypto.randomUUID(),
        userId: profile.id,
        jobId,
        createdAt: new Date(),
      };
      db.savedJobs.push(record);
      await supabaseStore.upsertSavedJob(record);
      res.status(201).json({ data: record });
    },
  );

  app.delete(
    "/api/career/job-tracker/save/:jobId",
    requireAuth,
    requireRoles("student"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "student")
        return res.status(403).json({ message: "Not authorized" });

      const idx = db.savedJobs.findIndex(
        (entry: any) =>
          entry.userId === profile.id && entry.jobId === req.params.jobId,
      );
      if (idx === -1)
        return res.status(404).json({ message: "Saved job not found" });
      const record = db.savedJobs[idx];
      db.savedJobs.splice(idx, 1);
      await supabaseStore.deleteSavedJob(record.id);
      res.json({ message: "Saved job removed" });
    },
  );

  app.put(
    "/api/career/job-tracker/application/:applicationId",
    requireAuth,
    requireRoles("student"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "student")
        return res.status(403).json({ message: "Not authorized" });

      const idx = db.applications.findIndex(
        (entry: any) =>
          entry.id === req.params.applicationId &&
          entry.candidateId === profile.id,
      );
      if (idx === -1)
        return res.status(404).json({ message: "Application not found" });

      const updates: any = {};
      if (typeof req.body?.notes === "string") updates.notes = req.body.notes;
      if (typeof req.body?.status === "string") {
        const normalized = String(req.body.status).trim().toLowerCase();
        if (
          [
            "pending",
            "shortlisted",
            "interview",
            "rejected",
            "applied",
            "interviewing",
            "offer",
          ].includes(normalized)
        ) {
          updates.status = toStorageApplicationStatus(normalized);
        }
      }
      db.applications[idx] = {
        ...db.applications[idx],
        ...updates,
        updatedAt: new Date(),
      };
      await supabaseStore.upsertApplication(db.applications[idx]);
      res.json({ data: withApplicationDetails([db.applications[idx]])[0] });
    },
  );

  app.delete(
    "/api/career/job-tracker/application/:applicationId",
    requireAuth,
    requireRoles("student"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "student")
        return res.status(403).json({ message: "Not authorized" });

      const idx = db.applications.findIndex(
        (entry: any) =>
          entry.id === req.params.applicationId &&
          entry.candidateId === profile.id,
      );
      if (idx === -1)
        return res.status(404).json({ message: "Application not found" });

      const removed = db.applications[idx];
      db.applications.splice(idx, 1);
      await supabaseStore.deleteApplication(removed.id);
      res.json({ message: "Application removed from tracker" });
    },
  );
};
