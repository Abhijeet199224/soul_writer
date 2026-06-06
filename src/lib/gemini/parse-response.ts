import type { AiMode } from "./prompts";
import type { GhostwriteResult, SoulCheckResult } from "./generate";

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

function asSoulCheckResult(parsed: Record<string, unknown>): SoulCheckResult {
  const insights = Array.isArray(parsed.insights)
    ? parsed.insights
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null,
        )
        .map((item) => ({
          title: String(item.title ?? "Insight"),
          body: String(item.body ?? ""),
          tone: (["encouraging", "cautionary", "celebratory"].includes(
            String(item.tone),
          )
            ? item.tone
            : "encouraging") as SoulCheckResult["insights"][number]["tone"],
        }))
        .filter((item) => item.body.trim())
    : [];

  if (insights.length === 0 && typeof parsed.summary === "string") {
    insights.push({
      title: "Soul Check",
      body: parsed.summary,
      tone: "encouraging",
    });
  }

  return {
    insights,
    summary: String(parsed.summary ?? "Analysis complete."),
  };
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
): SoulCheckResult | GhostwriteResult {
  const cleaned = cleanGeminiText(raw);
  if (!cleaned) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = safeParseGeminiJson<Record<string, unknown>>(cleaned);

  if (parsed) {
    return mode === "soul-check"
      ? asSoulCheckResult(parsed)
      : asGhostwriteResult(parsed);
  }

  if (mode === "ghostwrite") {
    return { prose: cleaned, rationale: "" };
  }

  return {
    insights: [{ title: "Soul Check", body: cleaned, tone: "encouraging" }],
    summary: "Parsed from unstructured response.",
  };
}
