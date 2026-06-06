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

export type CharacterInput = Pick<
  Character,
  | "name"
  | "role"
  | "age"
  | "physical_appearance"
  | "core_flaw"
  | "primary_motivation"
>;
