import type { Character } from "@/lib/types";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatCharacterContext(characters: Character[]): string {
  if (characters.length === 0) {
    return "No character profiles defined yet.";
  }

  return characters
    .map((character) => {
      const parts = [
        `${character.name} (${character.role})`,
        character.age != null ? `Age ${character.age}` : null,
        `Flaw: ${character.core_flaw ?? "unspecified"}`,
        `Motivation: ${character.primary_motivation ?? "unspecified"}`,
        character.physical_appearance
          ? `Appearance: ${character.physical_appearance}`
          : null,
      ].filter(Boolean);

      return parts.join(". ");
    })
    .join("\n");
}

export function getRelevantCharacters(
  draft: string,
  characters: Character[],
): Character[] {
  if (!draft.trim() || characters.length === 0) {
    return characters;
  }

  const mentioned = characters.filter((character) =>
    new RegExp(`\\b${escapeRegex(character.name)}\\b`, "i").test(draft),
  );

  return mentioned.length > 0 ? mentioned : characters;
}
