import { Resume } from "@/types";
import {
  FeedbackTone,
  ResumeEntryItem,
  ResumeSnapshot,
} from "@/app/(dashboard)/_components/resume/types";

interface RawResumeEntry {
  role?: string;
  title?: string;
  position?: string;
  company?: string;
  organization?: string;
  employer?: string;
  duration?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  summary?: string;
  details?: string;
  degree?: string;
  course?: string;
  program?: string;
  institution?: string;
  school?: string;
  college?: string;
  year?: string;
  graduationYear?: string;
}

export const isResumeEffectivelyEmpty = (resume: Resume): boolean => {
  const hasSkills = (resume.skills || []).length > 0;
  const hasSummary = Boolean(resume.parsedData?.summary);
  const hasEducation = (resume.parsedData?.education || []).length > 0;
  const hasExperience = (resume.parsedData?.experience || []).length > 0;
  return !hasSkills && !hasSummary && !hasEducation && !hasExperience;
};

export const formatExperienceItem = (item: RawResumeEntry): ResumeEntryItem => {
  const role = item.role || item.title || item.position;
  const company = item.company || item.organization || item.employer;
  const period =
    item.duration ||
    item.period ||
    [item.startDate, item.endDate].filter(Boolean).join(" - ");
  const summary = item.description || item.summary || item.details;
  return {
    title: [role, company].filter(Boolean).join(" at ") || "Experience entry",
    meta: period || null,
    summary: summary || null,
  };
};

export const formatEducationItem = (item: RawResumeEntry): ResumeEntryItem => {
  const degree = item.degree || item.course || item.program;
  const school = item.institution || item.school || item.college;
  const period = item.year || item.graduationYear || item.duration;
  return {
    title: [degree, school].filter(Boolean).join(" - ") || "Education entry",
    meta: period || null,
  };
};

export const buildResumeSnapshot = (resume: Resume | null): ResumeSnapshot => {
  const parsed = resume?.parsedData;
  return {
    skills: resume?.skills || [],
    summary: parsed?.summary || "",
    name: parsed?.name || "",
    email: parsed?.email || "",
    phone: parsed?.phone || "",
    education: (parsed?.education || []).map(formatEducationItem),
    experience: (parsed?.experience || []).map(formatExperienceItem),
  };
};

export const getFeedbackClassName = (tone?: FeedbackTone): string => {
  if (tone === "success" || tone === "error")
    return "border-gray-300 bg-gray-100 text-gray-800";
  return "border-accent-soft bg-white text-accent";
};
