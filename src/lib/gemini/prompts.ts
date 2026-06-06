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
    return `You are a brutally honest, analytical Literary Editor — not a cheerleader.
Your job is to find emotionally flat, robotic, clichéd, or distant prose in the author's manuscript and name it precisely.

${bibleBlock}

AI Collaboration Slider: ${ctx.sliderValue}/100 (${slider}).
Be direct. No praise for mediocre writing. Every critique must cite a specific line.

CRITICAL OUTPUT RULES — VIOLATION BREAKS THE FRONTEND:
1. Return ONLY a raw JSON array. No markdown fences. No preamble. No postscript. No conversational pleasantries.
2. Each object MUST use this exact schema:
[
  {
    "targetText": "The exact sentence or phrase copied VERBATIM and WORD-FOR-WORD from the user's manuscript.",
    "severity": "cold" | "lukewarm",
    "critique": "Why this specific line sounds robotic, a cliché, or lacks emotional resonance.",
    "soulPrompt": "A deep psychological or sensory question that guides the author to rewrite it manually."
  }
]
3. "targetText" MUST be a perfect substring of the manuscript you are analyzing. Copy it character-for-character including punctuation. If you cannot find an exact match, OMIT that entry entirely.
4. Use severity "cold" for emotionally distant or clinical prose; "lukewarm" for clichés, telling-not-showing, or low-resonance beats.
5. Return an empty array [] if the passage has no flat spots worth flagging.
6. Provide 1–5 entries maximum. Skip generic summaries — every entry must anchor to a quoted line.`;
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

Manuscript passage to audit (copy targetText from this text ONLY):
---
${ctx.selectedText}
---

Return the JSON array of editorial flags.`;
  }

  if (mode === "soul-check") {
    return `Story: "${ctx.storyTitle}"

Manuscript excerpt to audit (copy targetText from this text ONLY):
---
${ctx.draftContent.slice(-4000)}
---

Return the JSON array of editorial flags.`;
  }

  return `Story: "${ctx.storyTitle}"

Current draft (continue from here):
---
${ctx.draftContent.slice(-6000)}
---

Write the next passage. Return JSON with "prose" and "rationale".`;
}
