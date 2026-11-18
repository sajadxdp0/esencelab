"use client";

import { Dispatch, FormEvent, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import DashboardStatCard from "@/app/(dashboard)/_components/dashboard/DashboardStatCard";
import PostJobForm from "@/app/(dashboard)/_components/dashboard/PostJobForm";
import CandidateRankingPanel from "@/app/(dashboard)/_components/dashboard/CandidateRankingPanel";
import RecruiterAnalytics from "@/app/(dashboard)/_components/dashboard/RecruiterAnalytics";
import {
  CandidateSortBy,
  CandidateSortOrder,
  JobFormState,
} from "@/app/(dashboard)/_components/dashboard/types";
import { Job, RecruiterCandidateMatch, RecruiterOverview } from "@/types";

interface EmployerDashboardProps {
  message: string | null;
  recruiterOverview: RecruiterOverview | null;
  employerJobs: Job[];
  selectedJobId: string;
  setSelectedJobId: Dispatch<SetStateAction<string>>;
  candidateSortBy: CandidateSortBy;
  setCandidateSortBy: Dispatch<SetStateAction<CandidateSortBy>>;
  candidateSortOrder: CandidateSortOrder;
  setCandidateSortOrder: Dispatch<SetStateAction<CandidateSortOrder>>;
  showAppliedOnly: boolean;
  setShowAppliedOnly: Dispatch<SetStateAction<boolean>>;
  loadingMatches: boolean;
  topCandidateMatches: RecruiterCandidateMatch[];
  jobForm: JobFormState;
  setJobForm: Dispatch<SetStateAction<JobFormState>>;
  postingJob: boolean;
  handleCreateJob: (event: FormEvent) => void;
}

export default function EmployerDashboard({
  message,
  recruiterOverview,
  employerJobs,
  selectedJobId,
  setSelectedJobId,
  candidateSortBy,
  setCandidateSortBy,
  candidateSortOrder,
  setCandidateSortOrder,
  showAppliedOnly,
  setShowAppliedOnly,
  loadingMatches,
  topCandidateMatches,
  jobForm,
  setJobForm,
  postingJob,
  handleCreateJob,
}: EmployerDashboardProps) {
  const router = useRouter();
  return (
    <div className="layout-container section-spacing space-y-12">
        <section>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-3 tracking-tight">
            Recruiter Dashboard
          </h1>
          <p className="text-lg font-sans text-secondary font-light">
            Post roles, review ranked applicants, and monitor hiring activity
            from one workspace.
          </p>
        </section>

        {message && (
          <div className="rounded-2xl border-[0.5px] border-accent/20 bg-accent/5 px-6 py-4 text-sm font-sans font-medium text-accent shadow-sm">
            {message}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard label="Posted Jobs" value={recruiterOverview?.postedJobs || 0} />
          <DashboardStatCard label="Active Jobs" value={recruiterOverview?.activeJobs || 0} />
          <DashboardStatCard label="Total Applicants" value={recruiterOverview?.totalApplicants || 0} />
          <DashboardStatCard label="Avg Match" value={`${recruiterOverview?.averageMatchAcrossJobs || 0}%`} />
        </section>

        <PostJobForm
          jobForm={jobForm}
          setJobForm={setJobForm}
          postingJob={postingJob}
          handleCreateJob={handleCreateJob}
        />

        <CandidateRankingPanel
          employerJobs={employerJobs}
          selectedJobId={selectedJobId}
          onSelectJob={setSelectedJobId}
          candidateSortBy={candidateSortBy}
          onSortByChange={setCandidateSortBy}
          candidateSortOrder={candidateSortOrder}
          onSortOrderChange={setCandidateSortOrder}
          showAppliedOnly={showAppliedOnly}
          onShowAppliedOnlyChange={setShowAppliedOnly}
          loadingMatches={loadingMatches}
          topCandidateMatches={topCandidateMatches}
          onQuickPostJob={() => router.push("/jobs/new")}
          onViewApplicant={(candidateId) =>
            router.push(`/applicants/${candidateId}?jobId=${selectedJobId}`)
          }
        />

        <RecruiterAnalytics recruiterOverview={recruiterOverview} />
    </div>
  );
}
