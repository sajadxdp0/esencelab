import Card from "@/components/Card";
import DashboardStatCard from "@/app/(dashboard)/_components/dashboard/DashboardStatCard";
import InfoTile from "@/app/(dashboard)/_components/dashboard/InfoTile";
import {
  formatUptime,
  getAlertClassName,
} from "@/app/(dashboard)/_components/dashboard/format";
import { AdminMonitoringData } from "@/types";

interface AdminDashboardProps {
  message: string | null;
  stats: AdminMonitoringData | null;
}

export default function AdminDashboard({ message, stats }: AdminDashboardProps) {
  return (
    <div className="layout-container section-spacing space-y-10">
      <section>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-3 tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-lg font-sans text-secondary font-light">
          Monitor platform health, user activity, and moderation signals.
        </p>
      </section>

      {message && (
        <div className="rounded-2xl border-[0.5px] border-gray-300 bg-gray-100/50 px-6 py-4 text-sm font-sans font-medium text-gray-800 shadow-sm">
          {message}
        </div>
      )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardStatCard
            label="Total Users"
            value={stats?.totalUsers || 0}
            detail={<>Students {stats?.totalStudents || 0} - Recruiters {stats?.totalRecruiters || 0}</>}
          />
          <DashboardStatCard
            label="Resumes"
            value={stats?.totalResumes || 0}
            detail={<>Avg score {stats?.averageResumeScore || 0}%</>}
          />
          <DashboardStatCard
            label="Jobs"
            value={stats?.totalJobs || 0}
            detail={<>Active {stats?.activeJobs || 0} - Closed {stats?.closedJobs || 0}</>}
          />
          <DashboardStatCard
            label="Recruiter Requests"
            value={stats?.recruiterAccessRequests?.pending || 0}
            detail={<>Pending of {stats?.recruiterAccessRequests?.total || 0}</>}
          />
          <DashboardStatCard
            label="Applications"
            value={stats?.totalApplications || 0}
            detail={<>Avg match {stats?.averageMatchPercentage || 0}%</>}
          />
        </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card hoverable={false} className="p-6 space-y-4">
          <h2 className="text-xl font-serif text-primary">Resume Monitoring</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoTile label="Parsed" value={stats?.resumeMonitoring?.successfulParses || 0} />
            <InfoTile label="Failed" value={stats?.resumeMonitoring?.failedParses || 0} />
            <InfoTile label="Flagged" value={stats?.resumeMonitoring?.flaggedResumes || 0} />
          </div>
          <p className="text-sm text-secondary">
            Most applied role:{" "}
            {stats?.mostAppliedJob
              ? `${stats.mostAppliedJob.title} (${stats.mostAppliedJob.applications})`
              : "No applications yet"}
          </p>
        </Card>

        <Card hoverable={false} className="p-6 space-y-4">
          <h2 className="text-xl font-serif text-primary">Platform Health</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoTile label="Uptime" value={formatUptime(stats?.platformHealth?.uptimeSeconds || 0)} valueClassName="mt-1 font-semibold text-primary" />
            <InfoTile label="AI Service" value={stats?.platformHealth?.aiService?.status || "unknown"} valueClassName="mt-1 font-semibold text-primary" />
            <InfoTile label="API Error Rate" value={`${stats?.platformHealth?.apiErrorRate || 0}%`} valueClassName="mt-1 font-semibold text-primary" />
            <InfoTile label="Auth Failures" value={stats?.platformHealth?.authFailures || 0} valueClassName="mt-1 font-semibold text-primary" />
          </div>
          {stats?.platformHealth?.alerts?.length ? (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-secondary">
                Active alerts
              </p>
              {stats.platformHealth.alerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-3 text-xs ${getAlertClassName(alert.severity)}`}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-semibold text-primary">
                      {alert.title}
                    </span>
                    <span className="uppercase tracking-[0.12em]">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-1 leading-5">{alert.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-border bg-white p-3 text-sm text-secondary">
              No active platform alerts.
            </p>
          )}
          {stats?.platformHealth?.slowEndpoints?.length ? (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-secondary">
                Slow endpoints
              </p>
              {stats.platformHealth.slowEndpoints.slice(0, 3).map((entry) => (
                <div
                  key={entry.endpoint}
                  className="rounded-lg border border-border bg-white p-2 text-xs text-secondary"
                >
                  <span className="font-semibold text-primary">
                    {entry.endpoint}
                  </span>{" "}
                  - avg {entry.avgDurationMs}ms
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card hoverable={false} className="p-6 space-y-4">
          <h2 className="text-xl font-serif text-primary">
            Application Status
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <InfoTile label="Pending" value={stats?.applicationSummary?.byStatus?.pending || 0} />
            <InfoTile label="Shortlisted" value={stats?.applicationSummary?.byStatus?.shortlisted || 0} />
            <InfoTile label="Interview" value={stats?.applicationSummary?.byStatus?.interview || 0} />
            <InfoTile label="Rejected" value={stats?.applicationSummary?.byStatus?.rejected || 0} />
          </div>
        </Card>

        <Card hoverable={false} className="p-6 space-y-4">
          <h2 className="text-xl font-serif text-primary">
            Recent Admin Actions
          </h2>
          {stats?.recentAdminActions?.length ? (
            <div className="space-y-2">
              {stats.recentAdminActions.slice(0, 6).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border bg-white p-2 text-xs text-secondary"
                >
                  <span className="font-semibold text-primary">
                    {entry.actionType}
                  </span>{" "}
                  - {entry.targetType} -{" "}
                  {new Date(entry.createdAt).toLocaleString()}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-secondary">
              No admin actions recorded yet.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
