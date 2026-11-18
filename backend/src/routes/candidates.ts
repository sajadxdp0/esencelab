/** Candidate and application routes. */
import crypto from "crypto";
import type { Application } from "express";
import { roleMatches } from "../auth/roles";
import { getProfileFromAuth, requireAuth, requireRoles } from "../auth";
import { buildRecommendationExplanation } from "../careerEngine";
import { db, supabaseStore } from "../state";
import { appendAdminLog } from "../services/admin";
import { getLatestResumeScore } from "../services/career";
import { getMatchInsights } from "../services/matching";
import type { RequestWithAuth } from "../types";
import { getPagination, normalizeResumeParsedData, normalizeSkillList, paginateData, parseJsonArray, toHumanReadableImpact, toSkillList, toStorageApplicationStatus, withApplicationDetails } from "../utils";

export const registerCandidateRoutes = (app: Application): void => {
  // Candidates Routes
  app.get("/api/candidates", (req, res) => {
    const profile = getProfileFromAuth(req);
    if (!profile) return res.status(401).json({ message: "Not authenticated" });
    if (
      !(
        roleMatches(profile.role, "recruiter") ||
        roleMatches(profile.role, "admin")
      )
    )
      return res.status(403).json({ message: "Not authorized" });

    const visibleCandidateUserIds = roleMatches(profile.role, "recruiter")
      ? new Set(
          db.applications
            .filter((application: any) => {
              const job = db.jobs.find(
                (entry: any) => entry.id === application.jobId,
              );
              return job?.employerId === profile.id;
            })
            .map((application: any) => application.candidateId),
        )
      : null;

    const candidates = db.candidates
      .filter(
        (candidate: any) =>
          !visibleCandidateUserIds ||
          visibleCandidateUserIds.has(candidate.userId),
      )
      .map((candidate: any) => ({
        ...candidate,
        skills: normalizeSkillList(candidate.skills),
        education: parseJsonArray(candidate.education),
        experience: parseJsonArray(candidate.experience),
      }));

    res.json({ data: candidates });
  });

  app.get("/api/candidates/:id", async (req, res) => {
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

    const candidate =
      db.candidates.find(
        (c: any) => c.id === req.params.id || c.userId === req.params.id,
      ) ||
      (() => {
        const fallbackProfile = db.profiles.find(
          (entry: any) =>
            entry.id === req.params.id && roleMatches(entry.role, "student"),
        );
        if (!fallbackProfile) return null;

        const resume =
          db.resumes.find((entry: any) => entry.userId === fallbackProfile.id) ||
          null;
        const parsedData = normalizeResumeParsedData(
          resume?.parsedData || {},
          fallbackProfile,
        );

        return {
          id: fallbackProfile.id,
          userId: fallbackProfile.id,
          name: fallbackProfile.name,
          email: fallbackProfile.email,
          role: "Student",
          skills: JSON.stringify(parsedData.skills || []),
          education: JSON.stringify(parsedData.education || []),
          experience: JSON.stringify(parsedData.experience || []),
          parsedData,
          createdAt: fallbackProfile.createdAt,
          updatedAt: fallbackProfile.updatedAt || fallbackProfile.createdAt,
        };
      })();
    if (!candidate)
      return res.status(404).json({ message: "Candidate not found" });
    const selectedJobId = String(req.query?.jobId || "").trim();
    const selectedJob = selectedJobId
      ? db.jobs.find((entry: any) => entry.id === selectedJobId)
      : null;

    if (roleMatches(profile.role, "recruiter")) {
      const myJobIds = db.jobs
        .filter((entry: any) => entry.employerId === profile.id)
        .map((entry: any) => entry.id);
      if (selectedJob && !myJobIds.includes(selectedJob.id)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const hasCandidateRelationship = db.applications.some(
        (entry: any) =>
          entry.candidateId === candidate.userId &&
          myJobIds.includes(entry.jobId),
      );
      if (!hasCandidateRelationship) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    const latestResumeScore = getLatestResumeScore(candidate.userId);
    const resume =
      db.resumes.find((entry: any) => entry.userId === candidate.userId) || null;
    const parsedSkills = normalizeSkillList(candidate.skills);
    const parsedEducation = (() => {
      return parseJsonArray(candidate.education);
    })();
    const parsedExperience = (() => {
      return parseJsonArray(candidate.experience);
    })();
    const parsedProjects = Array.isArray(resume?.parsedData?.projects)
      ? resume?.parsedData?.projects
      : [];

    let matchBreakdown = null as any;
    if (selectedJob) {
      const match = await getMatchInsights(parsedSkills, selectedJob);
      const explanationMeta = buildRecommendationExplanation(
        parsedSkills,
        toSkillList(
          selectedJob.skills?.length
            ? selectedJob.skills
            : selectedJob.requirements,
        ),
      );
      const improvementSuggestions = (
        explanationMeta.improvementImpacts || []
      ).map((entry) => {
        return `Learning ${entry.skill} can increase fit by about ${toHumanReadableImpact(entry.impact)}%.`;
      });
      matchBreakdown = {
        jobId: selectedJob.id,
        title: selectedJob.title,
        matchScore: match.matchScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        explanation: match.explanation,
        improvementSuggestions,
      };
    }

    res.json({
      data: {
        ...candidate,
        skills: parsedSkills,
        education: parsedEducation,
        experience: parsedExperience,
        projects: parsedProjects,
        parsedData: resume?.parsedData || candidate?.parsedData || null,
        latestResumeScore,
        matchBreakdown,
        resume,
      },
    });
  });

  app.post(
    "/api/candidates",
    requireAuth,
    requireRoles("admin"),
    async (req, res) => {
      const userId = String(req.body?.userId || "").trim();
      const profile = db.profiles.find((entry: any) => entry.id === userId);
      if (!profile || !roleMatches(profile.role, "student")) {
        return res
          .status(400)
          .json({ message: "A valid student userId is required" });
      }
      if (db.candidates.some((entry: any) => entry.userId === userId)) {
        return res
          .status(409)
          .json({ message: "Candidate already exists for this user" });
      }

      const candidate = {
        id: crypto.randomUUID(),
        userId,
        name: String(req.body?.name || profile.name || "").trim(),
        email: String(req.body?.email || profile.email || "")
          .trim()
          .toLowerCase(),
        role: String(req.body?.role || "Student").trim() || "Student",
        skills: JSON.stringify(normalizeSkillList(req.body?.skills || [])),
        education: JSON.stringify(
          Array.isArray(req.body?.education) ? req.body.education : [],
        ),
        experience: JSON.stringify(
          Array.isArray(req.body?.experience) ? req.body.experience : [],
        ),
        parsedData:
          req.body?.parsedData && typeof req.body.parsedData === "object"
            ? req.body.parsedData
            : null,
        status: "new",
        matchScore: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await supabaseStore.upsertCandidate(candidate);
      db.candidates.push(candidate);
      res.status(201).json({ data: candidate });
    },
  );

  app.put(
    "/api/candidates/:id",
    requireAuth,
    requireRoles("admin"),
    async (req, res) => {
      const idx = db.candidates.findIndex((c: any) => c.id === req.params.id);
      if (idx === -1)
        return res.status(404).json({ message: "Candidate not found" });

      const current = db.candidates[idx];
      const updates: Record<string, any> = {};
      if (typeof req.body?.name === "string") updates.name = req.body.name.trim();
      if (typeof req.body?.email === "string")
        updates.email = req.body.email.trim().toLowerCase();
      if (typeof req.body?.role === "string")
        updates.role = req.body.role.trim() || current.role;
      if (req.body?.skills !== undefined)
        updates.skills = JSON.stringify(normalizeSkillList(req.body.skills));
      if (Array.isArray(req.body?.education))
        updates.education = JSON.stringify(req.body.education);
      if (Array.isArray(req.body?.experience))
        updates.experience = JSON.stringify(req.body.experience);
      if (req.body?.parsedData && typeof req.body.parsedData === "object")
        updates.parsedData = req.body.parsedData;
      if (
        ["new", "screening", "interview", "hired", "rejected"].includes(
          req.body?.status,
        )
      ) {
        updates.status = req.body.status;
      }

      const nextCandidate = {
        ...current,
        ...updates,
        userId: current.userId,
        updatedAt: new Date(),
      };
      await supabaseStore.upsertCandidate(nextCandidate);
      db.candidates[idx] = nextCandidate;
      res.json({ data: db.candidates[idx] });
    },
  );
};

export const registerApplicationRoutes = (app: Application): void => {
  // Applications Routes
  app.get("/api/applications", (req, res) => {
    const profile = getProfileFromAuth(req);
    if (!profile) return res.status(401).json({ message: "Not authenticated" });
    if (
      !(
        roleMatches(profile.role, "recruiter") ||
        roleMatches(profile.role, "admin")
      )
    )
      return res.status(403).json({ message: "Not authorized" });

    const { status, jobId, studentId } = req.query;
    const pagination = getPagination(req.query as any, {
      page: 1,
      limit: 25,
      maxLimit: 100,
    });
    let applications = [...db.applications];

    if (roleMatches(profile.role, "recruiter")) {
      const myJobIds = db.jobs
        .filter((job: any) => job.employerId === profile.id)
        .map((job: any) => job.id);
      applications = applications.filter((entry: any) =>
        myJobIds.includes(entry.jobId),
      );
    }

    if (status) {
      applications = applications.filter((entry: any) => entry.status === status);
    }
    if (jobId) {
      applications = applications.filter(
        (entry: any) => entry.jobId === String(jobId),
      );
    }
    if (studentId && roleMatches(profile.role, "admin")) {
      applications = applications.filter(
        (entry: any) => entry.candidateId === String(studentId),
      );
    }

    applications.sort(
      (a: any, b: any) =>
        new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
    );
    const detailed = withApplicationDetails(applications);
    const paginated = paginateData(detailed, pagination.page, pagination.limit);
    res.json({ data: paginated.data, meta: paginated.meta });
  });

  app.get("/api/applications/my", (req, res) => {
    const profile = getProfileFromAuth(req);
    if (!profile) return res.status(401).json({ message: "Not authenticated" });

    const myApps = db.applications
      .filter((a: any) => a.candidateId === profile.id)
      .sort(
        (a: any, b: any) =>
          new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
      );

    res.json({ data: withApplicationDetails(myApps) });
  });

  app.post(
    "/api/applications",
    requireAuth,
    requireRoles("student"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "student")
        return res.status(403).json({ message: "Not authorized" });

      const { jobId, notes } = req.body;
      if (!jobId) return res.status(400).json({ message: "jobId is required" });

      const existing = db.applications.find(
        (a: any) => a.jobId === jobId && a.candidateId === profile.id,
      );
      if (existing) return res.status(400).json({ message: "Already applied" });

      const job = db.jobs.find((j: any) => j.id === jobId);
      if (!job || job.status !== "active")
        return res.status(404).json({ message: "Job not found or inactive" });

      const candidate = db.candidates.find((c: any) => c.userId === profile.id);

      let matchScore = 0;
      let matchedSkills: string[] = [];
      let missingSkills: string[] = [];
      let explanation: string | null = null;
      if (job && candidate) {
        const candidateSkills = toSkillList(candidate.skills);
        const insights = await getMatchInsights(candidateSkills, job);
        matchScore = insights.matchScore;
        matchedSkills = insights.matchedSkills;
        missingSkills = insights.missingSkills;
        explanation = insights.explanation;
      }

      const application = {
        id: crypto.randomUUID(),
        jobId,
        candidateId: profile.id,
        status: "pending",
        matchScore,
        matchedSkills,
        missingSkills,
        explanation,
        notes: notes ? String(notes) : "",
        appliedAt: new Date(),
        updatedAt: new Date(),
      };
      db.applications.push(application);
      await supabaseStore.upsertApplication(application);
      res.status(201).json({ data: withApplicationDetails([application])[0] });
    },
  );

  app.put(
    "/api/applications/:id/status",
    requireAuth,
    requireRoles("recruiter", "admin"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (
        !(
          roleMatches(profile.role, "recruiter") ||
          roleMatches(profile.role, "admin")
        )
      )
        return res.status(403).json({ message: "Not authorized" });

      const idx = db.applications.findIndex((a: any) => a.id === req.params.id);
      if (idx === -1)
        return res.status(404).json({ message: "Application not found" });

      const { status, notes } = req.body;
      if (
        ![
          "pending",
          "shortlisted",
          "interview",
          "rejected",
          "applied",
          "interviewing",
          "offer",
        ].includes(status)
      ) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const record = db.applications[idx];
      const job = db.jobs.find((entry: any) => entry.id === record.jobId);
      if (
        roleMatches(profile.role, "recruiter") &&
        (!job || job.employerId !== profile.id)
      ) {
        return res.status(403).json({ message: "Not authorized" });
      }

      db.applications[idx] = {
        ...record,
        status: toStorageApplicationStatus(status),
        notes: typeof notes === "string" ? notes : record.notes || "",
        updatedAt: new Date(),
      };
      await supabaseStore.upsertApplication(db.applications[idx]);
      if (roleMatches(profile.role, "admin")) {
        await appendAdminLog(
          profile,
          "application_status_updated",
          "application",
          db.applications[idx].id,
          {
            from: record.status,
            to: db.applications[idx].status,
          },
        );
      }
      res.json({ data: withApplicationDetails([db.applications[idx]])[0] });
    },
  );
};
