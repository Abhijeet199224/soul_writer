import type { AiMode } from "./prompts";
import type {
  GhostwriteResult,
  SoulCheckInsight,
  SoulCheckResult,
  SoulCheckSeverity,
} from "./generate";

/**
 * Strips markdown code fences and safely parses optional JSON from Gemini output.
 */
export function cleanGeminiText(raw: string): string {
  let text = raw.trim();

  const fenced = text.match(/^```(?:json|markdown|text)?\s*\n?([\s\S]*?)\n?```$/i);
  if (fenced) {
    text = fenced[1].trim();
  }

  const inlineFence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (inlineFence && text.startsWith("```")) {
    text = inlineFence[1].trim();
  }

  return text;
}

export function safeParseGeminiJson<T>(raw: string): T | null {
  const cleaned = cleanGeminiText(raw);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]) as T;
      } catch {
        /* fall through */
      }
    }

    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function isExactSubstring(haystack: string, needle: string): boolean {
  if (!needle || !haystack) return false;
  return haystack.includes(needle);
}

function normalizeSeverity(value: unknown): SoulCheckSeverity {
  return value === "lukewarm" ? "lukewarm" : "cold";
}

function parseInsightItem(
  item: Record<string, unknown>,
  sourceText: string,
): SoulCheckInsight | null {
  const targetText = String(item.targetText ?? item.excerpt ?? "").trim();
  const critique = String(item.critique ?? item.body ?? "").trim();
  const soulPrompt = String(item.soulPrompt ?? item.prompt ?? "").trim();

  if (!targetText || !critique || !soulPrompt) return null;
  if (!isExactSubstring(sourceText, targetText)) return null;

  return {
    targetText,
    severity: normalizeSeverity(item.severity ?? item.type),
    critique,
    soulPrompt,
  };
}

function asSoulCheckResult(
  parsed: unknown,
  sourceText: string,
): SoulCheckResult {
  let rawItems: unknown[] = [];

  if (Array.isArray(parsed)) {
    rawItems = parsed;
  } else if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.insights)) {
      rawItems = record.insights;
    } else if (Array.isArray(record.coldZones)) {
      rawItems = record.coldZones.map((zone, index) => {
        if (typeof zone !== "object" || zone === null) return zone;
        const z = zone as Record<string, unknown>;
        const insightIndex = Number(z.insightIndex ?? index);
        const linked = Array.isArray(record.insights)
          ? (record.insights[insightIndex] as Record<string, unknown> | undefined)
          : undefined;
        return {
          targetText: z.excerpt ?? z.targetText,
          severity: z.type ?? z.severity,
          critique: linked?.body ?? linked?.critique ?? "",
          soulPrompt: linked?.soulPrompt ?? "",
        };
      });
    }
  }

  const insights = rawItems
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => parseInsightItem(item, sourceText))
    .filter((item): item is SoulCheckInsight => item !== null);

  return { insights };
}

function asGhostwriteResult(parsed: Record<string, unknown>): GhostwriteResult {
  const prose =
    typeof parsed.prose === "string"
      ? parsed.prose
      : typeof parsed.text === "string"
        ? parsed.text
        : typeof parsed.result === "string"
          ? parsed.result
          : "";

  if (!prose.trim()) {
    throw new Error("Gemini returned prose without content.");
  }

  return {
    prose: prose.trim(),
    rationale: String(parsed.rationale ?? ""),
  };
}

export function normalizeGeminiResult(
  raw: string,
  mode: AiMode,
  sourceText = "",
): SoulCheckResult | GhostwriteResult {
  const cleaned = cleanGeminiText(raw);
  if (!cleaned) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = safeParseGeminiJson<unknown>(cleaned);

  if (parsed !== null) {
    return mode === "soul-check"
      ? asSoulCheckResult(parsed, sourceText)
      : asGhostwriteResult(parsed as Record<string, unknown>);
  }

  if (mode === "ghostwrite") {
    return { prose: cleaned, rationale: "" };
  }

  return { insights: [] };
}
