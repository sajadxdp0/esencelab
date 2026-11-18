/** Admin-only user, recruiter-request, resume and monitoring routes. */
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Application } from "express";
import { roleFilterMatches, roleMatches, toStorageRole, type SupportedRole } from "../auth/roles";
import { requireAuth, requireRoles } from "../auth";
import { adminLimiter } from "../middleware";
import { db, supabaseStore } from "../state";
import { appendAdminLog, buildAdminApplicationSummary, buildResumeMonitoringRecord, getPlatformHealthSnapshot, summarizeRecruiterAccessRequests, summarizeUserForAdmin } from "../services/admin";
import type { RequestWithAuth } from "../types";
import { average, generateTemporaryPassword, getPagination, normalizeRecruiterAccessRequestStatus, paginateData, sanitizeRecruiterAccessRequest, toPositiveInt, truncateForStorage, withApplicationDetails } from "../utils";

export const registerAdminRecruiterRequestRoutes = (app: Application): void => {
  app.get(
    "/api/admin/recruiter-requests",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    (req, res) => {
      const { search, status, sortBy, order } = req.query;
      const pagination = getPagination(req.query as any, {
        page: 1,
        limit: 20,
        maxLimit: 100,
      });
      const direction = String(order || "desc").toLowerCase() === "asc" ? 1 : -1;
      const sortKey = String(sortBy || "createdAt").toLowerCase();
      const statusFilter = normalizeRecruiterAccessRequestStatus(
        status,
        "pending",
      );
      const hasStatusFilter =
        status !== undefined && status !== null && String(status).trim() !== "";

      let requests = [...db.recruiterAccessRequests].map((entry: any) =>
        sanitizeRecruiterAccessRequest(entry),
      );

      if (hasStatusFilter && String(status).toLowerCase() !== "all") {
        requests = requests.filter((entry: any) => entry.status === statusFilter);
      }

      if (search) {
        const searchText = String(search).trim().toLowerCase();
        requests = requests.filter((entry: any) =>
          [entry.name, entry.email, entry.companyName, entry.jobTitle]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(searchText)),
        );
      }

      requests.sort((left: any, right: any) => {
        if (sortKey === "name") {
          return (
            String(left.name || "").localeCompare(String(right.name || "")) *
            direction
          );
        }
        if (sortKey === "company") {
          return (
            String(left.companyName || "").localeCompare(
              String(right.companyName || ""),
            ) * direction
          );
        }
        if (sortKey === "status") {
          return (
            String(left.status || "").localeCompare(String(right.status || "")) *
            direction
          );
        }
        if (sortKey === "reviewedat") {
          return (
            (new Date(left.reviewedAt || 0).getTime() -
              new Date(right.reviewedAt || 0).getTime()) *
            direction
          );
        }
        return (
          (new Date(left.createdAt || 0).getTime() -
            new Date(right.createdAt || 0).getTime()) *
          direction
        );
      });

      const paginated = paginateData(requests, pagination.page, pagination.limit);
      res.json({
        data: paginated.data,
        meta: paginated.meta,
        summary: summarizeRecruiterAccessRequests(),
      });
    },
  );

  app.patch(
    "/api/admin/recruiter-requests/:id",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    async (req: RequestWithAuth, res) => {
      const adminProfile = req.profile;
      if (!adminProfile) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const idx = db.recruiterAccessRequests.findIndex(
        (entry: any) => entry.id === req.params.id,
      );
      if (idx === -1) {
        return res.status(404).json({ message: "Recruiter request not found" });
      }

      const current = db.recruiterAccessRequests[idx];
      const currentStatus = normalizeRecruiterAccessRequestStatus(current.status);
      const requestedStatus = normalizeRecruiterAccessRequestStatus(
        req.body?.status,
        currentStatus,
      );
      const adminNotes = truncateForStorage(req.body?.adminNotes, 2000);

      if (!["approved", "rejected"].includes(requestedStatus)) {
        return res.status(400).json({
          message: "status must be approved or rejected.",
        });
      }
      if (currentStatus === "approved") {
        return res.status(409).json({
          message: "This recruiter request has already been approved.",
        });
      }
      if (currentStatus === "rejected" && requestedStatus === "rejected") {
        return res.status(409).json({
          message: "This recruiter request has already been rejected.",
        });
      }

      const now = new Date();
      let temporaryPassword: string | null = null;
      let linkedUserId = current.userId || null;

      if (requestedStatus === "approved") {
        const suppliedPassword = String(req.body?.temporaryPassword || "").trim();
        if (suppliedPassword && suppliedPassword.length < 10) {
          return res.status(400).json({
            message: "temporaryPassword must be at least 10 characters.",
          });
        }

        temporaryPassword = suppliedPassword || generateTemporaryPassword();
        const existingProfile = db.profiles.find(
          (entry: any) => entry.email?.toLowerCase() === current.email,
        );

        if (existingProfile && !roleMatches(existingProfile.role, "recruiter")) {
          return res.status(409).json({
            message:
              "A non-recruiter account already exists for this email. Resolve the user account before approval.",
          });
        }

        if (existingProfile) {
          existingProfile.name = existingProfile.name || current.name;
          existingProfile.role = "employer";
          existingProfile.isActive = true;
          existingProfile.passwordHash = await bcrypt.hash(temporaryPassword, 10);
          existingProfile.updatedAt = now;
          linkedUserId = existingProfile.id;
          await supabaseStore.upsertUser(existingProfile);
        } else {
          const recruiterProfile = {
            id: crypto.randomUUID(),
            email: current.email,
            passwordHash: await bcrypt.hash(temporaryPassword, 10),
            name: current.name,
            role: "employer" as SupportedRole,
            avatarUrl: null,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          };
          db.profiles.push(recruiterProfile);
          linkedUserId = recruiterProfile.id;
          await supabaseStore.upsertUser(recruiterProfile);
        }
      }

      const nextRequest = {
        ...current,
        status: requestedStatus,
        adminNotes,
        reviewedBy: adminProfile.id,
        reviewedAt: now,
        userId: linkedUserId,
        updatedAt: now,
      };
      db.recruiterAccessRequests[idx] = nextRequest;
      await (supabaseStore as any).upsertRecruiterAccessRequest?.(nextRequest);

      await appendAdminLog(
        adminProfile,
        requestedStatus === "approved"
          ? "recruiter_request_approved"
          : "recruiter_request_rejected",
        "recruiter_request",
        nextRequest.id,
        {
          email: nextRequest.email,
          companyName: nextRequest.companyName,
          userId: linkedUserId,
        },
      );

      return res.json({
        message:
          requestedStatus === "approved"
            ? "Recruiter request approved. Share the temporary password securely."
            : "Recruiter request rejected.",
        data: sanitizeRecruiterAccessRequest(nextRequest),
        temporaryPassword,
      });
    },
  );
};

export const registerUserAdminRoutes = (app: Application): void => {
  // Users Routes (admin only)
  app.get(
    "/api/users",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    (req, res) => {
      const { search, role, sortBy, order } = req.query;
      const { page, limit } = getPagination(req.query as any, {
        page: 1,
        limit: 20,
        maxLimit: 100,
      });
      const direction = String(order || "desc").toLowerCase() === "asc" ? 1 : -1;
      const sortKey = String(sortBy || "createdAt").toLowerCase();

      let users = db.profiles.map((entry: any) => summarizeUserForAdmin(entry));

      if (search) {
        const searchText = String(search).toLowerCase();
        users = users.filter(
          (entry: any) =>
            entry.name?.toLowerCase().includes(searchText) ||
            entry.email?.toLowerCase().includes(searchText),
        );
      }

      if (role) {
        users = users.filter((entry: any) =>
          roleFilterMatches(entry.role, String(role)),
        );
      }

      users.sort((left: any, right: any) => {
        if (sortKey === "name")
          return (
            String(left.name || "").localeCompare(String(right.name || "")) *
            direction
          );
        if (sortKey === "email")
          return (
            String(left.email || "").localeCompare(String(right.email || "")) *
            direction
          );
        if (sortKey === "role")
          return (
            String(left.canonicalRole || "").localeCompare(
              String(right.canonicalRole || ""),
            ) * direction
          );
        if (sortKey === "applications")
          return (
            (Number(left.totalApplications || 0) -
              Number(right.totalApplications || 0)) *
            direction
          );
        if (sortKey === "jobs")
          return (
            (Number(left.totalJobsPosted || 0) -
              Number(right.totalJobsPosted || 0)) *
            direction
          );
        if (sortKey === "resumescore")
          return (
            (Number(left.latestResumeScore || 0) -
              Number(right.latestResumeScore || 0)) *
            direction
          );
        return (
          (new Date(left.createdAt || 0).getTime() -
            new Date(right.createdAt || 0).getTime()) *
          direction
        );
      });

      const paginated = paginateData(users, page, limit);
      res.json({ data: paginated.data, meta: paginated.meta });
    },
  );

  app.get(
    "/api/users/:id",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    (req, res) => {
      const target = db.profiles.find((entry: any) => entry.id === req.params.id);
      if (!target) return res.status(404).json({ message: "User not found" });

      const summary = summarizeUserForAdmin(target);
      const resume =
        db.resumes.find((entry: any) => entry.userId === target.id) || null;
      const recentApplications = withApplicationDetails(
        db.applications
          .filter((entry: any) => entry.candidateId === target.id)
          .sort(
            (left: any, right: any) =>
              new Date(right.appliedAt || 0).getTime() -
              new Date(left.appliedAt || 0).getTime(),
          )
          .slice(0, 10),
      );
      const jobsPosted = db.jobs
        .filter((entry: any) => entry.employerId === target.id)
        .sort(
          (left: any, right: any) =>
            new Date(right.createdAt || 0).getTime() -
            new Date(left.createdAt || 0).getTime(),
        )
        .slice(0, 10);

      res.json({
        data: {
          ...summary,
          resume,
          recentApplications,
          jobsPosted,
        },
      });
    },
  );

  app.put(
    "/api/users/:id",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    async (req: RequestWithAuth, res) => {
      const profile = req.profile;
      if (!profile) return res.status(401).json({ message: "Not authenticated" });

      const idx = db.profiles.findIndex(
        (entry: any) => entry.id === req.params.id,
      );
      if (idx === -1) return res.status(404).json({ message: "User not found" });

      if (req.params.id === profile.id && req.body.isActive === false) {
        return res
          .status(400)
          .json({ message: "You cannot deactivate your own account" });
      }

      const current = db.profiles[idx];
      const updates: Record<string, any> = {};
      if (typeof req.body?.name === "string") updates.name = req.body.name.trim();
      if (typeof req.body?.email === "string")
        updates.email = req.body.email.trim().toLowerCase();
      if (
        typeof req.body?.avatarUrl === "string" ||
        req.body?.avatarUrl === null
      ) {
        updates.avatarUrl = req.body.avatarUrl;
      }
      if (typeof req.body?.isActive === "boolean")
        updates.isActive = req.body.isActive;
      if (req.body?.role) updates.role = toStorageRole(req.body.role);

      const next = { ...current, ...updates, updatedAt: new Date() };
      db.profiles[idx] = next;
      await supabaseStore.upsertUser(next);

      const changedFields: Record<string, any> = {};
      for (const key of ["name", "email", "role", "isActive"] as const) {
        if (current[key] !== next[key]) {
          changedFields[key] = { from: current[key], to: next[key] };
        }
      }
      if (Object.keys(changedFields).length > 0) {
        await appendAdminLog(profile, "user_updated", "user", next.id, {
          changedFields,
        });
      }

      res.json({ data: summarizeUserForAdmin(next) });
    },
  );

  app.delete(
    "/api/users/:id",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    async (req: RequestWithAuth, res) => {
      const profile = req.profile;
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (req.params.id === profile.id)
        return res
          .status(400)
          .json({ message: "You cannot delete your own account" });

      const idx = db.profiles.findIndex(
        (entry: any) => entry.id === req.params.id,
      );
      if (idx === -1) return res.status(404).json({ message: "User not found" });

      const target = db.profiles[idx];
      const softDelete = String(req.query?.soft || "").toLowerCase() === "true";
      const activeAdminCount = db.profiles.filter(
        (entry: any) =>
          roleMatches(entry.role, "admin") && entry.isActive !== false,
      ).length;
      if (roleMatches(target.role, "admin") && activeAdminCount <= 1) {
        return res
          .status(400)
          .json({ message: "Cannot delete the last active admin account" });
      }

      if (softDelete) {
        db.profiles[idx] = {
          ...target,
          isActive: false,
          updatedAt: new Date(),
        };
        await supabaseStore.upsertUser(db.profiles[idx]);
        await appendAdminLog(profile, "user_deactivated", "user", target.id, {
          softDelete: true,
        });
        return res.json({
          message: "User deactivated",
          data: summarizeUserForAdmin(db.profiles[idx]),
        });
      }

      const recruiterJobIds = db.jobs
        .filter((entry: any) => entry.employerId === target.id)
        .map((entry: any) => entry.id);

      db.profiles.splice(idx, 1);
      db.candidates = db.candidates.filter(
        (entry: any) => entry.userId !== req.params.id,
      );
      db.resumes = db.resumes.filter(
        (entry: any) => entry.userId !== req.params.id,
      );
      db.applications = db.applications.filter(
        (entry: any) =>
          entry.candidateId !== req.params.id &&
          !recruiterJobIds.includes(entry.jobId),
      );
      db.jobs = db.jobs.filter(
        (entry: any) => entry.employerId !== req.params.id,
      );
      db.recommendations = db.recommendations.filter(
        (entry: any) => entry.userId !== req.params.id,
      );
      db.resumeScores = db.resumeScores.filter(
        (entry: any) => entry.userId !== req.params.id,
      );
      db.skillProgress = db.skillProgress.filter(
        (entry: any) => entry.userId !== req.params.id,
      );
      db.learningPlans = db.learningPlans.filter(
        (entry: any) => entry.userId !== req.params.id,
      );
      db.mockInterviewSessions = db.mockInterviewSessions.filter(
        (entry: any) => entry.userId !== req.params.id,
      );
      db.savedJobs = db.savedJobs.filter(
        (entry: any) => entry.userId !== req.params.id,
      );
      db.careerPreferences = db.careerPreferences.filter(
        (entry: any) => entry.userId !== req.params.id,
      );

      await supabaseStore.deleteUser(req.params.id);
      await supabaseStore.deleteCandidatesByUser(req.params.id);
      await supabaseStore.deleteResumesByUser(req.params.id);
      await supabaseStore.deleteApplicationsByCandidate(req.params.id);
      await supabaseStore.deleteRecommendationsByUser(req.params.id);
      await supabaseStore.deleteResumeScoresByUser(req.params.id);
      await supabaseStore.deleteSkillProgressByUser(req.params.id);
      await supabaseStore.deleteLearningPlansByUser(req.params.id);
      await supabaseStore.deleteMockInterviewSessionsByUser(req.params.id);
      await supabaseStore.deleteSavedJobsByUser(req.params.id);
      await supabaseStore.deleteCareerPreference(req.params.id);
      for (const jobId of recruiterJobIds) {
        await supabaseStore.deleteApplicationsByJob(jobId);
        await supabaseStore.deleteJob(jobId);
      }

      await appendAdminLog(profile, "user_deleted", "user", target.id, {
        cascade: {
          recruiterJobsRemoved: recruiterJobIds.length,
        },
      });
      res.json({ message: "User deleted" });
    },
  );
};

export const registerResumeAdminRoutes = (app: Application): void => {
  // Resume moderation routes (admin)
  app.get(
    "/api/admin/resumes",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    (req: RequestWithAuth, res) => {
      const { search, parseStatus, flaggedOnly, sortBy, order } = req.query;
      const pagination = getPagination(req.query as any, {
        page: 1,
        limit: 20,
        maxLimit: 100,
      });
      const direction = String(order || "desc").toLowerCase() === "asc" ? 1 : -1;
      const sortKey = String(sortBy || "updatedAt").toLowerCase();

      let resumes = db.resumes.map((entry: any) =>
        buildResumeMonitoringRecord(entry),
      );
      if (search) {
        const searchText = String(search).toLowerCase();
        resumes = resumes.filter((entry: any) => {
          const haystack = [
            entry.fileName,
            entry.student?.name,
            entry.student?.email,
            ...(entry.skills || []),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(searchText);
        });
      }

      if (parseStatus && ["success", "failed"].includes(String(parseStatus))) {
        resumes = resumes.filter(
          (entry: any) => entry.parseStatus === String(parseStatus),
        );
      }

      if (String(flaggedOnly || "").toLowerCase() === "true") {
        resumes = resumes.filter(
          (entry: any) =>
            entry.moderationStatus === "flagged" || entry.flags.length > 0,
        );
      }

      resumes.sort((left: any, right: any) => {
        if (sortKey === "score")
          return (
            (Number(left.resumeScore || 0) - Number(right.resumeScore || 0)) *
            direction
          );
        if (sortKey === "student") {
          return (
            String(left.student?.name || "").localeCompare(
              String(right.student?.name || ""),
            ) * direction
          );
        }
        if (sortKey === "createdat") {
          return (
            (new Date(left.createdAt || 0).getTime() -
              new Date(right.createdAt || 0).getTime()) *
            direction
          );
        }
        return (
          (new Date(left.updatedAt || 0).getTime() -
            new Date(right.updatedAt || 0).getTime()) *
          direction
        );
      });

      const summary = {
        total: resumes.length,
        success: resumes.filter((entry: any) => entry.parseStatus === "success")
          .length,
        failed: resumes.filter((entry: any) => entry.parseStatus === "failed")
          .length,
        flagged: resumes.filter(
          (entry: any) => entry.moderationStatus === "flagged",
        ).length,
      };
      const paginated = paginateData(resumes, pagination.page, pagination.limit);
      res.json({ data: paginated.data, meta: paginated.meta, summary });
    },
  );

  app.get(
    "/api/admin/resumes/:id",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    (req, res) => {
      const resume = db.resumes.find((entry: any) => entry.id === req.params.id);
      if (!resume) return res.status(404).json({ message: "Resume not found" });
      return res.json({ data: buildResumeMonitoringRecord(resume) });
    },
  );

  app.put(
    "/api/admin/resumes/:id/moderation",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    async (req: RequestWithAuth, res) => {
      const profile = req.profile;
      if (!profile) return res.status(401).json({ message: "Not authenticated" });

      const idx = db.resumes.findIndex(
        (entry: any) => entry.id === req.params.id,
      );
      if (idx === -1)
        return res.status(404).json({ message: "Resume not found" });

      const status = String(req.body?.status || "")
        .trim()
        .toLowerCase();
      if (!["clean", "flagged", "review"].includes(status)) {
        return res
          .status(400)
          .json({ message: "status must be one of clean, flagged, or review" });
      }

      db.resumes[idx] = {
        ...db.resumes[idx],
        moderationStatus: status,
        moderationNotes:
          typeof req.body?.notes === "string" ? req.body.notes.trim() : "",
        moderationUpdatedBy: profile.id,
        moderationUpdatedAt: new Date(),
        updatedAt: new Date(),
      };
      await supabaseStore.upsertResume(db.resumes[idx]);
      await appendAdminLog(
        profile,
        "resume_moderated",
        "resume",
        db.resumes[idx].id,
        {
          status,
          notes: db.resumes[idx].moderationNotes,
        },
      );

      return res.json({ data: buildResumeMonitoringRecord(db.resumes[idx]) });
    },
  );

  app.delete(
    "/api/admin/resumes/:id",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    async (req: RequestWithAuth, res) => {
      const profile = req.profile;
      if (!profile) return res.status(401).json({ message: "Not authenticated" });

      const idx = db.resumes.findIndex(
        (entry: any) => entry.id === req.params.id,
      );
      if (idx === -1)
        return res.status(404).json({ message: "Resume not found" });

      const removed = db.resumes[idx];
      db.resumes.splice(idx, 1);
      await supabaseStore.deleteResume(removed.id);

      const candidateIdx = db.candidates.findIndex(
        (entry: any) => entry.userId === removed.userId,
      );
      if (candidateIdx >= 0) {
        db.candidates[candidateIdx] = {
          ...db.candidates[candidateIdx],
          skills: JSON.stringify([]),
          parsedData: null,
          updatedAt: new Date(),
        };
        await supabaseStore.upsertCandidate(db.candidates[candidateIdx]);
      }

      await appendAdminLog(profile, "resume_deleted", "resume", removed.id, {
        userId: removed.userId,
        fileName: removed.fileName,
      });
      return res.json({ message: "Resume deleted" });
    },
  );
};

export const registerAdminMonitoringRoutes = (app: Application): void => {
  app.get(
    "/api/admin/applications/summary",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    (req, res) => {
      const days = toPositiveInt(req.query?.days, 30, 365);
      const summary = buildAdminApplicationSummary(days);
      res.json({ data: summary });
    },
  );

  app.get(
    "/api/admin/logs",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    (req, res) => {
      const { actionType, targetType } = req.query;
      const pagination = getPagination(req.query as any, {
        page: 1,
        limit: 30,
        maxLimit: 100,
      });

      let logs = [...db.adminLogs];
      if (actionType) {
        const normalized = String(actionType).toLowerCase();
        logs = logs.filter(
          (entry: any) =>
            String(entry.actionType || "").toLowerCase() === normalized,
        );
      }
      if (targetType) {
        const normalized = String(targetType).toLowerCase();
        logs = logs.filter(
          (entry: any) =>
            String(entry.targetType || "").toLowerCase() === normalized,
        );
      }

      logs.sort(
        (left: any, right: any) =>
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime(),
      );
      const paginated = paginateData(logs, pagination.page, pagination.limit);
      res.json({ data: paginated.data, meta: paginated.meta });
    },
  );

  // Admin routes: monitoring, moderation, user management, and audit-friendly operations.
  app.get(
    "/api/admin/monitoring",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    async (req: RequestWithAuth, res) => {
      const days = toPositiveInt(req.query?.days, 30, 365);
      const resumes = db.resumes.map((entry: any) =>
        buildResumeMonitoringRecord(entry),
      );
      const appSummary = buildAdminApplicationSummary(days);
      const platformHealth = await getPlatformHealthSnapshot();
      const averageResumeScore = Math.round(
        average(
          db.resumeScores
            .map((entry: any) => Number(entry.score || 0))
            .filter((entry: number) => Number.isFinite(entry) && entry > 0),
        ),
      );

      const totals = {
        totalUsers: db.profiles.length,
        totalStudents: db.profiles.filter((entry: any) =>
          roleMatches(entry.role, "student"),
        ).length,
        totalRecruiters: db.profiles.filter((entry: any) =>
          roleMatches(entry.role, "recruiter"),
        ).length,
        totalAdmins: db.profiles.filter((entry: any) =>
          roleMatches(entry.role, "admin"),
        ).length,
        totalResumes: db.resumes.length,
        totalJobs: db.jobs.length,
        recruiterAccessRequests: summarizeRecruiterAccessRequests(),
        activeJobs: db.jobs.filter((entry: any) => entry.status === "active")
          .length,
        closedJobs: db.jobs.filter((entry: any) => entry.status === "closed")
          .length,
        totalApplications: db.applications.length,
        averageResumeScore,
        averageMatchPercentage: appSummary.averageMatchPercentage,
        resumeMonitoring: {
          successfulParses: resumes.filter(
            (entry: any) => entry.parseStatus === "success",
          ).length,
          failedParses: resumes.filter(
            (entry: any) => entry.parseStatus === "failed",
          ).length,
          flaggedResumes: resumes.filter(
            (entry: any) => entry.moderationStatus === "flagged",
          ).length,
        },
        applicationSummary: appSummary,
        mostAppliedJob: appSummary.applicationsPerJob[0] || null,
        recentAdminActions: db.adminLogs.slice(0, 12),
        platformHealth,
      };

      res.json({ data: totals });
    },
  );
};
