'use client';

/**
 * Student upskilling workspace.
 *
 * This component groups roadmap progress, learning plans, AI coach output,
 * recommendations, and interview prep into one student-focused panel.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Compass,
  LineChart,
  Lightbulb,
  Loader2,
  RefreshCcw,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { CircularProgress, ProgressBar } from '@/components/Progress';
import { Skeleton } from '@/components/Skeleton';
import {
  CareerRole,
  CareerOverview,
  LearningPlan,
  Resume,
  StudentAICoachResponse,
  StudentRecommendations,
} from '@/types';
import {
  askStudentAICoach,
  clearRecommendationCache,
  getCareerRoles,
  getCareerOverview,
  getLearningPlan,
  getReadableErrorMessage,
  getResume,
  regenerateLearningPlan,
  saveJobForLater,
  setTargetRole,
  updateRoadmapSkill,
  uploadResume,
} from '@/lib/dashboardApi';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { aiCoachFeatures, aiPromptSuggestions } from '@/components/studentUpskilling/constants';
import { MAX_RESUME_FILE_SIZE_MB, shortDate, validatePdf } from '@/components/studentUpskilling/format';
import { useStudentUpskillingInsights } from '@/components/studentUpskilling/insights';
import FeedbackBanner from '@/components/studentUpskilling/FeedbackBanner';
import StatCard from '@/components/studentUpskilling/StatCard';
import NextStepCardView from '@/components/studentUpskilling/NextStepCardView';
import SkillGapResourceCard from '@/components/studentUpskilling/SkillGapResourceCard';
import StarterResourceLink from '@/components/studentUpskilling/StarterResourceLink';
import JobRecommendationCard from '@/components/studentUpskilling/JobRecommendationCard';
import {
  AICoachFeature,
  FeedbackState,
  RoadmapStatus,
} from '@/components/studentUpskilling/types';

interface StudentUpskillingHubProps {
  recommendations: StudentRecommendations | null;
  onRefresh: () => Promise<void>;
}

export default function StudentUpskillingHub({
  recommendations,
  onRefresh,
}: StudentUpskillingHubProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [overview, setOverview] = useState<CareerOverview | null>(null);
  const [availableRoles, setAvailableRoles] = useState<CareerRole[]>([]);
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);
  const [learningDuration, setLearningDuration] = useState<30 | 60>(30);
  const [loadingLearningPlan, setLoadingLearningPlan] = useState(false);
  const [regeneratingPlan, setRegeneratingPlan] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [updatingSkill, setUpdatingSkill] = useState<string | null>(null);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [aiFeature, setAiFeature] = useState<AICoachFeature>('skill_gap');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCoachResponse, setAiCoachResponse] = useState<StudentAICoachResponse | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const resumeData = await getResume();
      setResume(resumeData);

      if (resumeData) {
        const overviewData = await getCareerOverview();
        setOverview(overviewData);
      } else {
        setOverview(null);
        setLearningPlan(null);
      }
    } catch (error: unknown) {
      setFeedback({
        tone: 'error',
        text: getReadableErrorMessage(error, 'Unable to load dashboard data.'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLearningPlanForDuration = useCallback(
    async (duration: 30 | 60, forceRegenerate = false) => {
      if (!overview?.roleId || !resume) return false;

      if (forceRegenerate) {
        setRegeneratingPlan(true);
      } else {
        setLoadingLearningPlan(true);
      }

      try {
        const planData = forceRegenerate
          ? await regenerateLearningPlan(overview.roleId, duration)
          : await getLearningPlan(overview.roleId, duration);
        setLearningPlan(planData);
        return true;
      } catch (error: unknown) {
        setFeedback({
          tone: 'error',
          text: getReadableErrorMessage(error, 'Unable to load learning plan.'),
        });
        return false;
      } finally {
        setLoadingLearningPlan(false);
        setRegeneratingPlan(false);
      }
    },
    [overview?.roleId, resume]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    const loadRoles = async () => {
      try {
        const roles = await getCareerRoles();
        if (!cancelled) setAvailableRoles(roles);
      } catch {
        if (!cancelled) setAvailableRoles([]);
      }
    };

    void loadRoles();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!resume?.id || !overview?.roleId) {
      setLearningPlan(null);
      return;
    }
    void loadLearningPlanForDuration(learningDuration, false);
  }, [learningDuration, loadLearningPlanForDuration, overview?.roleId, resume?.id]);

  const {
    topRecommendedJobs,
    topMissingSkills,
    roleStarterResources,
    skillGapResources,
    topResourceRecommendation,
    supportPlanResources,
    readiness,
    targetRole,
    roadmapByLevel,
    scoreSections,
    scoreTrend,
    skillCompletionPercent,
    skillInProgressPercent,
    trackedApplicationCount,
    firstScoreEntry,
    lastScoreEntry,
    nextStepCards,
  } = useStudentUpskillingInsights(recommendations, overview);

  const handleRoadmapStatusCycle = async (skillName: string, current: RoadmapStatus) => {
    if (!overview || updatingSkill) return;
    const nextStatus: RoadmapStatus =
      current === 'missing' ? 'in_progress' : current === 'in_progress' ? 'completed' : 'missing';

    setUpdatingSkill(skillName);
    try {
      const result = await updateRoadmapSkill({
        roleId: overview.roleId,
        skillName,
        status: nextStatus,
      });
      setOverview((prev) => (prev ? { ...prev, roadmap: result.roadmap } : prev));
    } catch (error: unknown) {
      setFeedback({
        tone: 'error',
        text: getReadableErrorMessage(error, 'Unable to update roadmap skill right now.'),
      });
    } finally {
      setUpdatingSkill(null);
    }
  };

  const processResumeUpload = async (candidate: File | null) => {
    if (!candidate || uploading) return;
    const validationError = validatePdf(candidate);
    if (validationError) {
      setFeedback({ tone: 'error', text: validationError });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setFeedback({ tone: 'info', text: 'Analyzing your resume...' });

    try {
      const parsedResume = await uploadResume(candidate, setUploadProgress);
      setResume(parsedResume);
      if (user?.id) clearRecommendationCache(user.id);
      await Promise.all([onRefresh(), loadData()]);
      setFeedback({
        tone: 'success',
        text: 'Your profile has been analyzed successfully.',
      });
    } catch (error: unknown) {
      setFeedback({
        tone: 'error',
        text: getReadableErrorMessage(error, 'Unable to analyze your resume right now.'),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRegenerateLearningPlan = async () => {
    const isUpdated = await loadLearningPlanForDuration(learningDuration, true);
    if (isUpdated) {
      setFeedback({
        tone: 'success',
        text: `${learningDuration}-day learning plan regenerated.`,
      });
    }
  };

  const handleTargetRoleChange = async (roleId: string) => {
    if (!overview || switchingRole || roleId === overview.roleId) return;
    setSwitchingRole(true);
    try {
      await setTargetRole(roleId);
      if (user?.id) clearRecommendationCache(user.id);
      setAiCoachResponse(null);
      await Promise.all([onRefresh(), loadData()]);
      setFeedback({
        tone: 'success',
        text: 'Learning track updated. Your roadmap and support resources have been refreshed.',
      });
    } catch (error: unknown) {
      setFeedback({
        tone: 'error',
        text: getReadableErrorMessage(error, 'Unable to switch learning track right now.'),
      });
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleSaveJob = async (jobId: string) => {
    if (savingJobId) return;
    setSavingJobId(jobId);
    try {
      await saveJobForLater(jobId);
      const updatedOverview = await getCareerOverview();
      setOverview(updatedOverview);
      setFeedback({ tone: 'success', text: 'Job saved to your application tracker.' });
    } catch (error: unknown) {
      setFeedback({
        tone: 'error',
        text: getReadableErrorMessage(error, 'Unable to save this job right now.'),
      });
    } finally {
      setSavingJobId(null);
    }
  };

  const handleRunAICoach = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const result = await askStudentAICoach({
        feature: aiFeature,
        prompt: aiPrompt,
      });
      setAiCoachResponse(result);
      setFeedback({
        tone: 'success',
        text:
          result.provider === 'groq'
            ? 'AI coach response generated.'
            : 'AI fallback guidance generated.',
      });
    } catch (error: unknown) {
      setFeedback({
        tone: 'error',
        text: getReadableErrorMessage(error, 'Unable to generate AI guidance right now.'),
      });
    } finally {
      setAiLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="space-y-8 layout-container section-spacing">
        <Skeleton className="h-24 w-full max-w-2xl" />
        <Skeleton className="h-64 w-full" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="layout-container section-spacing flex min-h-[70vh] flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-5xl"
        >
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-serif font-semibold tracking-tight text-primary md:text-4xl">
              Upload Your Resume
            </h2>
            <p className="mx-auto max-w-2xl text-base text-secondary">
              Upload a PDF to generate career insights and role matching, or start with guided domain discovery if you are new and still exploring.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
            <Card
              hoverable={false}
              className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed bg-transparent p-6 text-center transition-colors hover:bg-white/40 sm:p-8 md:p-12"
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="w-full max-w-sm space-y-4">
                  <div className="flex items-center justify-center gap-3 text-sm text-secondary">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <span>Analyzing your resume...</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <UploadCloud className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-primary">I already have a resume</h3>
                  <p className="mb-6 text-sm text-secondary">
                    Upload a PDF up to {MAX_RESUME_FILE_SIZE_MB}MB and continue with the normal Esencelab flow.
                  </p>
                  <Button variant="primary">Browse Files</Button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(event) => {
                  void processResumeUpload(event.target.files?.[0] || null);
                  event.currentTarget.value = '';
                }}
              />
            </Card>

            <Card hoverable={false} className="space-y-5 p-6 sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Compass className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-primary">I am new and need help choosing a domain</h3>
                <p className="text-sm leading-6 text-secondary">
                  If you are a first-year student or still unsure about frontend, backend, data, ECE, or EEE paths, start with guided discovery before creating your first resume.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white/70 p-4 text-sm text-secondary">
                Esencelab will suggest a likely-fit domain, starter skills, project ideas, and the resume sections to create first.
              </div>
              <Link href="/resume?mode=discover" className="inline-flex">
                <Button variant="outline" className="min-h-[44px]">
                  Start domain discovery
                </Button>
              </Link>
            </Card>
          </div>

      <AnimatePresence>
        {feedback && <FeedbackBanner feedback={feedback} variant="compact" />}
      </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="layout-container section-spacing space-y-12">
      <section className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-primary leading-tight">
          Career Control Center
        </h1>
        <p className="text-base text-secondary max-w-3xl">
          {recommendations?.summary ||
            `Track your readiness, close skill gaps, and target better roles as a ${targetRole} candidate.`}
        </p>
      </section>

      {overview?.role && (
        <section>
          <Card hoverable={false} className="p-6 space-y-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Learning track</Badge>
                  {overview.role.track ? (
                    <Badge variant="secondary" className="capitalize">
                      {overview.role.track}
                    </Badge>
                  ) : null}
                </div>
                <h2 className="text-2xl font-serif text-primary">{overview.role.name}</h2>
                <p className="max-w-3xl text-sm text-secondary">{overview.role.description}</p>
              </div>

              <div className="w-full max-w-sm space-y-2">
                <label className="block text-xs uppercase tracking-[0.12em] text-secondary">
                  Switch your target track
                </label>
                <select
                  value={overview.roleId}
                  onChange={(event) => void handleTargetRoleChange(event.target.value)}
                  disabled={switchingRole || availableRoles.length === 0}
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {(availableRoles.length > 0 ? availableRoles : [overview.role]).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-secondary">
                  Change this when you want Esencelab to rebuild your roadmap, learning plan, and resource suggestions for another path.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-secondary">Best fit for</p>
                <p className="mt-2 text-sm font-medium text-primary">
                  {overview.role.recommendedFor?.join(', ') || 'All motivated students'}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-secondary">Roadmap source</p>
                <p className="mt-2 text-sm font-medium text-primary">
                  {overview.role.roadmapSource || 'Esencelab curated path'}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-secondary">Year guidance</p>
                <p className="mt-2 text-sm font-medium text-primary">
                  {overview.role.yearGuidance?.[0] || 'Build fundamentals early and convert them into projects before placement season.'}
                </p>
              </div>
            </div>
          </Card>
        </section>
      )}

      <AnimatePresence>
        {feedback && <FeedbackBanner feedback={feedback} />}
      </AnimatePresence>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Career readiness" value={`${readiness}%`} />
        <StatCard label="Resume improvement" value={`+${overview?.progress?.resumeImprovement || 0}%`} />
        <StatCard label="Skills completed" value={`${overview?.progress?.skillsCompleted || 0}/${overview?.progress?.totalSkills || 0}`} />
        <StatCard label="Applications tracked" value={trackedApplicationCount} />
      </section>

      <section>
        <div className="glass-panel flex flex-col items-center justify-between gap-8 rounded-[2.5rem] p-6 md:flex-row md:gap-12 md:p-12">
          <div className="space-y-5 max-w-lg text-center md:text-left flex-1">
            <h2 className="text-3xl font-serif text-primary">Resume Strength Score</h2>
            <p className="text-base text-secondary">
              Your resume is <span className="font-semibold text-primary">{readiness}% optimized</span> for the{' '}
              <span className="font-semibold text-primary">{targetRole}</span> role.
            </p>
            {uploading ? (
              <div className="flex items-center md:justify-start justify-center gap-3 text-sm font-medium text-accent">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Updating profile insights...</span>
              </div>
            ) : (
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="h-11 px-7 rounded-full text-base bg-primary text-white hover:bg-black/80 transition-all"
              >
                Update Resume
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(event) => {
                void processResumeUpload(event.target.files?.[0] || null);
                event.currentTarget.value = '';
              }}
            />
          </div>
          <div className="flex-shrink-0 relative">
            <div className="absolute inset-0 bg-accent/10 blur-[50px] rounded-full" />
            <div className="p-4 rounded-full border-[0.5px] border-border bg-white/50 relative z-10 shadow-2xl shadow-black/5">
              <CircularProgress value={readiness} max={100} size={168} strokeWidth={8} />
            </div>
          </div>
        </div>
      </section>

      {overview?.latestScore && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="text-2xl font-serif text-primary">Resume Score Breakdown</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
            <Card hoverable={false} className="p-6 space-y-5">
              {scoreSections.map((section) => (
                <div key={section.key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">{section.label}</span>
                    <span className="font-semibold text-primary">{section.value}%</span>
                  </div>
                  <ProgressBar
                    value={section.value}
                    className="h-2 bg-white"
                    barClassName={section.value >= 75 ? 'bg-[#111111]' : section.value >= 55 ? 'bg-[#4b4b4b]' : 'bg-[#a3a3a3]'}
                  />
                </div>
              ))}
            </Card>
            <Card hoverable={false} className="p-6">
              <p className="text-xs uppercase tracking-[0.12em] text-secondary mb-3">Improve next</p>
              <ul className="space-y-2 text-sm text-secondary">
                {(overview.latestScore.suggestions || []).slice(0, 4).map((item) => (
                  <li key={item} className="rounded-lg border border-border bg-white/70 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>
      )}

      <section className="space-y-6">
        <h2 className="text-2xl font-serif text-primary">Skill Gap Summary</h2>
        <div className="flex flex-wrap gap-3">
          {topMissingSkills.length > 0 ? (
            topMissingSkills.map((skill) => (
              <div
                key={skill}
                className="px-4 py-2 rounded-xl border-[0.5px] border-accent/20 bg-accent/5 text-accent text-xs font-semibold uppercase tracking-widest"
              >
                {skill}
              </div>
            ))
          ) : (
            <p className="text-sm text-secondary bg-white/50 border-[0.5px] border-border py-4 px-6 rounded-2xl w-full">
              Great progress. Your profile already covers most role requirements.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <Card hoverable={false} className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif text-primary">Progress Tracking</h2>
            <Badge variant="secondary">
              <LineChart className="mr-1 h-3 w-3" /> Score history
            </Badge>
          </div>

          {scoreTrend && (overview?.scoreHistory || []).length > 0 ? (
            <>
              <div className="rounded-2xl border border-border bg-white/60 p-3">
                <svg viewBox={`0 0 ${scoreTrend.width} ${scoreTrend.height}`} className="h-32 w-full" role="img" aria-label="Resume score trend">
                  <polyline points={scoreTrend.area} fill="rgba(17,17,17,0.16)" stroke="none" />
                  <polyline
                    points={scoreTrend.polyline}
                    fill="none"
                    stroke="rgba(17,17,17,1)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {scoreTrend.points.map((point, index) => (
                    <circle key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} r="2.5" fill="rgba(17,17,17,1)" />
                  ))}
                </svg>
              </div>
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>{firstScoreEntry ? shortDate(firstScoreEntry.createdAt) : '-'}</span>
                <span>{lastScoreEntry ? shortDate(lastScoreEntry.createdAt) : '-'}</span>
              </div>
              <p className="text-sm text-secondary">
                You improved <span className="font-semibold text-primary">{overview?.progress?.resumeImprovement || 0}%</span> in this period.
              </p>
            </>
          ) : (
            <p className="text-sm text-secondary">Upload and update your resume to start tracking score history.</p>
          )}
        </Card>

        <Card hoverable={false} className="p-6 space-y-5">
          <h2 className="text-xl font-serif text-primary">Module Snapshot</h2>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-secondary">
                <span>Skill completion</span>
                <span>{skillCompletionPercent}%</span>
              </div>
              <ProgressBar value={skillCompletionPercent} className="h-2" barClassName="bg-[#111111]" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-secondary">
                <span>Skills in progress</span>
                <span>{skillInProgressPercent}%</span>
              </div>
              <ProgressBar value={skillInProgressPercent} className="h-2" barClassName="bg-[#4b4b4b]" />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white/60 p-4 text-sm text-secondary space-y-1">
            <p>Saved: {overview?.applicationStatusCounts?.saved || 0}</p>
            <p>Applied: {overview?.applicationStatusCounts?.applied || 0}</p>
            <p>Interviewing: {overview?.applicationStatusCounts?.interviewing || 0}</p>
            <p>Offer: {overview?.applicationStatusCounts?.offer || 0}</p>
            <p>Rejected: {overview?.applicationStatusCounts?.rejected || 0}</p>
          </div>

          <Link href="/applications" className="inline-flex items-center text-sm font-semibold text-accent hover:underline">
            Open application tracker <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-serif text-primary">Skill Roadmap Checklist</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
            <Card key={level} hoverable={false} className="p-5 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary">{level}</h3>
              {(roadmapByLevel[level] || []).length > 0 ? (
                <div className="space-y-2">
                  {(roadmapByLevel[level] || []).map((item) => (
                    <button
                      key={`${level}-${item.skill}`}
                      onClick={() => void handleRoadmapStatusCycle(item.skill, item.status)}
                      disabled={updatingSkill === item.skill}
                      className="w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-left text-sm transition hover:bg-white disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="line-clamp-1">{item.skill}</span>
                        <Badge
                          variant={
                            item.status === 'completed'
                              ? 'success'
                              : item.status === 'in_progress'
                                ? 'warning'
                                : 'secondary'
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-secondary">No skills mapped in this stage.</p>
              )}
            </Card>
          ))}
        </div>
      </section>

      {nextStepCards.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-accent" />
            <h2 className="text-2xl font-serif text-primary">What To Do Next</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {nextStepCards.map((card) => (
              <NextStepCardView key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-serif text-primary">Learning Plan</h2>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-border bg-white/70 p-1">
              <button
                type="button"
                onClick={() => setLearningDuration(30)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  learningDuration === 30 ? 'bg-primary text-white' : 'text-secondary hover:text-primary'
                }`}
              >
                30-Day
              </button>
              <button
                type="button"
                onClick={() => setLearningDuration(60)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  learningDuration === 60 ? 'bg-primary text-white' : 'text-secondary hover:text-primary'
                }`}
              >
                60-Day
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              isLoading={regeneratingPlan}
              onClick={() => void handleRegenerateLearningPlan()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
          </div>
        </div>

        {loadingLearningPlan ? (
          <Card hoverable={false} className="p-6 text-sm text-secondary">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading learning plan...
            </div>
          </Card>
        ) : learningPlan?.planData?.weeks?.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {learningPlan.planData.weeks
              .slice(0, learningDuration === 60 ? 8 : 4)
              .map((week) => (
                <Card key={week.week} hoverable={false} className="p-5 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-secondary">Week {week.week}</p>
                    <h3 className="text-lg font-semibold text-primary">{week.title}</h3>
                  </div>
                  <ul className="space-y-1 text-sm text-secondary">
                    {week.goals.slice(0, 3).map((goal) => (
                      <li key={goal} className="line-clamp-2">
                        {goal}
                      </li>
                    ))}
                  </ul>
                  {week.resources?.length > 0 && (
                    <a
                      href={week.resources[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-semibold text-accent hover:underline"
                    >
                      Resource: {week.resources[0].title}
                    </a>
                  )}
                </Card>
              ))}
          </div>
        ) : (
          <Card hoverable={false} className="p-6 text-sm text-secondary">
            Learning plan will appear after roadmap generation.
          </Card>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent" />
          <h2 className="text-2xl font-serif text-primary">AI Career Coach</h2>
        </div>
        <Card hoverable={false} className="space-y-6 p-6">
          <div className="rounded-2xl border border-border bg-white/60 p-4 text-sm text-secondary">
            This coach uses your resume, roadmap, recommendations, and saved progress so the response is based on
            your actual student profile, not a generic prompt.
          </div>
          <div className="grid gap-4 xl:grid-cols-[240px,1fr]">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-secondary">Feature</label>
              <select
                value={aiFeature}
                onChange={(event) =>
                  setAiFeature(
                    event.target.value as AICoachFeature
                  )
                }
                className="min-h-[44px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
              >
                {aiCoachFeatures.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-secondary">Prompt (optional)</label>
              <input
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                placeholder={aiPromptSuggestions[aiFeature][0]}
                className="min-h-[44px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-white/60 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-secondary">Suggested prompts</p>
            <div className="flex flex-wrap gap-2">
              {aiPromptSuggestions[aiFeature].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setAiPrompt(suggestion)}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-xs text-secondary transition hover:border-primary hover:text-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button isLoading={aiLoading} onClick={() => void handleRunAICoach()} className="min-h-[44px] rounded-full">
              Generate guidance
            </Button>
            {aiCoachResponse && (
              <Badge variant="secondary">
                Provider: {aiCoachResponse.provider}
                {aiCoachResponse.model ? ` (${aiCoachResponse.model})` : ''}
              </Badge>
            )}
          </div>

          {aiCoachResponse && (
            <div className="space-y-4 rounded-2xl border border-border bg-white/70 p-4">
              <h3 className="text-lg font-semibold text-primary">{aiCoachResponse.title}</h3>
              <p className="text-sm text-secondary">{aiCoachResponse.summary}</p>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.12em] text-secondary">Action Items</p>
                <ul className="space-y-2">
                  {aiCoachResponse.actionItems.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-secondary">
                      <Lightbulb className="mt-0.5 h-4 w-4 text-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {aiCoachResponse.followUpQuestions.length > 0 && (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.12em] text-secondary">Follow-up</p>
                  <div className="flex flex-wrap gap-2">
                    {aiCoachResponse.followUpQuestions.map((question) => (
                      <span
                        key={question}
                        className="rounded-full border border-border bg-white px-3 py-1 text-xs text-secondary"
                      >
                        {question}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <h2 className="text-2xl font-serif text-primary">Student Resource Library</h2>
          </div>
          <Badge variant="secondary">Resume-based support from trusted external resources</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              id: 'learn',
              title: 'Learn now',
              description: 'Start with structured explanations and official guidance.',
              resources: supportPlanResources.learn,
            },
            {
              id: 'practice',
              title: 'Practice now',
              description: 'Use guided exercises to turn theory into confidence.',
              resources: supportPlanResources.practice,
            },
            {
              id: 'build',
              title: 'Build next',
              description: 'Create something portfolio-ready so your resume improves.',
              resources: supportPlanResources.build,
            },
            {
              id: 'interview',
              title: 'Prepare for interviews',
              description: 'Sharpen problem solving and revision for hiring rounds.',
              resources: supportPlanResources.interviewPrep,
            },
          ].map((group) => (
            <Card key={group.id} hoverable={false} className="space-y-3 p-5">
              <div>
                <p className="text-sm font-semibold text-primary">{group.title}</p>
                <p className="mt-1 text-sm text-secondary">{group.description}</p>
              </div>
              {group.resources[0] ? (
                <a
                  href={group.resources[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl border border-border bg-white/70 p-4 transition hover:bg-white"
                >
                  <p className="text-sm font-semibold text-primary">{group.resources[0].title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-secondary">
                    {group.resources[0].provider}
                  </p>
                </a>
              ) : (
                <div className="rounded-2xl border border-border bg-white/60 p-4 text-sm text-secondary">
                  More support will appear as your missing skills become clearer.
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <Card hoverable={false} className="p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-secondary">Best matches for your gaps</p>
                <h3 className="text-xl font-serif text-primary">Start with these resources</h3>
              </div>
              <span className="text-sm font-semibold text-secondary">Picked from your missing skills and target role</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {skillGapResources.length > 0 ? (
                skillGapResources.map((resource) => (
                  <SkillGapResourceCard key={resource.id} resource={resource} />
                ))
              ) : (
                <p className="text-sm text-secondary">No extra resources are needed right now. Your gaps are already narrow.</p>
              )}
            </div>
          </Card>

          <Card hoverable={false} className="p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-secondary">Role starter pack</p>
              <h3 className="text-xl font-serif text-primary">Trusted resources for {targetRole}</h3>
            </div>

            <div className="space-y-3">
              {roleStarterResources.map((resource) => (
                <StarterResourceLink key={resource.id} resource={resource} />
              ))}
            </div>

            {overview?.role?.suggestedTools?.length ? (
              <div className="rounded-2xl border border-border bg-white/60 p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.12em] text-secondary">Tools to install or practice</p>
                <div className="flex flex-wrap gap-2">
                  {overview.role.suggestedTools.map((tool) => (
                    <span key={tool} className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] text-secondary">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-serif text-primary">Top Job Recommendations</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {topRecommendedJobs.length > 0 ? (
            topRecommendedJobs.map((entry) => {
              return (
                <JobRecommendationCard
                  key={entry.job.id}
                  entry={entry}
                  savingJobId={savingJobId}
                  onSave={(jobId) => void handleSaveJob(jobId)}
                />
              );
            })
          ) : (
            <div className="md:col-span-2 lg:col-span-3 glass-panel p-8 rounded-3xl text-center">
              <p className="text-base font-light text-secondary">
                No job matches found yet. Upload a stronger resume and update roadmap skills to improve matching.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
