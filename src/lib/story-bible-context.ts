import type { Character, StoryChapter } from "@/lib/types";
import type { OutlineBeat } from "@/lib/story-notes";
import { formatCharacterContext, getRelevantCharacters } from "@/lib/character-context";
import { formatChapterContext } from "@/lib/chapters";

export interface StoryBiblePayload {
  characters: Character[];
  outline: OutlineBeat[];
  settingNotes: string;
  sceneBeat?: string;
  chapter?: StoryChapter | null;
}

export function parseOutlineJson(value: unknown): OutlineBeat[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is OutlineBeat =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as OutlineBeat).id === "string" &&
        typeof (item as OutlineBeat).title === "string",
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      act: typeof item.act === "string" ? item.act : "Chapter 2",
    }));
}

export function indexCharactersByName(characters: Character[]) {
  return new Map(
    characters.map((character) => [character.name.toLowerCase(), character]),
  );
}

export function formatOutlineContext(outline: OutlineBeat[]): string {
  if (!outline.length) return "No plot outline defined yet.";
  return outline.map((beat) => `[${beat.act}] ${beat.title}`).join("\n");
}

export function formatSettingNotesContext(settingNotes: string): string {
  if (!settingNotes.trim()) return "No setting or lore notes yet.";
  return settingNotes.trim();
}

export function buildStoryBibleSystemBlock(
  bible: StoryBiblePayload,
  proseSample = "",
): string {
  const relevant = getRelevantCharacters(proseSample, bible.characters);
  const sceneLine = bible.sceneBeat?.trim()
    ? `Current scene beat: ${bible.sceneBeat.trim()}`
    : null;
  const chapterLine = bible.chapter
    ? formatChapterContext(bible.chapter)
    : null;

  return [
    "=== CHARACTER PROFILES ===",
    formatCharacterContext(relevant),
    "",
    "=== PLOT OUTLINE ===",
    formatOutlineContext(bible.outline),
    "",
    "=== SETTING & LORE NOTES ===",
    formatSettingNotesContext(bible.settingNotes),
    chapterLine ? `\n=== ACTIVE CHAPTER ===\n${chapterLine}` : null,
    sceneLine ? `\n=== ACTIVE SCENE ===\n${sceneLine}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function getCharactersUsedInText(
  proseSample: string,
  characters: Character[],
): string[] {
  return getRelevantCharacters(proseSample, characters).map((c) => c.name);
}
