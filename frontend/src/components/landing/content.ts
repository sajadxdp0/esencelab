export interface NavItem {
  label: string;
  href: string;
}

export interface WorkflowStep {
  step: string;
  title: string;
  description: string;
}

export interface RoleCard {
  title: string;
  description: string;
  details: string[];
}

export interface ProofCard {
  label: string;
  value: string;
  description: string;
}

export interface Faq {
  question: string;
  answer: string;
}

/** Static marketing content and shared class tokens for the landing page. */

export const navItems: NavItem[] = [
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "Roles", href: "#roles" },
  { label: "Trust", href: "#trust" },
];

export const productPoints: string[] = [
  "Parse resumes into structured student profiles",
  "Compare skills with target roles and job requirements",
  "Turn gaps into practical next steps",
  "Give recruiters cleaner candidate summaries",
  "Keep admin review and placement activity visible",
];

export const workflowSteps: WorkflowStep[] = [
  {
    step: "01",
    title: "Profile",
    description:
      "A resume becomes a structured profile with skills, education, experience, and projects.",
  },
  {
    step: "02",
    title: "Match",
    description:
      "The profile is compared with roles and jobs so strengths and gaps are easy to see.",
  },
  {
    step: "03",
    title: "Improve",
    description:
      "Students get a plan, recruiters review better summaries, and admins track the process.",
  },
];

export const roleCards: RoleCard[] = [
  {
    title: "Students",
    description:
      "Understand what is ready, what is missing, and what to work on next.",
    details: ["Resume profile", "Skill gaps", "Learning plan"],
  },
  {
    title: "Recruiters",
    description:
      "Review applicants with match context instead of reading every resume from scratch.",
    details: ["Job posts", "Ranked applicants", "Match details"],
  },
  {
    title: "Admins",
    description:
      "Manage users, resumes, applications, moderation, and platform health from one place.",
    details: ["User control", "Resume review", "Audit view"],
  },
];

export const proofCards: ProofCard[] = [
  {
    label: "Workspaces",
    value: "3",
    description: "Separate views for students, recruiters, and admins.",
  },
  {
    label: "Plans",
    value: "30/60",
    description: "Short learning plans that turn gaps into weekly work.",
  },
  {
    label: "Record",
    value: "1",
    description:
      "A connected record of resumes, skills, jobs, and applications.",
  },
];

export const trustItems: string[] = [
  "Next.js frontend, Express backend, and FastAPI AI service.",
  "Supabase/Postgres support for production data.",
  "Protected backend-to-AI service calls with fallback behavior.",
];

export const faqs: Faq[] = [
  {
    question: "Is Esencelab only for students?",
    answer:
      "No. Students use it to prepare, recruiters use it to review candidates, and admins use it to manage the placement process.",
  },
  {
    question: "Is it just a resume parser?",
    answer:
      "No. Resume parsing starts the workflow. The product also handles skill gaps, learning plans, job matching, applications, and admin review.",
  },
];

export const resumeSignals: Array<{ skill: string; score: number }> = [
  { skill: "Node.js", score: 92 },
  { skill: "SQL", score: 86 },
  { skill: "REST APIs", score: 78 },
];

export const candidates: Array<{ name: string; role: string; match: string; status: string }> = [
  { name: "Asha S.", role: "Backend Developer", match: "84", status: "Ready" },
  {
    name: "Harish K.",
    role: "Full Stack Intern",
    match: "76",
    status: "Review",
  },
  { name: "Jiya P.", role: "Data Analyst", match: "71", status: "Plan" },
];

export const primaryButtonClass =
  "inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#111111] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#242424] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2";
export const secondaryButtonClass =
  "inline-flex min-h-[48px] items-center justify-center rounded-full border border-black/10 bg-white/72 px-6 py-3 text-sm font-semibold text-[#161616] transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2";
export const panelClass =
  "rounded-[2rem] border border-white/70 bg-white/70 shadow-[0_24px_70px_-58px_rgba(15,15,15,0.58)] backdrop-blur-xl";
export const mutedTextClass = "text-[#626262]";
export const eyebrowClass =
  "text-xs font-bold uppercase tracking-[0.22em] text-[#707070]";

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export const softFloat = {
  y: [0, -8, 0],
  transition: {
    duration: 6,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};
