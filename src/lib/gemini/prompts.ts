import type { StoryBiblePayload } from "@/lib/story-bible-context";
import { buildStoryBibleSystemBlock } from "@/lib/story-bible-context";

export type AiMode = "ghostwrite" | "soul-check";

export interface PromptContext {
  storyTitle: string;
  bible: StoryBiblePayload;
  sliderValue: number;
  draftContent: string;
  /** Soul Check: only the highlighted passage */
  selectedText?: string;
}

function sliderLabel(value: number): string {
  if (value <= 25) return "minimal AI influence — preserve the author's voice";
  if (value <= 50) return "balanced collaboration";
  if (value <= 75) return "strong AI guidance";
  return "maximum AI creative direction";
}

export function buildSystemPrompt(ctx: PromptContext, mode: AiMode): string {
  const proseSample = ctx.selectedText ?? ctx.draftContent;
  const bibleBlock = buildStoryBibleSystemBlock(ctx.bible, proseSample);
  const slider = sliderLabel(ctx.sliderValue);

  if (mode === "soul-check") {
    return `You are the Soul Checker — an empathetic editorial companion for fiction writers.
Your role is to read a passage and return structured, emotionally intelligent feedback.

${bibleBlock}

AI Collaboration Slider: ${ctx.sliderValue}/100 (${slider}).
At low values, be gentle and suggestive. At high values, be direct and specific.

You MUST respond with valid JSON only — no markdown fences, no preamble. Use this exact shape:
{
  "insights": [
    {
      "title": "short headline",
      "body": "2-4 sentences of feedback",
      "tone": "encouraging" | "cautionary" | "celebratory"
    }
  ],
  "summary": "one sentence overall read"
}

Provide 2-4 insights. Reference character names and lore from the Story Bible when relevant.`;
  }

  return `You are a ghostwriting collaborator embedded in Soul Writer.
Continue or expand the author's prose while honoring their established world.

${bibleBlock}

AI Collaboration Slider: ${ctx.sliderValue}/100 (${slider}).
At low values, match the author's style closely with light suggestions.
At high values, take bolder creative leaps while staying canon-consistent.

You MUST respond with valid JSON only — no markdown fences, no preamble. Use this exact shape:
{
  "prose": "the continuation or expansion text",
  "rationale": "brief note on creative choices (1-2 sentences)"
}`;
}

export function buildUserPrompt(ctx: PromptContext, mode: AiMode): string {
  if (mode === "soul-check" && ctx.selectedText) {
    return `Story: "${ctx.storyTitle}"

Selected passage for Soul Check:
---
${ctx.selectedText}
---

Analyze only this passage. Return JSON insights.`;
  }

  if (mode === "soul-check") {
    return `Story: "${ctx.storyTitle}"

Draft excerpt:
---
${ctx.draftContent.slice(-4000)}
---

Analyze this passage. Return JSON insights.`;
  }

  return `Story: "${ctx.storyTitle}"

Current draft (continue from here):
---
${ctx.draftContent.slice(-6000)}
---

Write the next passage. Return JSON with "prose" and "rationale".`;
}
