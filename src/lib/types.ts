export type CharacterRole = "Protagonist" | "Antagonist" | "Supporting";

export const CHARACTER_ROLES: CharacterRole[] = [
  "Protagonist",
  "Antagonist",
  "Supporting",
];

export interface Story {
  id: string;
  user_id: string;
  title: string;
  synopsis: string | null;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  story_id: string;
  name: string;
  role: CharacterRole;
  age: number | null;
  physical_appearance: string | null;
  core_flaw: string | null;
  primary_motivation: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlotBeat {
  id: string;
  title: string;
}

export interface StoryChapter {
  id: string;
  story_id: string;
  act: string;
  title: string;
  sequence: number;
  plot_beats: PlotBeat[];
  plot_objectives: string;
  scene_beat: string;
  draft_content: string;
  created_at: string;
  updated_at: string;
}

export interface StoryWorkspace {
  story_id: string;
  draft_content: string;
  outline_json: unknown;
  setting_notes: string;
  scene_beat: string;
  slider_value: number;
  active_chapter_id: string | null;
  updated_at: string;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

export type GhostwriteTier = "assist" | "copilot" | "ghostwriter";

export type CharacterInput = Pick<
  Character,
  | "name"
  | "role"
  | "age"
  | "physical_appearance"
  | "core_flaw"
  | "primary_motivation"
>;
