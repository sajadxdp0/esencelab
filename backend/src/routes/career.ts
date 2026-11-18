/** Student career-growth routes. */
import crypto from "crypto";
import type { Application } from "express";
import { getProfileFromAuth, requireAuth, requireRoles } from "../auth";
import { CAREER_ROLES, deriveProgressDelta, generateLearningPlan, generateMockInterview, generateWeeklyPlanner, getRoleExplorerData, type SkillStatus } from "../careerEngine";
import { expensiveOperationLimiter } from "../middleware";
import { db, supabaseStore } from "../state";
import { callStudentAICoach, ensureResumeScoreHistory, getCareerPreference, getStudentRoadmap, setCareerPreference } from "../services/career";
import type { RequestWithAuth } from "../types";
import { normalizeSkillList, toSkillList, toTrackerApplicationStatus } from "../utils";

export const registerCareerRoutes = (app: Application): void => {
  // Career Growth Routes (student-focused)
  app.get("/api/career/roles", (_req, res) => {
    res.json({ data: getRoleExplorerData() });
  });

  app.post(
    "/api/career/target-role",
    requireAuth,
    requireRoles("student"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "student")
        return res.status(403).json({ message: "Not authorized" });

      const requestedRoleId = String(req.body?.roleId || "");
      const preference = setCareerPreference(profile.id, requestedRoleId);
      await supabaseStore.upsertCareerPreference(preference);
      res.json({ data: { roleId: preference.roleId } });
    },
  );

  // Student career routes: overview, roadmap, AI coach, learning plan, and progress tools.
  app.get("/api/career/overview", async (req, res) => {
    const profile = getProfileFromAuth(req);
    if (!profile) return res.status(401).json({ message: "Not authenticated" });
    if (profile.role !== "student")
      return res.status(403).json({ message: "Not authorized" });

    const roleId = getCareerPreference(profile.id);
    const role =
      CAREER_ROLES.find((entry) => entry.id === roleId) || CAREER_ROLES[0];
    await ensureResumeScoreHistory(profile.id);

    const history = db.resumeScores
      .filter((entry: any) => entry.userId === profile.id)
      .sort(
        (left: any, right: any) =>
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime(),
      )
      .slice(-12);
    const latestScore = history[history.length - 1] || null;

    const roadmap = getStudentRoadmap(profile.id, roleId);
    const completedSkills = roadmap.filter(
      (entry) => entry.status === "completed",
    ).length;
    const inProgressSkills = roadmap.filter(
      (entry) => entry.status === "in_progress",
    ).length;

    const myApplications = db.applications
      .filter((entry: any) => entry.candidateId === profile.id)
      .sort(
        (left: any, right: any) =>
          new Date(left.appliedAt).getTime() -
          new Date(right.appliedAt).getTime(),
      );
    const mySavedJobs = db.savedJobs.filter(
      (entry: any) => entry.userId === profile.id,
    );
    const applicationStatusCounts = myApplications.reduce(
      (acc: any, entry: any) => {
        const trackerStatus = toTrackerApplicationStatus(entry.status);
        acc[trackerStatus] += 1;
        return acc;
      },
      {
        saved: mySavedJobs.length,
        applied: 0,
        interviewing: 0,
        offer: 0,
        rejected: 0,
      },
    );
    const appProgress =
      myApplications.length >= 2
        ? Math.max(
            0,
            Math.round(
              (myApplications[myApplications.length - 1].matchScore || 0) -
                (myApplications[0].matchScore || 0),
            ),
          )
        : 0;

    const weeklyPlanner = generateWeeklyPlanner(roadmap);
    const missingSkills = roadmap
      .filter((entry) => entry.status !== "completed")
      .map((entry) => entry.skill)
      .slice(0, 3);

    res.json({
      data: {
        roleId,
        role,
        latestScore,
        scoreHistory: history,
        roadmap,
        weeklyPlanner,
        progress: {
          resumeImprovement: deriveProgressDelta(
            history.map((entry: any) => ({
              score: Number(entry.score || 0),
              createdAt: new Date(entry.createdAt),
            })),
          ),
          skillsCompleted: completedSkills,
          skillsInProgress: inProgressSkills,
          totalSkills: roadmap.length,
          jobsMatchedImprovement: appProgress,
        },
        applicationStatusCounts,
        missingSkills,
      },
    });
  });

  app.get("/api/career/roadmap", (req, res) => {
    const profile = getProfileFromAuth(req);
    if (!profile) return res.status(401).json({ message: "Not authenticated" });
    if (profile.role !== "student")
      return res.status(403).json({ message: "Not authorized" });

    const roleId = String(req.query.roleId || getCareerPreference(profile.id));
    const roadmap = getStudentRoadmap(profile.id, roleId);
    const role =
      CAREER_ROLES.find((entry) => entry.id === roleId) || CAREER_ROLES[0];
    res.json({ data: { role, roadmap } });
  });

  app.post(
    "/api/career/ai-coach",
    requireAuth,
    requireRoles("student"),
    expensiveOperationLimiter,
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "student")
        return res.status(403).json({ message: "Not authorized" });

      const feature = String(req.body?.feature || "skill_gap")
        .trim()
        .toLowerCase();
      const supported = new Set([
        "skill_gap",
        "resume_improvement",
        "interview_prep",
        "project_ideas",
        "study_plan",
      ]);
      const safeFeature = supported.has(feature) ? feature : "skill_gap";
      const prompt = String(req.body?.prompt || "")
        .trim()
        .slice(0, 1200);

      const roleId = getCareerPreference(profile.id);
      const role =
        CAREER_ROLES.find((entry) => entry.id === roleId) || CAREER_ROLES[0];
      const resume =
        db.resumes.find((entry: any) => entry.userId === profile.id) || null;
      const latestScore = await ensureResumeScoreHistory(profile.id);
      const roadmap = getStudentRoadmap(profile.id, roleId);
      const roadmapHighlights = roadmap
        .map((entry) => `${entry.skill} (${entry.status.replace("_", " ")})`)
        .slice(0, 8);
      const missingSkills = roadmap
        .filter((entry) => entry.status !== "completed")
        .map((entry) => entry.skill)
        .slice(0, 8);
      const skills = normalizeSkillList([
        ...toSkillList(resume?.skills || []),
        ...toSkillList(resume?.parsedData?.skills || []),
      ]).slice(0, 30);
      const resumeSummary = String(resume?.parsedData?.summary || "").trim();
      const studentApplications = db.applications.filter(
        (entry: any) => entry.candidateId === profile.id,
      );
      const studentSavedJobs = db.savedJobs.filter(
        (entry: any) => entry.userId === profile.id,
      );
      const applicationStatusCounts = studentApplications.reduce(
        (acc: Record<string, number>, entry: any) => {
          const trackerStatus = toTrackerApplicationStatus(entry.status);
          acc[trackerStatus] = (acc[trackerStatus] || 0) + 1;
          return acc;
        },
        {
          saved: studentSavedJobs.length,
          applied: 0,
          interviewing: 0,
          offer: 0,
          rejected: 0,
        },
      );
      const topRecommendedJobs = db.recommendations
        .filter((entry: any) => entry.userId === profile.id)
        .sort(
          (left: any, right: any) =>
            Number(right.matchScore || 0) - Number(left.matchScore || 0),
        )
        .slice(0, 3)
        .map((entry: any) => {
          const job = db.jobs.find((jobItem: any) => jobItem.id === entry.jobId);
          return {
            title: job?.title || "Recommended role",
            company: job?.company || "Unknown company",
            matchScore: Math.round(Number(entry.matchScore || 0)),
          };
        });
      const topResources = generateLearningPlan(roleId, roadmap, 30)
        .weeks.flatMap((week) => week.resources || [])
        .slice(0, 3)
        .map((resource) => ({
          title: resource.title,
          provider: resource.provider,
          url: resource.url,
        }));

      const aiPayload = {
        feature: safeFeature,
        prompt,
        context: {
          targetRole: role.name,
          skills,
          missingSkills,
          resumeSummary,
          readinessScore: latestScore?.score || 0,
          roadmapHighlights,
          scoreSections: latestScore?.sectionScores || {},
          applicationStatusCounts,
          topRecommendedJobs,
          topResources,
        },
      };
      const response = await callStudentAICoach(aiPayload);
      res.json({ data: response });
    },
  );

  app.put(
    "/api/career/roadmap/skill",
    requireAuth,
    requireRoles("student"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "student")
        return res.status(403).json({ message: "Not authorized" });

      const roleId = String(req.body?.roleId || getCareerPreference(profile.id));
      const skillName = String(req.body?.skillName || "").trim();
      const status = String(req.body?.status || "missing") as SkillStatus;
      if (!skillName)
        return res.status(400).json({ message: "skillName is required" });
      if (!["completed", "in_progress", "missing"].includes(status)) {
        return res.status(400).json({ message: "Invalid skill status" });
      }

      const idx = db.skillProgress.findIndex(
        (entry: any) =>
          entry.userId === profile.id &&
          entry.roleId === roleId &&
          String(entry.skillName).toLowerCase() === skillName.toLowerCase(),
      );
      const record = {
        id: idx >= 0 ? db.skillProgress[idx].id : crypto.randomUUID(),
        userId: profile.id,
        roleId,
        skillName,
        status,
        updatedAt: new Date(),
        createdAt: idx >= 0 ? db.skillProgress[idx].createdAt : new Date(),
      };
      if (idx >= 0) db.skillProgress[idx] = record;
      else db.skillProgress.push(record);
      await supabaseStore.upsertSkillProgress(record);

      const roadmap = getStudentRoadmap(profile.id, roleId);
      res.json({ data: { roadmap } });
    },
  );

  app.get("/api/career/learning-plan", async (req, res) => {
    const profile = getProfileFromAuth(req);
    if (!profile) return res.status(401).json({ message: "Not authenticated" });
    if (profile.role !== "student")
      return res.status(403).json({ message: "Not authorized" });

    const roleId = String(req.query.roleId || getCareerPreference(profile.id));
    const durationDays = Number(req.query.durationDays) === 60 ? 60 : 30;
    const existing = db.learningPlans
      .filter(
        (entry: any) =>
          entry.userId === profile.id &&
          entry.roleId === roleId &&
          Number(entry.durationDays) === durationDays,
      )
      .sort(
        (left: any, right: any) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      )[0];

    if (existing) {
      return res.json({ data: existing });
    }

    const roadmap = getStudentRoadmap(profile.id, roleId);
    const planData = generateLearningPlan(
      roleId,
      roadmap,
      durationDays as 30 | 60,
    );
    const record = {
      id: crypto.randomUUID(),
      userId: profile.id,
      roleId,
      durationDays,
      planData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.learningPlans.push(record);
    await supabaseStore.upsertLearningPlan(record);
    return res.json({ data: record });
  });

  app.post(
    "/api/career/learning-plan",
    requireAuth,
    requireRoles("student"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "student")
        return res.status(403).json({ message: "Not authorized" });

      const roleId = String(req.body?.roleId || getCareerPreference(profile.id));
      const durationDays = Number(req.body?.durationDays) === 60 ? 60 : 30;
      const roadmap = getStudentRoadmap(profile.id, roleId);
      const planData = generateLearningPlan(
        roleId,
        roadmap,
        durationDays as 30 | 60,
      );
      const idx = db.learningPlans.findIndex(
        (entry: any) =>
          entry.userId === profile.id &&
          entry.roleId === roleId &&
          Number(entry.durationDays) === durationDays,
      );
      const record = {
        id: idx >= 0 ? db.learningPlans[idx].id : crypto.randomUUID(),
        userId: profile.id,
        roleId,
        durationDays,
        planData,
        createdAt: idx >= 0 ? db.learningPlans[idx].createdAt : new Date(),
        updatedAt: new Date(),
      };
      if (idx >= 0) db.learningPlans[idx] = record;
      else db.learningPlans.push(record);
      await supabaseStore.upsertLearningPlan(record);
      res.json({ data: record });
    },
  );

  app.get("/api/career/mock-interview", (req, res) => {
    const profile = getProfileFromAuth(req);
    if (!profile) return res.status(401).json({ message: "Not authenticated" });
    if (profile.role !== "student")
      return res.status(403).json({ message: "Not authorized" });

    const roleId = String(req.query.roleId || getCareerPreference(profile.id));
    const pack = generateMockInterview(roleId);
    res.json({ data: pack });
  });

  app.post(
    "/api/career/mock-interview/session",
    requireAuth,
    requireRoles("student"),
    async (req: RequestWithAuth, res) => {
      const profile = getProfileFromAuth(req);
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (profile.role !== "student")
        return res.status(403).json({ message: "Not authorized" });

      const roleId = String(req.body?.roleId || getCareerPreference(profile.id));
      const question = String(req.body?.question || "").trim();
      const answer = String(req.body?.answer || "").trim();
      const rating = Number(req.body?.rating || 0);
      if (!question || !answer) {
        return res
          .status(400)
          .json({ message: "question and answer are required" });
      }

      const session = {
        id: crypto.randomUUID(),
        userId: profile.id,
        roleId,
        question,
        answer,
        rating: Number.isFinite(rating) ? rating : 0,
        createdAt: new Date(),
      };
      db.mockInterviewSessions.push(session);
      await supabaseStore.upsertMockInterviewSession(session);

      res.status(201).json({ data: session });
    },
  );

  app.get("/api/career/mock-interview/sessions", (req, res) => {
    const profile = getProfileFromAuth(req);
    if (!profile) return res.status(401).json({ message: "Not authenticated" });
    if (profile.role !== "student")
      return res.status(403).json({ message: "Not authorized" });

    const sessions = db.mockInterviewSessions
      .filter((entry: any) => entry.userId === profile.id)
      .sort(
        (left: any, right: any) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      )
      .slice(0, 30);
    res.json({ data: sessions });
  });
};
