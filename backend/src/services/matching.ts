/** Resume/job matching, candidate ranking and related response caches. */
import { roleMatches } from "../auth/roles";
import { getLatestResumeScore } from "./career";
import { AI_MATCH_TIMEOUT_MS, AI_SERVICE_URL, CANDIDATE_MATCH_CACHE_MAX_ENTRIES, CANDIDATE_MATCH_CACHE_TTL_MS, CANDIDATE_MATCH_CONCURRENCY, buildAiServiceHeaders } from "../config";
import {
  candidateMatchCache,
  db,
  recruiterOverviewCache,
  resetTokens,
  studentRecommendationCache,
} from "../state";
import {
  getCollectionVersion,
  jobRequirementText,
  localMatchScore,
  mapWithConcurrency,
  normalizeSkillList,
  parseJsonArray,
  parseYearRangeFromText,
  sortCandidateMatches,
  toSkillList,
} from "../utils";
import type { CandidateMatchOptions } from "../types";

export const getMatchInsights = async (resumeSkills: string[], job: any) => {
  const sanitizedSkills = resumeSkills
    .map((entry) => String(entry).trim())
    .filter(Boolean);
  const requiredSkills = toSkillList(
    job.skills?.length ? job.skills : job.requirements,
  );
  const requirementsText = jobRequirementText(job);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_MATCH_TIMEOUT_MS);
    const aiResponse = await (async () => {
      try {
        return await fetch(`${AI_SERVICE_URL}/ai/match`, {
          method: "POST",
          headers: buildAiServiceHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            resumeSkills: sanitizedSkills,
            jobRequirements: requirementsText,
            jobRequiredSkills: requiredSkills,
            includeExplanation: true,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    })();

    if (!aiResponse.ok)
      throw new Error(`AI match failed with status ${aiResponse.status}`);
    const aiData: any = await aiResponse.json();
    const rawScore = Number(aiData.matchScore || 0);
    const normalizedScore = rawScore > 1 ? rawScore / 100 : rawScore;
    return {
      matchScore: Math.round(Math.max(0, Math.min(1, normalizedScore)) * 100),
      matchedSkills: Array.isArray(aiData.matchedSkills)
        ? aiData.matchedSkills
        : [],
      missingSkills: Array.isArray(aiData.missingSkills)
        ? aiData.missingSkills
        : [],
      explanation: aiData.explanation || null,
    };
  } catch {
    return localMatchScore(sanitizedSkills, requiredSkills);
  }
};
export const pruneRecruiterOverviewCache = () => {
  const now = Date.now();
  for (const [key, entry] of recruiterOverviewCache.entries()) {
    if (entry.expiresAt <= now) recruiterOverviewCache.delete(key);
  }
};

export const buildRecruiterOverviewCacheKey = (profile: any) => {
  const scope = roleMatches(profile.role, "admin")
    ? "admin"
    : `recruiter:${profile.id}`;
  const jobs = roleMatches(profile.role, "admin")
    ? db.jobs
    : db.jobs.filter((entry: any) => entry.employerId === profile.id);
  const jobIds = new Set(jobs.map((entry: any) => entry.id));
  const scopedApplications = db.applications.filter((entry: any) =>
    jobIds.has(entry.jobId),
  );

  return [
    scope,
    jobs.length,
    getCollectionVersion(jobs),
    scopedApplications.length,
    getCollectionVersion(scopedApplications, "updatedAt", "appliedAt"),
    db.candidates.length,
    getCollectionVersion(db.candidates),
    db.resumes.length,
    getCollectionVersion(db.resumes),
  ].join(":");
};

export const estimateExperienceYears = (candidate: any, resume: any) => {
  const candidateEntries = parseJsonArray(candidate?.experience);
  const resumeEntries = Array.isArray(resume?.parsedData?.experience)
    ? resume.parsedData.experience
    : [];
  const allEntries = [...candidateEntries, ...resumeEntries];

  if (allEntries.length === 0) return 0;

  let years = 0;
  for (const entry of allEntries) {
    const text = [
      String(entry?.duration || ""),
      String(entry?.description || ""),
      String(entry?.title || ""),
      String(entry?.company || ""),
    ]
      .join(" ")
      .trim();
    years += parseYearRangeFromText(text);
  }

  if (years <= 0) {
    years = Math.min(12, allEntries.length * 0.5);
  }
  return Math.round(Math.min(30, years) * 10) / 10;
};

export const buildCandidateMatchCacheKey = (
  job: any,
  options: CandidateMatchOptions,
) => {
  const candidatesVersion = db.candidates.reduce((acc: number, entry: any) => {
    const ts = new Date(entry?.updatedAt || entry?.createdAt || 0).getTime();
    return Math.max(acc, ts || 0);
  }, 0);
  const resumesVersion = db.resumes.reduce((acc: number, entry: any) => {
    const ts = new Date(entry?.updatedAt || entry?.createdAt || 0).getTime();
    return Math.max(acc, ts || 0);
  }, 0);
  const applicationsVersion = db.applications.reduce(
    (acc: number, entry: any) => {
      const ts = new Date(entry?.updatedAt || entry?.appliedAt || 0).getTime();
      return Math.max(acc, ts || 0);
    },
    0,
  );

  return [
    job.id,
    new Date(job.updatedAt || job.createdAt || 0).getTime(),
    db.candidates.length,
    candidatesVersion,
    db.resumes.length,
    resumesVersion,
    db.applications.length,
    applicationsVersion,
    options.sortBy || "match",
    options.order || "desc",
    options.limit || 100,
    options.appliedOnly ? "applied" : "all",
  ].join(":");
};

export const pruneCandidateMatchCache = () => {
  const now = Date.now();
  for (const [key, value] of candidateMatchCache.entries()) {
    if (value.expiresAt <= now) candidateMatchCache.delete(key);
  }

  while (candidateMatchCache.size > CANDIDATE_MATCH_CACHE_MAX_ENTRIES) {
    const oldestKey = candidateMatchCache.keys().next().value;
    if (!oldestKey) break;
    candidateMatchCache.delete(oldestKey);
  }
};

export const pruneStudentRecommendationCache = () => {
  const now = Date.now();
  for (const [key, value] of studentRecommendationCache.entries()) {
    if (value.expiresAt <= now) studentRecommendationCache.delete(key);
  }
};
export const getCandidateMatchesForJob = async (
  job: any,
  options: CandidateMatchOptions = {},
) => {
  pruneCandidateMatchCache();
  const cacheKey = buildCandidateMatchCacheKey(job, options);
  const cached = candidateMatchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      matches: cached.data,
      meta: {
        ...cached.meta,
        source: "cache" as const,
      },
    };
  }

  const applicationsForJob = db.applications.filter(
    (entry: any) => entry.jobId === job.id,
  );
  const appliedCandidateIds = new Set(
    applicationsForJob.map((entry: any) => entry.candidateId),
  );
  const candidatesToScore = options.appliedOnly
    ? db.candidates.filter((candidate: any) =>
        appliedCandidateIds.has(candidate.userId),
      )
    : db.candidates;

  const allMatches = await mapWithConcurrency(
    candidatesToScore,
    CANDIDATE_MATCH_CONCURRENCY,
    async (candidate: any) => {
      const candidateSkills = normalizeSkillList(candidate.skills);
      const insights = await getMatchInsights(candidateSkills, job);
      const student = db.profiles.find(
        (entry: any) => entry.id === candidate.userId,
      );
      const application = applicationsForJob.find(
        (entry: any) => entry.candidateId === candidate.userId,
      );
      const resume =
        db.resumes.find((entry: any) => entry.userId === candidate.userId) ||
        null;
      const latestResumeScore = getLatestResumeScore(candidate.userId);
      const resumeScore = latestResumeScore
        ? Number(latestResumeScore.score || 0)
        : 0;
      const experienceYears = estimateExperienceYears(candidate, resume);
      const topSkills = insights.matchedSkills.slice(0, 3);

      return {
        candidateId: candidate.id,
        studentId: candidate.userId,
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
        skills: candidateSkills,
        matchScore: insights.matchScore,
        matchedSkills: insights.matchedSkills,
        missingSkills: insights.missingSkills,
        explanation: insights.explanation,
        hasApplied: !!application,
        applicationStatus: application?.status || null,
        resumeScore: Math.max(0, Math.min(100, Math.round(resumeScore))),
        experienceYears,
        topSkills,
        latestResumeAt: resume?.updatedAt || resume?.createdAt || null,
        student,
      };
    },
  );

  const candidatesWithResume = allMatches.filter(
    (entry) => entry.resumeScore > 0,
  ).length;
  const sorted = sortCandidateMatches(allMatches, options);
  const meta = {
    totalCandidates: candidatesToScore.length,
    candidatesWithResume,
    candidatesWithoutResume: Math.max(
      0,
      candidatesToScore.length - candidatesWithResume,
    ),
    generatedAt: new Date().toISOString(),
    source: "computed" as const,
  };

  candidateMatchCache.set(cacheKey, {
    expiresAt: Date.now() + CANDIDATE_MATCH_CACHE_TTL_MS,
    data: sorted,
    meta,
  });

  return {
    matches: sorted,
    meta,
  };
};
export const getRecruiterJobAnalytics = (job: any, matches: any[]) => {
  const applicants = matches.filter((entry) => entry.hasApplied);
  const avgMatch = matches.length
    ? Math.round(
        matches.reduce((sum, entry) => sum + Number(entry.matchScore || 0), 0) /
          matches.length,
      )
    : 0;
  const avgApplicantMatch = applicants.length
    ? Math.round(
        applicants.reduce(
          (sum, entry) => sum + Number(entry.matchScore || 0),
          0,
        ) / applicants.length,
      )
    : 0;
  const highest = matches[0] || null;
  const missingSkillCount = new Map<string, number>();
  for (const match of matches) {
    for (const skill of match.missingSkills || []) {
      const key = String(skill).trim();
      if (!key) continue;
      missingSkillCount.set(key, (missingSkillCount.get(key) || 0) + 1);
    }
  }
  const mostMissingSkill =
    Array.from(missingSkillCount.entries()).sort((a, b) => b[1] - a[1])[0] ||
    null;

  return {
    jobId: job.id,
    title: job.title,
    totalCandidatesRanked: matches.length,
    totalApplicants: applicants.length,
    averageMatch: avgMatch,
    averageApplicantMatch: avgApplicantMatch,
    highestMatchCandidate: highest
      ? {
          candidateId: highest.candidateId,
          name: highest.name,
          matchScore: highest.matchScore,
          resumeScore: highest.resumeScore,
        }
      : null,
    mostMissingSkill: mostMissingSkill
      ? {
          skill: mostMissingSkill[0],
          count: mostMissingSkill[1],
        }
      : null,
  };
};
export const pruneExpiredResetTokens = () => {
  const now = Date.now();
  for (const [token, value] of resetTokens.entries()) {
    if (value.expiresAt <= now) resetTokens.delete(token);
  }
};
