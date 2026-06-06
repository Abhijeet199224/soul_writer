import type { Character } from "@/lib/types";

export interface TextSegment {
  text: string;
  character?: Character;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitTextByCharacters(
  text: string,
  characters: Character[],
): TextSegment[] {
  if (!text || characters.length === 0) {
    return [{ text }];
  }

  const sorted = [...characters].sort((a, b) => b.name.length - a.name.length);
  const pattern = sorted.map((c) => escapeRegex(c.name)).join("|");
  const regex = new RegExp(`\\b(${pattern})\\b`, "gi");
  const nameMap = new Map(
    sorted.map((character) => [character.name.toLowerCase(), character]),
  );

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    const matchedName = match[0];
    const character = nameMap.get(matchedName.toLowerCase());
    segments.push({ text: matchedName, character });
    lastIndex = match.index + matchedName.length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text }];
}
