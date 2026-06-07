import type { Character } from "@/lib/types";
import { htmlToPlainText } from "@/lib/draft-content";

export type CascadeMatchMode = "word" | "phrase";

export type CascadeableCharacterField =
  | "name"
  | "physical_appearance"
  | "core_flaw"
  | "primary_motivation"
  | "pronouns"
  | "age"
  | "alias";

export interface CharacterTextChange {
  field: CascadeableCharacterField;
  fieldLabel: string;
  oldText: string;
  newText: string;
  matchMode: CascadeMatchMode;
}

export const CHARACTER_FIELD_LABELS: Record<CascadeableCharacterField, string> =
  {
    name: "character name",
    physical_appearance: "physical appearance",
    core_flaw: "core flaw",
    primary_motivation: "primary motivation",
    pronouns: "pronouns",
    age: "age reference",
    alias: "character alias",
  };

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function preserveReplacementCase(original: string, replacement: string): string {
  if (!replacement) return replacement;
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original === original.toLowerCase()) return replacement.toLowerCase();
  if (original[0] === original[0]?.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function parseAliasList(value: string | null | undefined): string[] {
  return normalizeNullable(value)
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildAgeChange(
  previousAge: number | null,
  nextAge: number | null,
  optIn: boolean,
): CharacterTextChange | null {
  if (!optIn || previousAge == null || nextAge == null || previousAge === nextAge) {
    return null;
  }
  return {
    field: "age",
    fieldLabel: CHARACTER_FIELD_LABELS.age,
    oldText: `Age ${previousAge}`,
    newText: `Age ${nextAge}`,
    matchMode: "phrase",
  };
}

function buildAliasChanges(
  previousAliases: string | null | undefined,
  nextAliases: string | null | undefined,
): CharacterTextChange[] {
  const oldAliases = parseAliasList(previousAliases);
  const newAliases = new Set(parseAliasList(nextAliases).map((alias) => alias.toLowerCase()));
  const changes: CharacterTextChange[] = [];

  for (const alias of oldAliases) {
    if (newAliases.has(alias.toLowerCase())) continue;
    changes.push({
      field: "alias",
      fieldLabel: `${CHARACTER_FIELD_LABELS.alias} “${alias}”`,
      oldText: alias,
      newText: "",
      matchMode: "word",
    });
  }

  return changes;
}

function normalizeNullable(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function parsePronounTokens(value: string | null | undefined): string[] {
  const raw = normalizeNullable(value);
  if (!raw) return [];
  return raw
    .split(/[/,|]+/)
    .flatMap((part) => part.split(/\s+/))
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildPronounTokenChanges(
  oldPronouns: string | null | undefined,
  newPronouns: string | null | undefined,
): CharacterTextChange[] {
  const oldTokens = parsePronounTokens(oldPronouns);
  const newTokens = parsePronounTokens(newPronouns);
  const pairCount = Math.min(oldTokens.length, newTokens.length);
  const changes: CharacterTextChange[] = [];

  for (let index = 0; index < pairCount; index += 1) {
    const oldText = oldTokens[index];
    const newText = newTokens[index];
    if (
      !oldText ||
      !newText ||
      oldText.toLowerCase() === newText.toLowerCase() ||
      oldText.length < 2
    ) {
      continue;
    }

    changes.push({
      field: "pronouns",
      fieldLabel: `pronoun “${oldText}”`,
      oldText,
      newText,
      matchMode: "word",
    });
  }

  return changes;
}

function buildPhraseChange(
  field: Exclude<CascadeableCharacterField, "name" | "pronouns">,
  oldValue: string | null | undefined,
  newValue: string | null | undefined,
): CharacterTextChange | null {
  const oldText = normalizeNullable(oldValue);
  const newText = normalizeNullable(newValue);
  if (!oldText || oldText === newText || oldText.length < 3) return null;

  return {
    field,
    fieldLabel: CHARACTER_FIELD_LABELS[field],
    oldText,
    newText,
    matchMode: "phrase",
  };
}

/** Detect every codex text delta that can be cascaded into chapter drafts. */
export function detectCharacterTextChanges(
  previous: Character,
  next: Character,
  options?: { includeAgeCascade?: boolean },
): CharacterTextChange[] {
  const changes: CharacterTextChange[] = [];

  if (
    previous.name.trim() &&
    previous.name.trim() !== next.name.trim()
  ) {
    changes.push({
      field: "name",
      fieldLabel: CHARACTER_FIELD_LABELS.name,
      oldText: previous.name.trim(),
      newText: next.name.trim(),
      matchMode: "word",
    });
  }

  changes.push(...buildAliasChanges(previous.aliases, next.aliases));

  const ageChange = buildAgeChange(
    previous.age,
    next.age,
    options?.includeAgeCascade ?? false,
  );
  if (ageChange) changes.push(ageChange);

  const phraseFields = [
    "physical_appearance",
    "core_flaw",
    "primary_motivation",
  ] as const;

  for (const field of phraseFields) {
    const change = buildPhraseChange(field, previous[field], next[field]);
    if (change) changes.push(change);
  }

  if (
    normalizeNullable(previous.pronouns) !== normalizeNullable(next.pronouns)
  ) {
    changes.push(
      ...buildPronounTokenChanges(previous.pronouns, next.pronouns),
    );
  }

  return changes;
}

export function countTextMentions(
  content: string,
  text: string,
  mode: CascadeMatchMode,
): number {
  const needle = text.trim();
  if (!needle || !content.trim()) return 0;

  const plain = htmlToPlainText(content);
  if (!plain) return 0;

  if (mode === "word") {
    const matches = plain.match(
      new RegExp(`\\b${escapeRegex(needle)}\\b`, "gi"),
    );
    return matches?.length ?? 0;
  }

  const matches = plain.match(new RegExp(escapeRegex(needle), "gi"));
  return matches?.length ?? 0;
}

export function replaceTextInHtmlDraft(
  html: string,
  oldText: string,
  newText: string,
  mode: CascadeMatchMode,
): string {
  const from = oldText.trim();
  const to = newText.trim();
  if (!from || from === to) return html;

  if (mode === "word") {
    const pattern = new RegExp(`\\b${escapeRegex(from)}\\b`, "gi");
    return html.replace(pattern, (match) => preserveReplacementCase(match, to));
  }

  const pattern = new RegExp(escapeRegex(from), "gi");
  return html.replace(pattern, (match) => preserveReplacementCase(match, to));
}
