'use client';

import { useMemo } from "react";
import {
  CareerOverview,
  JobMatch,
  ResumeScoreEntry,
  StudentRecommendations,
  StudentResource,
} from "@/types";
import {
  getRoleStarterResources,
  getSkillGapResources,
  getSupportPlanResources,
  getTopResourceRecommendation,
  SupportPlanResources,
} from "@/lib/studentResources";
import { scoreToPercent } from "@/components/studentUpskilling/format";
import {
  NextStepCard,
  RoadmapLevelItem,
  ScoreSection,
} from "@/components/studentUpskilling/types";

export interface StudentUpskillingInsights {
  topRecommendedJobs: JobMatch[];
  topMissingSkills: string[];
  roleStarterResources: StudentResource[];
  skillGapResources: StudentResource[];
  topResourceRecommendation: StudentResource | null;
  supportPlanResources: SupportPlanResources;
  readiness: number;
  targetRole: string;
  roadmapByLevel: Record<string, RoadmapLevelItem[]>;
  scoreSections: ScoreSection[];
  scoreTrend: {
    width: number;
    height: number;
    points: Array<{ x: number; y: number }>;
    polyline: string;
    area: string;
  } | null;
  skillCompletionPercent: number;
  skillInProgressPercent: number;
  trackedApplicationCount: number;
  firstScoreEntry: ResumeScoreEntry | null;
  lastScoreEntry: ResumeScoreEntry | null;
  nextStepCards: NextStepCard[];
}

export function useStudentUpskillingInsights(
  recommendations: StudentRecommendations | null,
  overview: CareerOverview | null,
): StudentUpskillingInsights {
  const topRecommendedJobs = useMemo(() => {
    return (recommendations?.recommendedJobs || []).slice(0, 3);
  }, [recommendations?.recommendedJobs]);

  const topMissingSkills = useMemo(() => {
    const recommendationSkills = (recommendations?.missingSkills || []).slice(0, 8);
    if (recommendationSkills.length > 0) return recommendationSkills;
    return (overview?.missingSkills || []).slice(0, 8);
  }, [overview?.missingSkills, recommendations?.missingSkills]);

  const roleStarterResources = useMemo(() => {
    if (!overview?.roleId) return [] as StudentResource[];
    return getRoleStarterResources(overview.roleId, 4);
  }, [overview?.roleId]);

  const skillGapResources = useMemo(() => {
    if (!overview?.roleId) return [] as StudentResource[];
    return getSkillGapResources(overview.roleId, topMissingSkills, 8);
  }, [overview?.roleId, topMissingSkills]);

  const topResourceRecommendation = useMemo(() => {
    if (!overview?.roleId) return null;
    return getTopResourceRecommendation(overview.roleId, topMissingSkills);
  }, [overview?.roleId, topMissingSkills]);

  const supportPlanResources = useMemo(() => {
    if (!overview?.roleId) {
      return {
        learn: [] as StudentResource[],
        practice: [] as StudentResource[],
        build: [] as StudentResource[],
        interviewPrep: [] as StudentResource[],
      };
    }
    return getSupportPlanResources(overview.roleId, topMissingSkills);
  }, [overview?.roleId, topMissingSkills]);

  const readiness = useMemo(() => {
    if (overview?.latestScore) return scoreToPercent(overview.latestScore.score);
    if (topRecommendedJobs.length > 0) {
      const avg =
        topRecommendedJobs.reduce((sum, entry) => sum + scoreToPercent(entry.matchScore), 0) /
        topRecommendedJobs.length;
      return Math.round(avg);
    }
    return 25;
  }, [overview?.latestScore, topRecommendedJobs]);

  const targetRole = useMemo(() => {
    return overview?.role?.name || topRecommendedJobs[0]?.job?.title || 'your selected role';
  }, [overview?.role?.name, topRecommendedJobs]);

  const roadmapByLevel = useMemo(() => {
    const grouped: Record<string, RoadmapLevelItem[]> = {
      beginner: [],
      intermediate: [],
      advanced: [],
      other: [],
    };
    (overview?.roadmap || []).forEach((item) => {
      const level = item.level || 'other';
      if (!grouped[level]) grouped[level] = [];
      grouped[level].push(item);
    });
    return grouped;
  }, [overview?.roadmap]);

  const scoreSections = useMemo(() => {
    const sectionScores = overview?.latestScore?.sectionScores;
    if (!sectionScores) return [] as ScoreSection[];

    return [
      {
        key: 'skillsCompleteness',
        label: 'Skills completeness',
        value: scoreToPercent(Number(sectionScores.skillsCompleteness ?? sectionScores.skills ?? 0)),
      },
      {
        key: 'experienceRelevance',
        label: 'Experience relevance',
        value: scoreToPercent(Number(sectionScores.experienceRelevance ?? sectionScores.experience ?? 0)),
      },
      {
        key: 'projectStrength',
        label: 'Project quality',
        value: scoreToPercent(Number(sectionScores.projectStrength ?? sectionScores.projects ?? 0)),
      },
      {
        key: 'formattingConsistency',
        label: 'Resume structure',
        value: scoreToPercent(Number(sectionScores.formattingConsistency ?? sectionScores.education ?? 0)),
      },
    ];
  }, [overview?.latestScore?.sectionScores]);

  const scoreTrend = useMemo(() => {
    const historyScores = (overview?.scoreHistory || []).map((entry) => scoreToPercent(Number(entry.score || 0)));
    if (historyScores.length === 0) return null;

    const width = 340;
    const height = 120;
    const padding = 10;
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;
    const maxIndex = Math.max(historyScores.length - 1, 1);

    const points = historyScores.map((score, index) => {
      const x = padding + (index / maxIndex) * usableWidth;
      const y = padding + (1 - score / 100) * usableHeight;
      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      };
    });

    const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
    const area = `${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`;

    return { width, height, points, polyline, area };
  }, [overview?.scoreHistory]);

  const skillCompletionPercent = useMemo(() => {
    if (!overview?.progress?.totalSkills) return 0;
    return Math.round((overview.progress.skillsCompleted / overview.progress.totalSkills) * 100);
  }, [overview?.progress?.skillsCompleted, overview?.progress?.totalSkills]);

  const skillInProgressPercent = useMemo(() => {
    if (!overview?.progress?.totalSkills) return 0;
    return Math.round((overview.progress.skillsInProgress / overview.progress.totalSkills) * 100);
  }, [overview?.progress?.skillsInProgress, overview?.progress?.totalSkills]);

  const trackedApplicationCount = useMemo(() => {
    const counts = overview?.applicationStatusCounts;
    if (!counts) return 0;
    return counts.saved + counts.applied + counts.interviewing + counts.offer + counts.rejected;
  }, [overview?.applicationStatusCounts]);
  const firstScoreEntry = overview?.scoreHistory?.[0] || null;
  const lastScoreEntry =
    overview?.scoreHistory?.[overview.scoreHistory.length - 1] || null;

  const nextStepCards = useMemo(() => {
    const cards: NextStepCard[] = [];

    if (topMissingSkills[0]) {
      cards.push({
        id: 'gap',
        eyebrow: 'Close this gap first',
        title: topMissingSkills[0],
        detail: `This skill appears in your current roadmap and role-fit gaps. Marking it in progress will improve the rest of your plan.`,
        cta: 'Update roadmap below',
      });
    }

    if (topResourceRecommendation) {
      cards.push({
        id: 'resource',
        eyebrow: 'Study this next',
        title: topResourceRecommendation.title,
        detail: topResourceRecommendation.whyItHelps,
        href: topResourceRecommendation.url,
        external: true,
        cta: 'Open resource',
      });
    }

    if (topRecommendedJobs[0]) {
      cards.push({
        id: 'job',
        eyebrow: 'Best current opportunity',
        title: topRecommendedJobs[0].job.title,
        detail: `${scoreToPercent(topRecommendedJobs[0].matchScore)}% match at ${topRecommendedJobs[0].job.company}.`,
        href: `/jobs/${topRecommendedJobs[0].job.id}`,
        cta: 'View job',
      });
    }

    return cards.slice(0, 3);
  }, [topMissingSkills, topRecommendedJobs, topResourceRecommendation]);
  return {
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
  };
}
