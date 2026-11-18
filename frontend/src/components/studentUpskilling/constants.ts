import { AICoachFeature } from "@/components/studentUpskilling/types";

export const aiCoachFeatures: Array<{ value: AICoachFeature; label: string }> = [
  { value: "skill_gap", label: "Skill gap coach" },
  { value: "resume_improvement", label: "Resume upgrade" },
  { value: "interview_prep", label: "Interview prep" },
  { value: "project_ideas", label: "Project ideas" },
  { value: "study_plan", label: "Study plan" },
];

export const aiPromptSuggestions: Record<AICoachFeature, string[]> = {
  skill_gap: [
    "Rank my missing skills by hiring impact for backend roles.",
    "Tell me the fastest skill to learn next to improve my match score.",
  ],
  resume_improvement: [
    "Rewrite my strongest project bullets to sound more recruiter-friendly.",
    "Show me what should move to the top of my resume for this role.",
  ],
  interview_prep: [
    "Give me a 7-day backend interview revision plan.",
    "Create likely technical and HR questions for my target role.",
  ],
  project_ideas: [
    "Suggest 3 portfolio projects that close my biggest skill gaps.",
    "Give me one project idea that can be built in 2 weeks.",
  ],
  study_plan: [
    "Build a 30-day plan for my missing skills with weekly milestones.",
    "Turn my gap list into a realistic evening study routine.",
  ],
};
