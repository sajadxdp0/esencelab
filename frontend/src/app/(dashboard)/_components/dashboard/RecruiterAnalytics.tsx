import Badge from "@/components/Badge";
import Card from "@/components/Card";
import { scoreToPercent } from "@/app/(dashboard)/_components/dashboard/format";
import { RecruiterOverview } from "@/types";

interface RecruiterAnalyticsProps {
  recruiterOverview: RecruiterOverview | null;
}

export default function RecruiterAnalytics({
  recruiterOverview: overview,
}: RecruiterAnalyticsProps) {
  return (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card hoverable={false} className="p-6 space-y-4">
            <h2 className="text-2xl font-serif text-primary">
              Top Performing Candidates
            </h2>
            {overview?.topCandidates?.length ? (
              <div className="space-y-3">
                {overview.topCandidates
                  .slice(0, 5)
                  .map((candidate) => (
                    <div
                      key={`${candidate.studentId}-${candidate.jobId}`}
                      className="rounded-xl border border-border bg-white/70 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-primary">
                            {candidate.name}
                          </p>
                          <p className="break-words text-xs text-secondary">
                            {candidate.jobTitle}
                          </p>
                        </div>
                        <Badge
                          variant="success"
                          className="self-start sm:self-auto"
                        >
                          {scoreToPercent(candidate.matchScore)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-secondary">
                Top candidates appear after applications or ranking activity.
              </p>
            )}
          </Card>

          <Card hoverable={false} className="p-6 space-y-4">
            <h2 className="text-2xl font-serif text-primary">Job Analytics</h2>
            {overview?.perJobAnalytics?.length ? (
              <div className="space-y-3">
                {overview.perJobAnalytics.slice(0, 4).map((entry) => (
                  <div
                    key={entry.jobId}
                    className="rounded-xl border border-border bg-white/70 p-3 space-y-1"
                  >
                    <p className="text-sm font-semibold text-primary">
                      {entry.title}
                    </p>
                    <p className="text-xs text-secondary">
                      Applicants: {entry.totalApplicants} - Avg match:{" "}
                      {entry.averageMatch}% - Highest:{" "}
                      {entry.highestMatchCandidate?.matchScore || 0}%
                    </p>
                    {entry.mostMissingSkill && (
                      <p className="text-xs text-secondary">
                        Most missing skill:{" "}
                        <span className="font-semibold text-primary">
                          {entry.mostMissingSkill.skill}
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary">
                Post jobs and collect applications to unlock analytics.
              </p>
            )}
            {overview?.skillDemandInsights?.length ? (
              <div className="pt-2">
                <p className="text-xs uppercase tracking-[0.12em] text-secondary mb-2">
                  Skill demand insights
                </p>
                <div className="flex flex-wrap gap-2">
                  {overview.skillDemandInsights
                    .slice(0, 5)
                    .map((entry) => (
                      <span
                        key={entry.skill}
                        className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] text-secondary"
                      >
                        {entry.skill} ({entry.count})
                      </span>
                    ))}
                </div>
              </div>
            ) : null}
          </Card>
        </section>
  );
}
