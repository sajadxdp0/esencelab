export interface JobFormState {
  title: string;
  company: string;
  description: string;
  location: string;
  requirements: string;
  experienceLevel: "entry" | "junior" | "mid" | "senior" | "lead";
  jobType: "full_time" | "part_time" | "internship" | "contract";
}

export type CandidateSortBy = "match" | "resume" | "experience";
export type CandidateSortOrder = "asc" | "desc";
