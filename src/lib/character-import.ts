import type { CharacterInput, CharacterRole } from "@/lib/types";

const VALID_ROLES: CharacterRole[] = [
  "Protagonist",
  "Antagonist",
  "Supporting",
];

export interface ParsedCharacterImport {
  rows: CharacterInput[];
  errors: string[];
}

function normalizeRole(value: string | undefined): CharacterRole {
  const match = VALID_ROLES.find(
    (role) => role.toLowerCase() === String(value ?? "").trim().toLowerCase(),
  );
  return match ?? "Supporting";
}

function rowFromRecord(record: Record<string, string>): CharacterInput | null {
  const name = String(record.name ?? record.Name ?? "").trim();
  if (!name) {
    return null;
  }

  const ageRaw = String(record.age ?? record.Age ?? "").trim();
  const age = ageRaw ? Number(ageRaw) : null;

  return {
    name,
    role: normalizeRole(record.role ?? record.Role),
    age: Number.isFinite(age) ? age : null,
    pronouns: String(record.pronouns ?? record.Pronouns ?? "").trim() || null,
    aliases: String(record.aliases ?? record.Aliases ?? "").trim() || null,
    voice_notes: String(record.voice_notes ?? record.voice ?? record.Voice ?? "").trim() || null,
    physical_appearance:
      String(record.physical_appearance ?? record.appearance ?? record.Appearance ?? "").trim() ||
      null,
    core_flaw: String(record.core_flaw ?? record.flaw ?? record.Flaw ?? "").trim() || null,
    primary_motivation:
      String(record.primary_motivation ?? record.motivation ?? record.Motivation ?? "").trim() ||
      null,
    relationships: [],
  };
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function parseCharacterCsv(text: string): ParsedCharacterImport {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], errors: ["CSV must include a header row and at least one character."] };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows: CharacterInput[] = [];
  const errors: string[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const cells = parseCsvLine(lines[index]);
    const record: Record<string, string> = {};
    headers.forEach((header, cellIndex) => {
      record[header] = cells[cellIndex] ?? "";
    });
      const row = rowFromRecord(record);
    if (!row) {
      errors.push(`Line ${index + 1}: missing name`);
      continue;
    }
    rows.push(row);
  }

  return { rows, errors };
}

export function parseCharacterJson(text: string): ParsedCharacterImport {
  try {
    const parsed = JSON.parse(text) as unknown;
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const rows: CharacterInput[] = [];
    const errors: string[] = [];

    list.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        errors.push(`Item ${index + 1}: expected an object`);
        return;
      }
      const row = rowFromRecord(item as Record<string, string>);
      if (!row) {
        errors.push(`Item ${index + 1}: missing name`);
        return;
      }
      rows.push(row);
    });

    return { rows, errors };
  } catch {
    return { rows: [], errors: ["Invalid JSON payload."] };
  }
}
