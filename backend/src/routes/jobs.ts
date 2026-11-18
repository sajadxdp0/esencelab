/** Job listing CRUD routes for recruiters and admins. */
import crypto from "crypto";
import type { Application } from "express";
import { roleMatches } from "../auth/roles";
import { getProfileFromAuth, requireAuth, requireRoles } from "../auth";
import { db, supabaseStore } from "../state";
import { appendAdminLog } from "../services/admin";
import type { RequestWithAuth } from "../types";
import { getPagination, normalizeSkillList, paginateData, toPositiveInt } from "../utils";

export const registerJobRoutes = (app: Application): void => {
  // Jobs Routes
  // Job and application routes used by students and recruiters.
  app.get("/api/jobs", (req, res) => {
    const { search, jobType, location, status, limit, my, recruiterId, page } =
      req.query;
    let jobs = [...db.jobs];
    const profile = getProfileFromAuth(req);

    if (search) {
      const s = (search as string).toLowerCase();
      jobs = jobs.filter(
        (j: any) =>
          j.title.toLowerCase().includes(s) ||
          j.company.toLowerCase().includes(s) ||
          j.description.toLowerCase().includes(s),
      );
    }
    if (jobType) jobs = jobs.filter((j: any) => j.jobType === jobType);
    if (location)
      jobs = jobs.filter((j: any) =>
        j.location.toLowerCase().includes((location as string).toLowerCase()),
      );
    if (status && status !== "all")
      jobs = jobs.filter((j: any) => j.status === status);
    else if (!status) jobs = jobs.filter((j: any) => j.status === "active");

    if (my === "true") {
      if (profile && roleMatches(profile.role, "recruiter")) {
        jobs = jobs.filter((j: any) => j.employerId === profile.id);
      }
    }

    if (recruiterId && profile && roleMatches(profile.role, "admin")) {
      jobs = jobs.filter((j: any) => j.employerId === String(recruiterId));
    }

    jobs.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const hasPage =
      page !== undefined && page !== null && String(page).trim() !== "";
    if (hasPage) {
      const pagination = getPagination(req.query as any, {
        page: 1,
        limit: 20,
        maxLimit: 100,
      });
      const paginated = paginateData(jobs, pagination.page, pagination.limit);
      return res.json({
        data: { jobs: paginated.data },
        meta: paginated.meta,
      });
    }

    if (limit) {
      const n = toPositiveInt(limit, jobs.length, 1000);
      jobs = jobs.slice(0, n);
    }

    res.json({
      data: { jobs },
      meta: {
        page: 1,
        limit: jobs.length,
        total: jobs.length,
        totalPages: jobs.length > 0 ? 1 : 0,
      },
    });
  });

  app.get("/api/jobs/:id", (req, res) => {
    const job = db.jobs.find((j: any) => j.id === req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ data: job });
  });

  app.post(
    "/api/jobs",
    requireAuth,
    requireRoles("recruiter", "admin"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (
        !profile ||
        !(
          roleMatches(profile.role, "recruiter") ||
          roleMatches(profile.role, "admin")
        )
      ) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const title = String(req.body?.title || "").trim();
      const company = String(req.body?.company || "").trim();
      const description = String(req.body?.description || "").trim();
      const location = String(req.body?.location || "").trim();
      const experienceLevel = String(req.body?.experienceLevel || "mid")
        .trim()
        .toLowerCase();

      const requirements = Array.isArray(req.body.requirements)
        ? normalizeSkillList(req.body.requirements)
        : String(req.body.requirements || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
      const skills = normalizeSkillList(
        Array.isArray(req.body.skills) && req.body.skills.length > 0
          ? req.body.skills
          : requirements,
      );
      if (
        !title ||
        !company ||
        !description ||
        !location ||
        skills.length === 0
      ) {
        return res.status(400).json({
          message:
            "title, company, location, description, and required skills are required",
        });
      }

      const safeJobType = [
        "full_time",
        "part_time",
        "internship",
        "contract",
      ].includes(req.body.jobType)
        ? req.body.jobType
        : "full_time";
      const safeStatus = ["active", "closed"].includes(req.body.status)
        ? req.body.status
        : "active";
      const safeExperienceLevel = [
        "entry",
        "junior",
        "mid",
        "senior",
        "lead",
      ].includes(experienceLevel)
        ? experienceLevel
        : "mid";

      const job = {
        ...req.body,
        title,
        company,
        description,
        location,
        id: crypto.randomUUID(),
        employerId: profile.id,
        requirements,
        skills,
        experienceLevel: safeExperienceLevel,
        jobType: safeJobType,
        status: safeStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await supabaseStore.upsertJob(job);
      db.jobs.push(job);
      if (roleMatches(profile.role, "admin")) {
        await appendAdminLog(profile, "job_created", "job", job.id, {
          title: job.title,
          recruiterId: job.employerId,
        });
      }
      res.status(201).json({ data: job });
    },
  );

  app.put(
    "/api/jobs/:id",
    requireAuth,
    requireRoles("recruiter", "admin"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });

      const idx = db.jobs.findIndex((j: any) => j.id === req.params.id);
      if (idx === -1) return res.status(404).json({ message: "Job not found" });

      const current = db.jobs[idx];
      if (
        !roleMatches(profile.role, "admin") &&
        current.employerId !== profile.id
      ) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const title =
        req.body?.title !== undefined
          ? String(req.body.title).trim()
          : String(current.title || "").trim();
      const company =
        req.body?.company !== undefined
          ? String(req.body.company).trim()
          : String(current.company || "").trim();
      const description =
        req.body?.description !== undefined
          ? String(req.body.description).trim()
          : String(current.description || "").trim();
      const location =
        req.body?.location !== undefined
          ? String(req.body.location).trim()
          : String(current.location || "");
      const requestedRequirements =
        req.body?.requirements !== undefined
          ? req.body.requirements
          : current.requirements;
      const requirements = normalizeSkillList(requestedRequirements);
      const requestedSkills =
        req.body?.skills !== undefined ? req.body.skills : current.skills;
      const skills = normalizeSkillList(
        Array.isArray(requestedSkills) ? requestedSkills : requirements,
      );

      if (
        !title ||
        !company ||
        !description ||
        !location ||
        skills.length === 0
      ) {
        return res.status(400).json({
          message:
            "title, company, location, description, and required skills are required",
        });
      }

      const requestedExperienceLevel =
        req.body?.experienceLevel !== undefined
          ? String(req.body.experienceLevel).trim().toLowerCase()
          : String(current.experienceLevel || "mid")
              .trim()
              .toLowerCase();
      const safeExperienceLevel = [
        "entry",
        "junior",
        "mid",
        "senior",
        "lead",
      ].includes(requestedExperienceLevel)
        ? requestedExperienceLevel
        : "mid";
      const requestedJobType =
        req.body?.jobType !== undefined
          ? String(req.body.jobType)
          : current.jobType;
      const safeJobType = [
        "full_time",
        "part_time",
        "internship",
        "contract",
      ].includes(requestedJobType)
        ? requestedJobType
        : "full_time";
      const requestedStatus =
        req.body?.status !== undefined ? String(req.body.status) : current.status;
      const safeStatus = ["active", "closed"].includes(requestedStatus)
        ? requestedStatus
        : "active";
      const salaryMin =
        req.body?.salaryMin !== undefined &&
        req.body?.salaryMin !== null &&
        req.body?.salaryMin !== ""
          ? Number(req.body.salaryMin)
          : (current.salaryMin ?? null);
      const salaryMax =
        req.body?.salaryMax !== undefined &&
        req.body?.salaryMax !== null &&
        req.body?.salaryMax !== ""
          ? Number(req.body.salaryMax)
          : (current.salaryMax ?? null);

      const nextJob = {
        ...current,
        title,
        company,
        description,
        location,
        requirements,
        skills,
        experienceLevel: safeExperienceLevel,
        jobType: safeJobType,
        status: safeStatus,
        salaryMin: Number.isFinite(salaryMin) ? salaryMin : null,
        salaryMax: Number.isFinite(salaryMax) ? salaryMax : null,
        employerId: current.employerId,
        updatedAt: new Date(),
      };
      await supabaseStore.upsertJob(nextJob);
      db.jobs[idx] = nextJob;
      if (roleMatches(profile.role, "admin")) {
        await appendAdminLog(profile, "job_updated", "job", db.jobs[idx].id, {
          title: db.jobs[idx].title,
          status: db.jobs[idx].status,
        });
      }
      res.json({ data: db.jobs[idx] });
    },
  );

  app.delete(
    "/api/jobs/:id",
    requireAuth,
    requireRoles("recruiter", "admin"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });

      const idx = db.jobs.findIndex((j: any) => j.id === req.params.id);
      if (idx === -1) return res.status(404).json({ message: "Job not found" });

      if (
        !roleMatches(profile.role, "admin") &&
        db.jobs[idx].employerId !== profile.id
      ) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const removedJob = db.jobs[idx];
      const removedApplications = db.applications.filter(
        (entry: any) => entry.jobId === req.params.id,
      ).length;
      db.jobs.splice(idx, 1);
      db.applications = db.applications.filter(
        (entry: any) => entry.jobId !== req.params.id,
      );
      await supabaseStore.deleteJob(req.params.id);
      await supabaseStore.deleteApplicationsByJob(req.params.id);
      if (roleMatches(profile.role, "admin")) {
        await appendAdminLog(profile, "job_deleted", "job", req.params.id, {
          title: removedJob?.title || "",
          removedApplications,
        });
      }
      res.json({ message: "Job deleted" });
    },
  );
};
