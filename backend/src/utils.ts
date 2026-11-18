/** Small, dependency-light helpers shared by routes and services. */
import crypto from "crypto";
import { db } from "./state";
import fs from "fs";
import path from "path";
import { sanitizeUser, type SupportedRole } from "./auth/roles";
import type {
  CandidateMatchOptions,
  CandidateMatchSortBy,
  CandidateMatchSortOrder,
  RecruiterAccessRequestStatus,
} from "./types";

export const toPercentile = (values: number[], percentile: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1),
  );
  return Math.round(sorted[index] || 0);
};

export const getMetricSamples = (entry: any): number[] => {
  return Array.isArray(entry?.recentDurationsMs)
    ? entry.recentDurationsMs
        .filter((value: unknown) => Number.isFinite(Number(value)))
        .map((value: unknown) => Number(value))
    : [];
};
export const PDF_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "applications/vnd.pdf",
  "text/pdf",
]);

export const sanitizeUploadFilename = (fileName: string) =>
  path
    .basename(fileName)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");

export const isLikelyPdfFile = (file: Express.Multer.File) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();
  const acceptableMime =
    PDF_MIME_TYPES.has(mime) ||
    mime === "" ||
    mime === "application/octet-stream";
  return ext === ".pdf" && acceptableMime;
};
export const normalizeMetricPath = (value: string) => {
  return value
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
      ":id",
    )
    .replace(/\/\d+(?=\/|$)/g, "/:id");
};
export const readOptionalBootstrapUser = (
  prefix: string,
  role: SupportedRole,
  fallbackName: string,
): {
  email: string;
  password: string;
  name: string;
  role: SupportedRole;
} | null => {
  const email = String(process.env[`${prefix}_EMAIL`] || "")
    .trim()
    .toLowerCase();
  const password = String(process.env[`${prefix}_PASSWORD`] || "").trim();
  const name =
    String(process.env[`${prefix}_NAME`] || fallbackName).trim() ||
    fallbackName;

  if (!email && !password) {
    return null;
  }
  if (!email || !password) {
    throw new Error(`${prefix}_EMAIL and ${prefix}_PASSWORD must both be set.`);
  }

  return {
    email,
    password,
    name,
    role,
  };
};
export const toStorageApplicationStatus = (
  status: unknown,
): "pending" | "shortlisted" | "interview" | "rejected" => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (normalized === "applied" || normalized === "pending") return "pending";
  if (normalized === "offer" || normalized === "shortlisted")
    return "shortlisted";
  if (normalized === "interviewing" || normalized === "interview")
    return "interview";
  return "rejected";
};

export const toTrackerApplicationStatus = (
  status: unknown,
): "applied" | "interviewing" | "offer" | "rejected" => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (normalized === "pending" || normalized === "applied") return "applied";
  if (normalized === "interview" || normalized === "interviewing")
    return "interviewing";
  if (normalized === "shortlisted" || normalized === "offer") return "offer";
  return "rejected";
};

export const withTrackerStatus = (application: any) => ({
  ...application,
  trackerStatus: toTrackerApplicationStatus(application?.status),
  storageStatus: application?.status || "pending",
});

export const withApplicationDetails = (applications: any[]) => {
  return applications.map((application) => {
    const job = db.jobs.find((entry: any) => entry.id === application.jobId);
    const student = db.profiles.find(
      (entry: any) => entry.id === application.candidateId,
    );
    const candidateProfile =
      db.candidates.find(
        (entry: any) => entry.userId === application.candidateId,
      ) || null;
    const resume = db.resumes.find(
      (entry: any) => entry.userId === application.candidateId,
    );
    return {
      ...withTrackerStatus(application),
      // Keep recruiter/admin navigation stable even when a student has not
      // uploaded a resume yet and therefore has no dedicated candidate row.
      candidateProfileId:
        candidateProfile?.id || application.candidateId || null,
      job,
      student: student ? sanitizeUser(student) : null,
      resume,
      createdAt: application.appliedAt || application.createdAt,
    };
  });
};

export const toPositiveInt = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  if (normalized <= 0) return fallback;
  return Math.min(normalized, max);
};

export const getPagination = (
  query: Record<string, any>,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
) => {
  const page = toPositiveInt(query?.page, defaults.page || 1, 100000);
  const limit = toPositiveInt(
    query?.limit,
    defaults.limit || 20,
    defaults.maxLimit || 100,
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};
export const paginateData = <T>(items: T[], page: number, limit: number) => {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

export const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    }),
  );

  return results;
};

export const average = (items: number[]) => {
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, value) => acc + Number(value || 0), 0);
  return Math.round((sum / items.length) * 100) / 100;
};
export const RECRUITER_ACCESS_REQUEST_STATUSES = new Set([
  "pending",
  "approved",
  "rejected",
]);

export const normalizeRecruiterAccessRequestStatus = (
  value: unknown,
  fallback: RecruiterAccessRequestStatus = "pending",
): RecruiterAccessRequestStatus => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return RECRUITER_ACCESS_REQUEST_STATUSES.has(normalized)
    ? (normalized as RecruiterAccessRequestStatus)
    : fallback;
};

export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());

export const normalizeCompanyWebsite = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

export const truncateForStorage = (value: unknown, maxLength: number) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);

export const sanitizeRecruiterAccessRequest = (request: any) => ({
  id: request.id,
  name: request.name,
  email: request.email,
  companyName: request.companyName,
  companyWebsite: request.companyWebsite || "",
  jobTitle: request.jobTitle || "",
  message: request.message || "",
  status: normalizeRecruiterAccessRequestStatus(request.status),
  adminNotes: request.adminNotes || "",
  reviewedBy: request.reviewedBy || null,
  reviewedAt: request.reviewedAt || null,
  userId: request.userId || null,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});
export const generateTemporaryPassword = () => {
  const randomPart = crypto.randomBytes(12).toString("base64url");
  return `Esen-${randomPart}-1!`;
};
export const toSkillList = (value: any): string[] => {
  if (Array.isArray(value))
    return value.map((entry) => String(entry)).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed))
        return parsed.map((entry) => String(entry)).filter(Boolean);
    } catch {
      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }
  return [];
};

export const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || "").trim()).filter(Boolean);
};

export const normalizeSkillList = (value: unknown): string[] => {
  const raw = Array.isArray(value) ? value : toSkillList(value as any);
  const unique = new Map<string, string>();
  for (const item of raw) {
    const cleaned = String(item || "").trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!unique.has(key)) unique.set(key, cleaned);
  }
  return Array.from(unique.values());
};

export const COURSE_SKILL_ALIASES: Record<string, string[]> = {
  "data visualization": ["data visualization", "power bi"],
  "power bi": ["power bi", "data visualization"],
  "c programming": ["c programming", "embedded c"],
  "embedded c": ["embedded c", "c programming"],
  microcontrollers: ["microcontrollers", "iot"],
  iot: ["iot", "microcontrollers"],
  "circuit analysis": ["circuit analysis", "analog electronics"],
  "analog electronics": ["analog electronics", "circuit analysis"],
};

export const courseSkillMatches = (courseSkills: string[], skill: string) => {
  const normalizedSkill = String(skill || "")
    .trim()
    .toLowerCase();
  if (!normalizedSkill) return false;
  const aliases = COURSE_SKILL_ALIASES[normalizedSkill] || [normalizedSkill];
  return courseSkills.some((entry) =>
    aliases.includes(
      String(entry || "")
        .trim()
        .toLowerCase(),
    ),
  );
};

export const parseJsonArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const normalizeResumeParsedData = (value: any, profile: any) => {
  const safe = value && typeof value === "object" ? value : {};
  const parsedSkills = normalizeSkillList(safe.skills);

  return {
    name: safe.name ? String(safe.name) : profile?.name || "",
    email: safe.email ? String(safe.email) : profile?.email || "",
    phone: safe.phone ? String(safe.phone) : null,
    summary: safe.summary ? String(safe.summary) : null,
    skills: parsedSkills,
    education: Array.isArray(safe.education) ? safe.education : [],
    experience: Array.isArray(safe.experience) ? safe.experience : [],
    projects: Array.isArray(safe.projects) ? safe.projects : [],
    organizations: normalizeStringArray(safe.organizations),
    dates: normalizeStringArray(safe.dates),
  };
};
export const buildProcessedFileUrl = (userId: string, fileName: string) => {
  const safeName = sanitizeUploadFilename(fileName || "resume.pdf");
  return `processed://resumes/${userId}/${Date.now()}-${safeName}`;
};

export const safeDeleteTempFile = async (filePath?: string) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // Ignore cleanup errors for temp uploads.
  }
};
export const jobRequirementText = (job: any) => {
  const requirements = Array.isArray(job.requirements)
    ? job.requirements.join(", ")
    : String(job.requirements || "");
  const skills = Array.isArray(job.skills)
    ? job.skills.join(", ")
    : String(job.skills || "");
  return `${job.title || ""}. ${job.description || ""}. Requirements: ${requirements}. Skills: ${skills}`.trim();
};

export const toHumanReadableImpact = (impact: number) =>
  Math.max(3, Math.min(30, Math.round(impact)));

export const tokenizeSkillTerms = (skills: string[]) =>
  skills
    .flatMap((skill) =>
      String(skill)
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/g),
    )
    .map((token) => token.trim())
    .filter(Boolean);

export const computeTfIdfCosine = (
  resumeSkills: string[],
  requiredSkills: string[],
) => {
  const docA = tokenizeSkillTerms(resumeSkills);
  const docB = tokenizeSkillTerms(requiredSkills);
  if (docA.length === 0 || docB.length === 0) return 0;

  const documents = [docA, docB];
  const vocab = Array.from(new Set([...docA, ...docB]));
  const idf = new Map<string, number>();
  for (const term of vocab) {
    const docFreq = documents.reduce(
      (count, doc) => count + (doc.includes(term) ? 1 : 0),
      0,
    );
    idf.set(term, Math.log((documents.length + 1) / (docFreq + 1)) + 1);
  }

  const vectorize = (doc: string[]) => {
    const termCount = new Map<string, number>();
    for (const term of doc) {
      termCount.set(term, (termCount.get(term) || 0) + 1);
    }
    const docLength = doc.length || 1;
    return vocab.map((term) => {
      const tf = (termCount.get(term) || 0) / docLength;
      return tf * (idf.get(term) || 0);
    });
  };

  const a = vectorize(docA);
  const b = vectorize(docB);
  const dot = a.reduce((sum, entry, idx) => sum + entry * b[idx], 0);
  const magA = Math.sqrt(a.reduce((sum, entry) => sum + entry * entry, 0));
  const magB = Math.sqrt(b.reduce((sum, entry) => sum + entry * entry, 0));
  if (magA === 0 || magB === 0) return 0;
  return Math.max(0, Math.min(1, dot / (magA * magB)));
};
export const toDisplaySkill = (skill: string) =>
  skill
    .split(" ")
    .map((segment) =>
      segment.length <= 3
        ? segment.toUpperCase()
        : segment.charAt(0).toUpperCase() + segment.slice(1),
    )
    .join(" ");

export const localMatchScore = (resumeSkills: string[], requiredSkills: string[]) => {
  const normalizedResume = Array.from(
    new Set(
      resumeSkills
        .map((skill) => String(skill).trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  const requiredDisplayMap = new Map<string, string>();
  for (const rawSkill of requiredSkills) {
    const normalized = String(rawSkill).trim().toLowerCase();
    if (!normalized) continue;
    if (!requiredDisplayMap.has(normalized)) {
      requiredDisplayMap.set(
        normalized,
        toDisplaySkill(String(rawSkill).trim()),
      );
    }
  }
  const normalizedRequired = Array.from(requiredDisplayMap.keys());
  const resumeSet = new Set(normalizedResume);
  const matched = normalizedRequired.filter((skill) => resumeSet.has(skill));
  const missing = normalizedRequired.filter((skill) => !resumeSet.has(skill));

  const exactCoverage =
    normalizedRequired.length > 0
      ? matched.length / normalizedRequired.length
      : 0;
  const semanticSimilarity = computeTfIdfCosine(
    normalizedResume,
    normalizedRequired,
  );
  const blendedScore = exactCoverage * 0.65 + semanticSimilarity * 0.35;
  const matchScore = Math.round(Math.max(0, Math.min(1, blendedScore)) * 100);

  const matchQuality =
    matchScore >= 75
      ? "Strong alignment between profile and required skills."
      : matchScore >= 50
        ? "Moderate alignment. Upskilling in missing areas is recommended."
        : "Low alignment. Focus on building core required skills.";

  return {
    matchScore,
    matchedSkills: matched.map(
      (skill) => requiredDisplayMap.get(skill) || toDisplaySkill(skill),
    ),
    missingSkills: missing.map(
      (skill) => requiredDisplayMap.get(skill) || toDisplaySkill(skill),
    ),
    explanation: matchQuality,
  };
};
export const getCollectionVersion = (
  collection: any[],
  updatedField = "updatedAt",
  createdField = "createdAt",
) =>
  collection.reduce((acc: number, entry: any) => {
    const ts = new Date(
      entry?.[updatedField] || entry?.[createdField] || 0,
    ).getTime();
    return Math.max(acc, Number.isFinite(ts) ? ts : 0);
  }, 0);
export const parseYearRangeFromText = (text: string) => {
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  const explicitYears = [
    ...normalized.matchAll(/(\d{1,2}(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?|yr)\b/g),
  ];
  if (explicitYears.length > 0) {
    const sum = explicitYears.reduce(
      (acc, match) => acc + Number(match[1] || 0),
      0,
    );
    return Number.isFinite(sum) ? Math.round(sum * 10) / 10 : 0;
  }

  const explicitMonths = [
    ...normalized.matchAll(/(\d{1,2}(?:\.\d+)?)\s*(?:months?|mos?)\b/g),
  ];
  if (explicitMonths.length > 0) {
    const months = explicitMonths.reduce(
      (acc, match) => acc + Number(match[1] || 0),
      0,
    );
    const years = months / 12;
    return Number.isFinite(years) ? Math.round(years * 10) / 10 : 0;
  }

  const years = [...normalized.matchAll(/\b(19|20)\d{2}\b/g)].map((match) =>
    Number(match[0]),
  );
  if (years.length >= 2) {
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    return Math.max(0, Math.min(30, maxYear - minYear));
  }
  return 0;
};
export const toSortDirection = (value: unknown): CandidateMatchSortOrder => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "asc" ? "asc" : "desc";
};

export const toSortKey = (value: unknown): CandidateMatchSortBy => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "resume") return "resume";
  if (normalized === "experience") return "experience";
  return "match";
};

export const sortCandidateMatches = (
  matches: any[],
  options: CandidateMatchOptions,
) => {
  const sortBy = options.sortBy || "match";
  const direction = options.order === "asc" ? 1 : -1;
  const sorted = [...matches].sort((left, right) => {
    if (sortBy === "resume") {
      const resumeDiff = (left.resumeScore || 0) - (right.resumeScore || 0);
      if (resumeDiff !== 0) return resumeDiff * direction;
    } else if (sortBy === "experience") {
      const experienceDiff =
        (left.experienceYears || 0) - (right.experienceYears || 0);
      if (experienceDiff !== 0) return experienceDiff * direction;
    } else {
      const matchDiff = (left.matchScore || 0) - (right.matchScore || 0);
      if (matchDiff !== 0) return matchDiff * direction;
    }

    const fallbackMatchDiff = (left.matchScore || 0) - (right.matchScore || 0);
    if (fallbackMatchDiff !== 0) return fallbackMatchDiff * direction;
    return String(left.name || "").localeCompare(String(right.name || ""));
  });

  const safeLimit =
    Number.isFinite(options.limit) && Number(options.limit) > 0
      ? Math.min(200, Number(options.limit))
      : 100;
  return sorted.slice(0, safeLimit);
};
