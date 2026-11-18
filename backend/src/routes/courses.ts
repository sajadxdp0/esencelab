/** Course catalog, dashboard summary and health routes. */
import crypto from "crypto";
import type { Application } from "express";
import { roleMatches } from "../auth/roles";
import { getProfileFromAuth, requireAuth, requireRoles } from "../auth";
import { adminLimiter } from "../middleware";
import { isShuttingDown } from "../runtime";
import { db, supabaseStore } from "../state";
import { getPlatformHealthSnapshot } from "../services/admin";
import type { RequestWithAuth } from "../types";

export const registerCourseRoutes = (app: Application): void => {
  // Courses Routes
  app.get("/api/courses", (_req, res) => {
    const courses = [...db.courses].sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    res.json({ data: courses });
  });

  app.get("/api/courses/:id", (req, res) => {
    const course = db.courses.find((c: any) => c.id === req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json({ data: course });
  });

  app.post(
    "/api/courses",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "admin")
        return res.status(403).json({ message: "Not authorized" });

      const { title, description, provider, url } = req.body;
      if (!title || !description || !provider || !url) {
        return res
          .status(400)
          .json({ message: "title, description, provider and url are required" });
      }

      const course = {
        ...req.body,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      db.courses.push(course);
      await supabaseStore.upsertCourse(course);
      res.status(201).json({ data: course });
    },
  );

  app.put(
    "/api/courses/:id",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "admin")
        return res.status(403).json({ message: "Not authorized" });

      const idx = db.courses.findIndex(
        (entry: any) => entry.id === req.params.id,
      );
      if (idx === -1)
        return res.status(404).json({ message: "Course not found" });

      db.courses[idx] = {
        ...db.courses[idx],
        ...req.body,
        updatedAt: new Date(),
      };
      await supabaseStore.upsertCourse(db.courses[idx]);
      res.json({ data: db.courses[idx] });
    },
  );

  app.delete(
    "/api/courses/:id",
    requireAuth,
    requireRoles("admin"),
    adminLimiter,
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "admin")
        return res.status(403).json({ message: "Not authorized" });

      const idx = db.courses.findIndex(
        (entry: any) => entry.id === req.params.id,
      );
      if (idx === -1)
        return res.status(404).json({ message: "Course not found" });

      db.courses.splice(idx, 1);
      await supabaseStore.deleteCourse(req.params.id);
      res.json({ message: "Course deleted" });
    },
  );
};

export const registerDashboardRoutes = (app: Application): void => {
  // Dashboard Stats
  // Shared dashboard summary route used to render role-specific top-line metrics.
  app.get("/api/dashboard/stats", (req, res) => {
    const profile = getProfileFromAuth(req);
    if (!profile) return res.json({ data: {} });

    if (profile.role === "student") {
      const myApps = db.applications.filter(
        (a: any) => a.candidateId === profile.id,
      );
      res.json({
        data: {
          myApplications: myApps.length,
          shortlisted: myApps.filter((a: any) => a.status === "shortlisted")
            .length,
          interviews: myApps.filter((a: any) => a.status === "interview").length,
          pending: myApps.filter((a: any) => a.status === "pending").length,
        },
      });
    } else if (roleMatches(profile.role, "recruiter")) {
      const myJobs = db.jobs.filter((j: any) => j.employerId === profile.id);
      const myApps = db.applications.filter((a: any) =>
        myJobs.some((j: any) => j.id === a.jobId),
      );
      res.json({
        data: {
          postedJobs: myJobs.length,
          totalApplications: myApps.length,
          interviewsScheduled: myApps.filter((a: any) => a.status === "interview")
            .length,
          shortlisted: myApps.filter((a: any) => a.status === "shortlisted")
            .length,
        },
      });
    } else {
      res.json({
        data: {
          totalUsers: db.profiles.length,
          totalJobs: db.jobs.length,
          totalApplications: db.applications.length,
          totalCandidates: db.candidates.length,
          totalCourses: db.courses.length,
          totalResumes: db.resumes.length,
        },
      });
    }
  });
};

export const registerHealthRoutes = (app: Application): void => {
  // Health check
  app.get("/api/health", async (_req, res) => {
    const platformHealth = await getPlatformHealthSnapshot();
    res.json({
      status: isShuttingDown ? "degraded" : "ok",
      message: "Backend API is running",
      dataProvider: "supabase",
      uptimeSeconds: platformHealth.uptimeSeconds,
      requestsPerMinute: platformHealth.requestsPerMinute,
      latencyPercentilesMs: platformHealth.latencyPercentilesMs,
      aiService: platformHealth.aiService,
    });
  });
};
