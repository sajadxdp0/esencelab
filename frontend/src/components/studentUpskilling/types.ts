export type FeedbackTone = "success" | "error" | "info";

export interface FeedbackState {
  tone: FeedbackTone;
  text: string;
}

export type RoadmapStatus = "completed" | "in_progress" | "missing";

export interface RoadmapLevelItem {
  skill: string;
  status: RoadmapStatus;
  level?: string;
}

export interface ScoreSection {
  key: string;
  label: string;
  value: number;
}

export interface NextStepCard {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  href?: string;
  external?: boolean;
  cta: string;
}

export type AICoachFeature =
  | "skill_gap"
  | "resume_improvement"
  | "interview_prep"
  | "project_ideas"
  | "study_plan";
