import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildSystemPrompt,
  buildUserPrompt,
  type AiMode,
  type PromptContext,
} from "./prompts";
import { normalizeGeminiResult } from "./parse-response";

const DEFAULT_MODEL = "gemini-2.5-flash";

/** Curated text-generation models confirmed via Gemini API (June 2026). */
const DEFAULT_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-pro",
  "gemini-flash-latest",
  "gemini-pro-latest",
] as const;

export type SoulCheckSeverity = "cold" | "lukewarm";

export interface SoulCheckInsight {
  targetText: string;
  severity: SoulCheckSeverity;
  critique: string;
  soulPrompt: string;
}

export interface SoulCheckResult {
  insights: SoulCheckInsight[];
}

export interface GhostwriteResult {
  prose: string;
  rationale: string;
}

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(key);
}

function resolveModelChain(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const fromEnv = process.env.GEMINI_MODEL_FALLBACK?.split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  const chain = fromEnv?.length ? fromEnv : [...DEFAULT_FALLBACK_CHAIN];
  return [primary, ...chain.filter((name) => name !== primary)];
}

function isModelUnavailableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /\b404\b/.test(message) &&
    /no longer available|not found|is not supported|deprecated/i.test(message)
  );
}

function isRetryableGeminiError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);

  if (
    /\b(401|403)\b/.test(message) ||
    /API key|leaked|not configured|permission denied/i.test(message)
  ) {
    return false;
  }

  if (isModelUnavailableError(err)) {
    return true;
  }

  return (
    /\b(503|429|500|502|504)\b/.test(message) ||
    /unavailable|high demand|overloaded|rate limit|try again later/i.test(
      message,
    )
  );
}

async function generateTextWithModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  ctx: PromptContext,
  mode: AiMode,
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: buildSystemPrompt(ctx, mode),
    generationConfig: {
      temperature: Math.min(0.3 + ctx.sliderValue / 200, 1),
      maxOutputTokens: mode === "soul-check" ? 2048 : 4096,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(buildUserPrompt(ctx, mode));
  const text = result.response.text();

  if (!text?.trim()) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}

export async function generateWithGemini(
  ctx: PromptContext,
  mode: AiMode,
): Promise<SoulCheckResult | GhostwriteResult> {
  const genAI = getClient();
  const modelChain = resolveModelChain();
  const sourceText = ctx.selectedText ?? ctx.draftContent;
  let lastError: Error | null = null;

  for (let index = 0; index < modelChain.length; index++) {
    const modelName = modelChain[index];

    try {
      const text = await generateTextWithModel(genAI, modelName, ctx, mode);

      if (index > 0) {
        console.warn(`[Gemini] Recovered using fallback model: ${modelName}`);
      }

      return normalizeGeminiResult(text, mode, sourceText);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const hasFallback = index < modelChain.length - 1;

      if (isRetryableGeminiError(err) && hasFallback) {
        console.warn(
          `[Gemini] ${modelName} failed (${lastError.message}). Trying ${modelChain[index + 1]}…`,
        );
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error("Gemini generation failed");
}
