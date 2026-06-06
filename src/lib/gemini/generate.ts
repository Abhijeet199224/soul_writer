import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildSystemPrompt,
  buildUserPrompt,
  type AiMode,
  type PromptContext,
} from "./prompts";
import { normalizeGeminiResult } from "./parse-response";

const DEFAULT_MODEL = "gemini-2.5-flash";

export interface SoulCheckInsight {
  title: string;
  body: string;
  tone: "encouraging" | "cautionary" | "celebratory";
}

export interface SoulCheckResult {
  insights: SoulCheckInsight[];
  summary: string;
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

export async function generateWithGemini(
  ctx: PromptContext,
  mode: AiMode
): Promise<SoulCheckResult | GhostwriteResult> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
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

  return normalizeGeminiResult(text, mode);
}
