import {
  ROADMAP_SLUGS,
  categoryLabels,
  categorySets,
  difficultyOverrides,
  relatedTrackOverrides,
  summaryOverrides,
  audienceOverrides,
  keyTopicOverrides,
  titleOverrides,
} from "@/lib/roadmapCatalog/data";
import { RoadmapCatalogEntry, RoadmapCategory } from "@/lib/roadmapCatalog/types";

export type { RoadmapCategory, RoadmapCatalogEntry } from "@/lib/roadmapCatalog/types";

const inferCategory = (slug: string): RoadmapCategory => {
  for (const [category, slugs] of Object.entries(categorySets) as Array<[RoadmapCategory, string[]]>) {
    if (slugs.includes(slug)) return category;
  }
  return 'role';
};

const inferDifficulty = (slug: string, category: RoadmapCategory): RoadmapCatalogEntry['difficulty'] => {
  if (difficultyOverrides[slug]) return difficultyOverrides[slug];
  if (category === 'beginner') return 'beginner';
  if (category === 'foundation_best_practice') return 'mixed';
  return 'intermediate';
};

const titleFromSlug = (slug: string): string => {
  if (titleOverrides[slug]) return titleOverrides[slug];
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const inferAudience = (slug: string, category: RoadmapCategory): string => {
  if (audienceOverrides[slug]) return audienceOverrides[slug];
  if (category === 'beginner') return 'Students who want a safer first-step roadmap before going deeper.';
  if (category === 'language_framework') return 'Students who want to strengthen one language or framework for projects and placements.';
  if (category === 'tool_platform') return 'Students who want stronger engineering workflows, environments, and delivery tools.';
  if (category === 'foundation_best_practice') return 'Students who want stronger fundamentals and more mature engineering habits.';
  return 'Students exploring a focused technical path with a structured learning sequence.';
};

const inferSummary = (slug: string, title: string, category: RoadmapCategory): string => {
  if (summaryOverrides[slug]) return summaryOverrides[slug];
  if (category === 'beginner') {
    return `A beginner-first ${title} path that helps you start with foundations, practice the basics, and build confidence before moving deeper.`;
  }
  if (category === 'language_framework') {
    return `A focused ${title} roadmap covering the core concepts, practical usage, and project-level skills needed to use ${title} confidently.`;
  }
  if (category === 'tool_platform') {
    return `A structured ${title} roadmap covering setup, workflows, production usage, and the practical habits that make engineering work more reliable.`;
  }
  if (category === 'foundation_best_practice') {
    return `A ${title} roadmap focused on stronger engineering judgment, system understanding, and production-ready habits.`;
  }
  return `A structured ${title} roadmap that helps you learn in the right order and turn topics into practical project progress.`;
};

const inferKeyTopics = (slug: string, title: string, category: RoadmapCategory): string[] => {
  if (keyTopicOverrides[slug]) return keyTopicOverrides[slug];
  if (category === 'beginner') return ['Core foundations', 'Starter projects', 'Next-step roadmap handoff'];
  if (category === 'language_framework') return [`${title} syntax and patterns`, 'Project usage', 'Interview-ready understanding'];
  if (category === 'tool_platform') return ['Setup and workflows', 'Production usage', 'Troubleshooting and operations'];
  if (category === 'foundation_best_practice') return ['Principles and patterns', 'Common mistakes', 'Production-level habits'];
  return ['Core concepts', 'Hands-on project work', 'Placement-focused revision'];
};

const buildRoadmapEntry = (slug: string): RoadmapCatalogEntry => {
  const category = inferCategory(slug);
  const title = titleFromSlug(slug);
  return {
    slug,
    title,
    category,
    difficulty: inferDifficulty(slug, category),
    summary: inferSummary(slug, title, category),
    audience: inferAudience(slug, category),
    keyTopics: inferKeyTopics(slug, title, category),
    directUrl: `https://roadmap.sh/${slug}`,
    relatedTracks: relatedTrackOverrides[slug] || [],
  };
};

export const ROADMAP_CATALOG: RoadmapCatalogEntry[] = ROADMAP_SLUGS.map(buildRoadmapEntry);

export const ROADMAP_CATEGORY_LABELS: Record<RoadmapCategory, string> = categoryLabels;

export const getRoadmapsForTrack = (trackId: string): RoadmapCatalogEntry[] =>
  ROADMAP_CATALOG.filter((entry) => entry.relatedTracks.includes(trackId));
