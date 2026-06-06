import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Character } from "@/lib/types";
import {
  buildSystemInstruction,
  buildUserPrompt,
  type AiMode,
} from "@/lib/gemini/prompts";

export async function generateWithGemini({
  characters,
  mode,
  draft,
  sliderValue,
  beat,
}: {
  characters: Character[];
  mode: AiMode;
  draft: string;
  sliderValue: number;
  beat?: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: buildSystemInstruction(characters, sliderValue, mode),
  });

  const result = await model.generateContent(
    buildUserPrompt(mode, draft, sliderValue, beat),
  );

  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return text.trim();
}
