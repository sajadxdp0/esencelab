"use client";

/**
 * Main role-aware dashboard page.
 *
 * This page is the primary control center after login and switches between
 * student, recruiter, and admin summaries based on the current user role.
 * Role-specific views live under ./_components/dashboard.
 */
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import {
  AdminMonitoringData,
  Job,
  RecruiterCandidateMatch,
  RecruiterOverview,
  StudentRecommendations,
} from "@/types";
import {
  createJob,
  getAdminMonitoring,
  getCandidateMatches,
  getEmployerJobs,
  getRecruiterOverview,
  getReadableErrorMessage,
  getStudentRecommendations,
} from "@/lib/dashboardApi";
import DashboardSkeleton from "@/app/(dashboard)/_components/dashboard/DashboardSkeleton";
import EmployerDashboard from "@/app/(dashboard)/_components/dashboard/EmployerDashboard";
import AdminDashboard from "@/app/(dashboard)/_components/dashboard/AdminDashboard";
import {
  CandidateSortBy,
  CandidateSortOrder,
  JobFormState,
} from "@/app/(dashboard)/_components/dashboard/types";

const StudentUpskillingHub = dynamic(
  () => import("@/components/StudentUpskillingHub"),
  {
    loading: () => <DashboardSkeleton />,
  },
);

export default function DashboardPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [recommendations, setRecommendations] =
    useState<StudentRecommendations | null>(null);
  const [stats, setStats] = useState<AdminMonitoringData | null>(null);
  const [employerJobs, setEmployerJobs] = useState<Job[]>([]);
  const [recruiterOverview, setRecruiterOverview] =
    useState<RecruiterOverview | null>(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [candidateMatches, setCandidateMatches] = useState<
    RecruiterCandidateMatch[]
  >([]);
  const [candidateSortBy, setCandidateSortBy] =
    useState<CandidateSortBy>("match");
  const [candidateSortOrder, setCandidateSortOrder] =
    useState<CandidateSortOrder>("desc");
  const [showAppliedOnly, setShowAppliedOnly] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [postingJob, setPostingJob] = useState(false);
  const [jobForm, setJobForm] = useState<JobFormState>({
    title: "",
    company: "",
    description: "",
    location: "",
    requirements: "",
    experienceLevel: "mid",
    jobType: "full_time",
  });

  const fetchStudentDashboard = useCallback(
    async (forceRefresh = false) => {
      if (!user) return;
      try {
        const data = await getStudentRecommendations(user.id, forceRefresh);
        setRecommendations(data);
      } catch (error: unknown) {
        setMessage(
          getReadableErrorMessage(error, "Failed to load recommendations."),
        );
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const fetchEmployerDashboard = useCallback(async () => {
    try {
      const [jobs, overview] = await Promise.all([
        getEmployerJobs(),
        getRecruiterOverview(),
      ]);
      setEmployerJobs(jobs);
      setRecruiterOverview(overview);
      setSelectedJobId((current) => {
        if (current && jobs.some((job) => job.id === current)) return current;
        return jobs[0]?.id || "";
      });
    } catch (error: unknown) {
      setMessage(
        getReadableErrorMessage(error, "Failed to load recruiter dashboard."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdminDashboard = useCallback(async () => {
    try {
      const data = await getAdminMonitoring();
      setStats(data);
    } catch (error: unknown) {
      setMessage(
        getReadableErrorMessage(error, "Failed to load admin dashboard."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setMessage(null);

    if (user.role === "student") {
      void fetchStudentDashboard(false);
      return;
    }
    if (user.role === "employer") {
      void fetchEmployerDashboard();
      return;
    }
    void fetchAdminDashboard();
  }, [
    fetchAdminDashboard,
    fetchEmployerDashboard,
    fetchStudentDashboard,
    user,
  ]);

  const fetchCandidateRanking = useCallback(
    async (jobId: string) => {
      if (!jobId) {
        setCandidateMatches([]);
        return;
      }
      setLoadingMatches(true);
      try {
        const matches = await getCandidateMatches(jobId, {
          sortBy: candidateSortBy,
          order: candidateSortOrder,
          appliedOnly: showAppliedOnly,
          limit: 24,
        });
        setCandidateMatches(matches || []);
      } catch (error: unknown) {
        setMessage(
          getReadableErrorMessage(error, "Failed to load ranked candidates."),
        );
        setCandidateMatches([]);
      } finally {
        setLoadingMatches(false);
      }
    },
    [candidateSortBy, candidateSortOrder, showAppliedOnly],
  );

  useEffect(() => {
    if (user?.role !== "employer") return;
    void fetchCandidateRanking(selectedJobId);
  }, [
    candidateSortBy,
    candidateSortOrder,
    fetchCandidateRanking,
    selectedJobId,
    showAppliedOnly,
    user?.role,
  ]);

  const handleCreateJob = async (event: FormEvent) => {
    event.preventDefault();
    if (postingJob) return;

    setPostingJob(true);
    setMessage(null);
    try {
      await createJob(jobForm);
      setJobForm({
        title: "",
        company: "",
        description: "",
        location: "",
        requirements: "",
        experienceLevel: "mid",
        jobType: "full_time",
      });
      setMessage("Job posted successfully.");
      await fetchEmployerDashboard();
    } catch (error: unknown) {
      setMessage(getReadableErrorMessage(error, "Failed to create job."));
    } finally {
      setPostingJob(false);
    }
  };

  const topCandidateMatches = useMemo(() => {
    return [...candidateMatches].slice(0, 8);
  }, [candidateMatches]);

  if (!user || loading) {
    return <DashboardSkeleton />;
  }

  if (user.role === "student") {
    return (
      <>
        {message && (
          <div className="layout-container pt-8">
            <div className="rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-800">
              {message}
            </div>
          </div>
        )}
        <StudentUpskillingHub
          recommendations={recommendations}
          onRefresh={() => fetchStudentDashboard(true)}
        />
      </>
    );
  }

  if (user.role === "employer") {
    return (
      <EmployerDashboard
        message={message}
        recruiterOverview={recruiterOverview}
        employerJobs={employerJobs}
        selectedJobId={selectedJobId}
        setSelectedJobId={setSelectedJobId}
        candidateSortBy={candidateSortBy}
        setCandidateSortBy={setCandidateSortBy}
        candidateSortOrder={candidateSortOrder}
        setCandidateSortOrder={setCandidateSortOrder}
        showAppliedOnly={showAppliedOnly}
        setShowAppliedOnly={setShowAppliedOnly}
        loadingMatches={loadingMatches}
        topCandidateMatches={topCandidateMatches}
        jobForm={jobForm}
        setJobForm={setJobForm}
        postingJob={postingJob}
        handleCreateJob={handleCreateJob}
      />
    );
  }

  return <AdminDashboard message={message} stats={stats} />;
}
