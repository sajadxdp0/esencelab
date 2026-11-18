/**
 * Curated student resource catalog.
 *
 * This stays intentionally metadata-only. We link students to trusted
 * platforms and rank those links based on the selected role and missing
 * skills rather than scraping and storing third-party content.
 */
import { StudentResource } from '@/types';
import { RESOURCE_CATALOG, SKILL_ALIASES } from '@/lib/studentResources/catalog';

type StudentResourceFocus = NonNullable<StudentResource['supportFocus']>;

export interface SupportPlanResources {
  learn: StudentResource[];
  practice: StudentResource[];
  build: StudentResource[];
  interviewPrep: StudentResource[];
}

const normalizeSkill = (value: string): string => value.trim().toLowerCase();

const resourceMatchesSkill = (resource: StudentResource, skill: string): boolean => {
  const normalized = normalizeSkill(skill);
  const aliases = SKILL_ALIASES[normalized] || [normalized];
  return resource.skills.some((entry) => aliases.includes(normalizeSkill(entry)));
};

const resolveSupportFocus = (resource: StudentResource): StudentResourceFocus => {
  if (resource.supportFocus) return resource.supportFocus;
  if (resource.format === 'hands_on') return 'practice';
  return 'learn';
};

const scoreResource = (resource: StudentResource, roleId: string, missingSkills: string[]): number => {
  let score = 0;
  if (resource.roleIds.includes(roleId)) score += 8;
  if (resource.level === 'beginner') score += 2;
  if (resource.format === 'official_docs' || resource.format === 'guided_course') score += 2;
  if (resource.isOfficial) score += 2;
  if (resolveSupportFocus(resource) === 'build') score += 1;
  for (const skill of missingSkills) {
    if (resourceMatchesSkill(resource, skill)) score += 5;
  }
  return score;
};

const uniqueById = (resources: StudentResource[]): StudentResource[] => {
  const seen = new Set<string>();
  return resources.filter((resource) => {
    if (seen.has(resource.id)) return false;
    seen.add(resource.id);
    return true;
  });
};

export const getRoleStarterResources = (roleId: string, limit = 4): StudentResource[] => {
  return RESOURCE_CATALOG.filter((resource) => resource.roleIds.includes(roleId)).slice(0, limit);
};

export const getSkillGapResources = (
  roleId: string,
  missingSkills: string[],
  limit = 8,
): StudentResource[] => {
  return uniqueById(
    RESOURCE_CATALOG
      .filter(
        (resource) =>
          resource.roleIds.includes(roleId) ||
          missingSkills.some((skill) => resourceMatchesSkill(resource, skill))
      )
      .sort((left, right) => scoreResource(right, roleId, missingSkills) - scoreResource(left, roleId, missingSkills))
  ).slice(0, limit);
};

export const getTopResourceRecommendation = (
  roleId: string,
  missingSkills: string[],
): StudentResource | null => {
  return getSkillGapResources(roleId, missingSkills, 1)[0] || null;
};

export const getSupportPlanResources = (
  roleId: string,
  missingSkills: string[],
): SupportPlanResources => {
  const rankedResources = getSkillGapResources(roleId, missingSkills, RESOURCE_CATALOG.length);

  const pick = (focus: StudentResourceFocus, limit = 2) => {
    const primary = rankedResources.filter((resource) => resolveSupportFocus(resource) === focus);
    if (primary.length >= limit) return primary.slice(0, limit);

    const fallback = rankedResources.filter((resource) => {
      const resourceFocus = resolveSupportFocus(resource);
      if (resourceFocus === focus) return false;
      if (focus === 'build') return resourceFocus === 'practice' || resource.roadmapSource === 'roadmap.sh';
      if (focus === 'interview_prep') return resourceFocus === 'practice';
      return resourceFocus === 'learn';
    });

    return uniqueById([...primary, ...fallback]).slice(0, limit);
  };

  return {
    learn: pick('learn'),
    practice: pick('practice'),
    build: pick('build'),
    interviewPrep: pick('interview_prep'),
  };
};

export const getResourceCatalog = (): StudentResource[] => RESOURCE_CATALOG;
