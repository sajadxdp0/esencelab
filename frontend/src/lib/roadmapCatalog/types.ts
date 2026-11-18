export type RoadmapCategory =
  | 'role'
  | 'beginner'
  | 'language_framework'
  | 'tool_platform'
  | 'foundation_best_practice';

export interface RoadmapCatalogEntry {
  slug: string;
  title: string;
  category: RoadmapCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  summary: string;
  audience: string;
  keyTopics: string[];
  directUrl: string;
  relatedTracks: string[];
}
