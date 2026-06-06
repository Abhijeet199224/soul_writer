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

export interface StoryWorkspace {
  story_id: string;
  draft_content: string;
  outline_json: unknown;
  setting_notes: string;
  scene_beat: string;
  slider_value: number;
  updated_at: string;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

export type CharacterInput = Pick<
  Character,
  | "name"
  | "role"
  | "age"
  | "physical_appearance"
  | "core_flaw"
  | "primary_motivation"
>;
