"use client";

import { useMemo } from "react";
import type { Character } from "@/lib/types";
import type { OutlineBeat } from "@/lib/story-notes";
import { getRelevantCharacters } from "@/lib/character-context";
import { indexCharactersByName } from "@/lib/story-bible-context";

export interface StoryBibleIndex {
  characters: Character[];
  charactersByName: Map<string, Character>;
  outline: OutlineBeat[];
  outlineById: Map<string, OutlineBeat>;
  settingNotes: string;
  getCharactersInText: (text: string) => Character[];
  getCharacterNamesInText: (text: string) => string[];
}

export function useStoryBibleIndex(
  characters: Character[],
  outline: OutlineBeat[],
  settingNotes: string,
): StoryBibleIndex {
  return useMemo(() => {
    const charactersByName = indexCharactersByName(characters);
    const outlineById = new Map(outline.map((beat) => [beat.id, beat]));

    return {
      characters,
      charactersByName,
      outline,
      outlineById,
      settingNotes,
      getCharactersInText: (text: string) =>
        getRelevantCharacters(text, characters),
      getCharacterNamesInText: (text: string) =>
        getRelevantCharacters(text, characters).map((c) => c.name),
    };
  }, [characters, outline, settingNotes]);
}
