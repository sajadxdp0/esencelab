/** Career preferences, resume scoring history and the AI coach wrapper. */
import {
  CAREER_ROLES,
  buildRoadmap,
  calculateResumeStrength,
  type SkillStatus,
} from "../careerEngine";
import {
  AI_REQUEST_TIMEOUT_MS,
  AI_SERVICE_URL,
  buildAiServiceHeaders,
} from "../config";
import { db, supabaseStore } from "../state";
import { normalizeSkillList, toSkillList } from "../utils";

export const getCareerPreference = (userId: string) => {
  const preference = db.careerPreferences.find(
    (entry: any) => entry.userId === userId,
  );
  const roleId = preference?.roleId || CAREER_ROLES[0].id;
  return CAREER_ROLES.some((entry) => entry.id === roleId)
    ? roleId
    : CAREER_ROLES[0].id;
};

export const setCareerPreference = (userId: string, roleId: string) => {
  const safeRoleId = CAREER_ROLES.some((entry) => entry.id === roleId)
    ? roleId
    : CAREER_ROLES[0].id;
  const idx = db.careerPreferences.findIndex(
    (entry: any) => entry.userId === userId,
  );
  const record = {
    userId,
    roleId: safeRoleId,
    updatedAt: new Date(),
  };
  if (idx >= 0) db.careerPreferences[idx] = record;
  else db.careerPreferences.push(record);
  return record;
};

export const getStudentResumeSkills = (userId: string) => {
  const candidate = db.candidates.find((entry: any) => entry.userId === userId);
  const resume = db.resumes.find((entry: any) => entry.userId === userId);
  return Array.from(
    new Set([
      ...toSkillList(candidate?.skills),
      ...toSkillList(resume?.skills),
      ...toSkillList(resume?.parsedData?.skills),
    ]),
  );
};

export const getStudentRoadmap = (userId: string, roleId?: string) => {
  const safeRoleId = roleId || getCareerPreference(userId);
  const resumeSkills = getStudentResumeSkills(userId);
  const records = db.skillProgress
    .filter(
      (entry: any) => entry.userId === userId && entry.roleId === safeRoleId,
    )
    .map((entry: any) => ({
      skillName: String(entry.skillName),
      status: entry.status as SkillStatus,
    }));
  return buildRoadmap(safeRoleId, resumeSkills, records);
};

export const getLatestResumeScore = (userId: string) => {
  const history = db.resumeScores
    .filter((entry: any) => entry.userId === userId)
    .sort(
      (left: any, right: any) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  return history[0] || null;
};

export const ensureResumeScoreHistory = async (userId: string) => {
  const resume = db.resumes.find((entry: any) => entry.userId === userId);
  if (!resume) return null;

  const roleId = getCareerPreference(userId);
  const latest = getLatestResumeScore(userId);
  const resumeUpdatedAt = new Date(
    resume.updatedAt || resume.createdAt || Date.now(),
  );
  const latestCreatedAt = latest ? new Date(latest.createdAt) : null;

  if (
    latest &&
    latestCreatedAt &&
    latestCreatedAt.getTime() >= resumeUpdatedAt.getTime()
  ) {
    return latest;
  }

  const scorePayload = calculateResumeStrength(
    resume.parsedData,
    toSkillList(resume.skills),
    roleId,
  );
  const record = {
    id: crypto.randomUUID(),
    userId,
    roleId,
    score: scorePayload.overallScore,
    sectionScores: scorePayload.sections,
    suggestions: scorePayload.suggestions,
    createdAt: new Date(),
  };
  db.resumeScores.push(record);
  await supabaseStore.upsertResumeScore(record);
  return record;
};
// Local fallback used when the AI service is unavailable or returns invalid data.
export const buildStudentAICoachFallback = (payload: {
  feature: string;
  prompt: string;
  context: Record<string, any>;
}) => {
  const feature = String(payload.feature || "skill_gap");
  const roleName = String(payload.context?.targetRole || "your target role");
  const missingSkills = normalizeSkillList(
    payload.context?.missingSkills || [],
  ).slice(0, 3);
  const missingText =
    missingSkills.length > 0 ? missingSkills.join(", ") : "core role skills";

  if (feature === "resume_improvement") {
    return {
      provider: "fallback",
      model: null,
      feature,
      title: "Resume Improvement Checklist",
      summary: `Improve your resume for ${roleName} by emphasizing measurable outcomes and relevant skill evidence.`,
      actionItems: [
        "Rewrite top 3 bullets with action + outcome + metric format.",
        "Move role-relevant skills to top section and trim unrelated tools.",
        "Add one project impact metric (performance, users, accuracy, etc.).",
        "Keep layout simple and ATS friendly.",
      ],
      followUpQuestions: [
        "Want ATS keywords for your target role?",
        "Need help rewriting one project bullet?",
      ],
    };
  }

  if (feature === "interview_prep") {
    return {
      provider: "fallback",
      model: null,
      feature,
      title: "Interview Prep Focus",
      summary: `Prepare for ${roleName} interviews with targeted technical practice and concise behavioral stories.`,
      actionItems: [
        "Practice 5 technical questions and keep answers under 2 minutes.",
        "Prepare 3 STAR-format stories (ownership, teamwork, failure).",
        "Review one project deeply: architecture, tradeoffs, and testing.",
        "Run one mock interview this week and capture improvement points.",
      ],
      followUpQuestions: [
        "Need likely interview questions for your role?",
        "Want a mock interview rubric?",
      ],
    };
  }

  if (feature === "project_ideas") {
    return {
      provider: "fallback",
      model: null,
      feature,
      title: "Portfolio Project Plan",
      summary: `Build role-aligned projects that close key gaps in ${missingText}.`,
      actionItems: [
        `Create one mini project centered on ${missingSkills[0] || "a core skill"} and deploy it.`,
        "Add testing, error handling, and logging to show production quality.",
        "Write concise architecture notes and attach a short walkthrough video.",
        "Highlight measurable outcomes in your resume.",
      ],
      followUpQuestions: [
        "Want weekly milestones for one project?",
        "Need project ideas based on your current skills?",
      ],
    };
  }

  if (feature === "study_plan") {
    return {
      provider: "fallback",
      model: null,
      feature,
      title: "4-Week Study Plan",
      summary: `Structured study plan for ${roleName} with focus on ${missingText}.`,
      actionItems: [
        "Week 1: learn one missing core skill and finish foundational lessons.",
        "Week 2: build a small project feature using that skill.",
        "Week 3: improve quality with tests, documentation, and deployment.",
        "Week 4: update portfolio, resume, and do one mock interview.",
      ],
      followUpQuestions: [
        "Need this split into daily tasks?",
        "Want free resources for each week?",
      ],
    };
  }

  return {
    provider: "fallback",
    model: null,
    feature: "skill_gap",
    title: "Skill Gap Guidance",
    summary: `Prioritize missing skills for ${roleName}. Start with ${missingText}.`,
    actionItems: [
      "Pick one missing skill and finish a focused learning track.",
      "Apply it in a small practical project and document outcomes.",
      "Update resume bullets with impact and metrics.",
      "Re-check role match after one week.",
    ],
    followUpQuestions: [
      "Want your missing skills ranked by impact?",
      "Need a beginner-to-advanced resource path?",
    ],
  };
};

// Small backend wrapper so the main route stays focused on business context.
export const callStudentAICoach = async (payload: {
  feature: string;
  prompt: string;
  context: Record<string, any>;
}) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
    const response = await (async () => {
      try {
        return await fetch(`${AI_SERVICE_URL}/ai/student-assistant`, {
          method: "POST",
          headers: buildAiServiceHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    })();
    if (!response.ok) {
      throw new Error(
        `AI service request failed with status ${response.status}`,
      );
    }
    const data: any = await response.json();
    if (!data || typeof data !== "object")
      throw new Error("Invalid AI response");
    return data;
  } catch {
    return buildStudentAICoachFallback(payload);
  }
};
