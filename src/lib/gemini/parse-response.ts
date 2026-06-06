import type { GhostwriteTier } from "@/lib/types";
import type { AiMode } from "./prompts";
import type {
  GhostwriteResult,
  SoulCheckInsight,
  SoulCheckResult,
  SoulCheckSeverity,
  ToneSuggestions,
} from "./generate";

export function cleanGeminiText(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(/^```(?:json|markdown|text)?\s*\n?([\s\S]*?)\n?```$/i);
  if (fenced) text = fenced[1].trim();
  const inlineFence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (inlineFence && text.startsWith("```")) text = inlineFence[1].trim();
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
  return Boolean(needle && haystack && haystack.includes(needle));
}

function normalizeSeverity(value: unknown): SoulCheckSeverity {
  return value === "lukewarm" ? "lukewarm" : "cold";
}

function parseToneSuggestions(value: unknown): ToneSuggestions | undefined {
  if (!value || typeof value !== "object") return undefined;
  const t = value as Record<string, unknown>;
  const visceral = String(t.visceral ?? "").trim();
  const subtextual = String(t.subtextual ?? "").trim();
  const dramatic = String(t.dramatic ?? "").trim();
  if (!visceral && !subtextual && !dramatic) return undefined;
  return { visceral, subtextual, dramatic };
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
    toneSuggestions: parseToneSuggestions(item.toneSuggestions),
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
    if (Array.isArray(record.insights)) rawItems = record.insights;
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

function asGhostwriteResult(
  parsed: Record<string, unknown>,
  tier: GhostwriteTier,
): GhostwriteResult {
  if (tier === "assist") {
    return {
      tier: "assist",
      structuralAdvice: String(
        parsed.structuralAdvice ?? parsed.advice ?? parsed.prose ?? "",
      ).trim(),
      outlineIdeas: String(parsed.outlineIdeas ?? parsed.outline ?? "").trim(),
      rationale: String(parsed.rationale ?? ""),
    };
  }

  const prose = String(
    parsed.prose ?? parsed.text ?? parsed.result ?? "",
  ).trim();

  if (!prose) {
    throw new Error("Gemini returned prose without content.");
  }

  return {
    tier,
    prose,
    rationale: String(parsed.rationale ?? ""),
  };
}

export function normalizeGeminiResult(
  raw: string,
  mode: AiMode,
  sourceText = "",
  ghostwriteTier: GhostwriteTier = "ghostwriter",
): SoulCheckResult | GhostwriteResult {
  const cleaned = cleanGeminiText(raw);
  if (!cleaned) throw new Error("Gemini returned an empty response.");

  const parsed = safeParseGeminiJson<unknown>(cleaned);
  if (parsed !== null) {
    return mode === "soul-check"
      ? asSoulCheckResult(parsed, sourceText)
      : asGhostwriteResult(parsed as Record<string, unknown>, ghostwriteTier);
  }

  if (mode === "ghostwrite") {
    return { tier: ghostwriteTier, prose: cleaned, rationale: "" };
  }

  return { insights: [] };
}
