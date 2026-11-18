"use client";

import { ArrowUpRight, Loader2 } from "lucide-react";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { scoreToPercent } from "@/app/(dashboard)/_components/dashboard/format";
import {
  CandidateSortBy,
  CandidateSortOrder,
} from "@/app/(dashboard)/_components/dashboard/types";
import { Job, RecruiterCandidateMatch } from "@/types";

interface CandidateRankingPanelProps {
  employerJobs: Job[];
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
  candidateSortBy: CandidateSortBy;
  onSortByChange: (value: CandidateSortBy) => void;
  candidateSortOrder: CandidateSortOrder;
  onSortOrderChange: (value: CandidateSortOrder) => void;
  showAppliedOnly: boolean;
  onShowAppliedOnlyChange: (value: boolean) => void;
  loadingMatches: boolean;
  topCandidateMatches: RecruiterCandidateMatch[];
  onQuickPostJob: () => void;
  onViewApplicant: (candidateId: string) => void;
}

export default function CandidateRankingPanel({
  employerJobs,
  selectedJobId,
  onSelectJob,
  candidateSortBy,
  onSortByChange,
  candidateSortOrder,
  onSortOrderChange,
  showAppliedOnly,
  onShowAppliedOnlyChange,
  loadingMatches,
  topCandidateMatches,
  onQuickPostJob,
  onViewApplicant,
}: CandidateRankingPanelProps) {
  return (
        <section>
          <div className="glass-panel rounded-3xl p-5 sm:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="min-w-0 break-words text-2xl font-serif text-primary">
                Candidate Ranking Summary
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={onQuickPostJob}
              >
                Quick Post Job <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            <div className="mb-8 grid gap-4 md:grid-cols-4">
              <div className="relative pt-2 md:col-span-2">
                <label className="absolute left-4 transition-all duration-200 pointer-events-none text-[10px] uppercase tracking-widest px-1 bg-transparent text-secondary z-10 -top-1 font-bold">
                  Select Active Job
                </label>
                <select
                  value={selectedJobId}
                  onChange={(event) => onSelectJob(event.target.value)}
                  className="w-full rounded-2xl border-[0.5px] border-border bg-white/50 px-4 py-4 font-sans text-primary text-base transition-all focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-sm relative z-0 appearance-none"
                >
                  {employerJobs.length === 0 && (
                    <option value="">No active jobs</option>
                  )}
                  {employerJobs.map((job) => (
                    <option
                      key={job.id}
                      value={job.id}
                      className="text-primary bg-white"
                    >
                      {job.title} - {job.company}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-[60%] -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-secondary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              <div className="relative pt-2">
                <label className="absolute left-4 transition-all duration-200 pointer-events-none text-[10px] uppercase tracking-widest px-1 bg-transparent text-secondary z-10 -top-1 font-bold">
                  Sort By
                </label>
                <select
                  value={candidateSortBy}
                  onChange={(event) =>
                    onSortByChange(
                      event.target.value as CandidateSortBy,
                    )
                  }
                  className="w-full rounded-2xl border-[0.5px] border-border bg-white/50 px-4 py-4 font-sans text-primary text-base transition-all focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-sm relative z-0 appearance-none"
                >
                  <option value="match">Highest Match %</option>
                  <option value="resume">Resume Score</option>
                  <option value="experience">Experience</option>
                </select>
              </div>
              <div className="relative pt-2">
                <label className="absolute left-4 transition-all duration-200 pointer-events-none text-[10px] uppercase tracking-widest px-1 bg-transparent text-secondary z-10 -top-1 font-bold">
                  Order
                </label>
                <select
                  value={candidateSortOrder}
                  onChange={(event) =>
                    onSortOrderChange(event.target.value as CandidateSortOrder)
                  }
                  className="w-full rounded-2xl border-[0.5px] border-border bg-white/50 px-4 py-4 font-sans text-primary text-base transition-all focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-sm relative z-0 appearance-none"
                >
                  <option value="desc">High to Low</option>
                  <option value="asc">Low to High</option>
                </select>
              </div>
            </div>
            <div className="mb-8">
              <label className="inline-flex items-center gap-2 text-sm text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAppliedOnly}
                  onChange={(event) => onShowAppliedOnlyChange(event.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Show only applicants who have applied
              </label>
            </div>

            {loadingMatches ? (
              <div className="flex items-center justify-center gap-3 py-16 text-sm font-sans font-medium text-secondary">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
                <span>Loading ranked candidates...</span>
              </div>
            ) : topCandidateMatches.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {topCandidateMatches.map((candidate) => {
                  const topSkills = (
                    candidate.topSkills ||
                    candidate.matchedSkills ||
                    candidate.skills ||
                    []
                  ).slice(0, 3);
                  const match = scoreToPercent(candidate.matchScore);
                  return (
                    <div
                      key={candidate.candidateId}
                      className="flex flex-col justify-between rounded-2xl border-[0.5px] border-border bg-white/60 p-5 shadow-sm transition-all hover:-translate-y-1 hover:bg-white hover:shadow-lg sm:p-6"
                    >
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-xl font-serif font-bold text-primary">
                            {candidate.name}
                          </p>
                          <p className="break-words text-xs text-secondary">
                            {candidate.email}
                          </p>
                        </div>
                        <Badge
                          variant={
                            match > 75
                              ? "success"
                              : match > 50
                                ? "warning"
                                : "secondary"
                          }
                          className="self-start px-2 py-1 font-sans text-[10px] font-semibold uppercase tracking-wide sm:self-auto"
                        >
                          {match}% Match
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg border border-border bg-white/80 px-2 py-1.5 text-secondary">
                            Resume Score:{" "}
                            <span className="font-semibold text-primary">
                              {candidate.resumeScore}%
                            </span>
                          </div>
                          <div className="rounded-lg border border-border bg-white/80 px-2 py-1.5 text-secondary">
                            Experience:{" "}
                            <span className="font-semibold text-primary">
                              {candidate.experienceYears} yrs
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-secondary mb-2">
                          Detected Skills
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {topSkills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-1 text-[10px] font-semibold bg-primary/5 text-primary border-[0.5px] border-border rounded-md uppercase tracking-wider"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                        {candidate.missingSkills?.length > 0 && (
                          <p className="text-xs text-secondary">
                            Missing:{" "}
                            {candidate.missingSkills.slice(0, 3).join(", ")}
                          </p>
                        )}
                        {candidate.hasApplied && (
                          <Badge variant="secondary" className="w-fit">
                            Applied - {candidate.applicationStatus || "pending"}
                          </Badge>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onViewApplicant(candidate.candidateId)
                        }
                        className="mt-4 w-full rounded-xl border-[0.5px] border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-black/5"
                      >
                        View Profile
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-lg font-sans font-light text-secondary">
                  No ranked candidates available for the selected job.
                </p>
              </div>
            )}
          </div>
        </section>
  );
}
