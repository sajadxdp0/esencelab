export type FeedbackTone = "success" | "error" | "info";

export interface FeedbackState {
  tone: FeedbackTone;
  text: string;
}

export type EntryMode = "upload" | "discover";

export interface ResumeEntryItem {
  title: string;
  meta: string | null;
  summary?: string | null;
}

export interface ResumeSnapshot {
  skills: string[];
  summary: string;
  name: string;
  email: string;
  phone: string;
  education: ResumeEntryItem[];
  experience: ResumeEntryItem[];
}
