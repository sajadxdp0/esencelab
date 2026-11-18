import { FeedbackTone } from "@/components/studentUpskilling/types";

export const MAX_RESUME_FILE_SIZE_MB = Math.max(
  1,
  Math.min(4.4, Number(process.env.NEXT_PUBLIC_MAX_RESUME_FILE_SIZE_MB || 4)),
);
export const MAX_RESUME_FILE_SIZE_BYTES = Math.floor(
  MAX_RESUME_FILE_SIZE_MB * 1024 * 1024,
);

export const scoreToPercent = (score: number): number => {
  if (!Number.isFinite(score)) return 0;
  return Math.max(
    0,
    Math.min(100, score <= 1 ? Math.round(score * 100) : Math.round(score)),
  );
};

export const oneLine = (text: string | undefined, max = 98): string => {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "Recommended based on your current resume and skills.";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}...`;
};

export const shortDate = (value: string | Date): string =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export const validatePdf = (candidate: File): string | null => {
  const isPdf =
    candidate.type === "application/pdf" ||
    candidate.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Invalid PDF. Please upload a valid resume PDF file.";
  if (candidate.size > MAX_RESUME_FILE_SIZE_BYTES) {
    return `File is too large. Maximum allowed size is ${MAX_RESUME_FILE_SIZE_MB}MB.`;
  }
  return null;
};

export const getFeedbackClassName = (tone?: FeedbackTone): string => {
  if (tone === "success" || tone === "error")
    return "border-gray-300 bg-gray-100 text-gray-800";
  return "border-accent-soft text-accent";
};
