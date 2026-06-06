import type { GhostwriteTier } from "@/lib/types";
import type { StoryBiblePayload } from "@/lib/story-bible-context";
import { buildStoryBibleSystemBlock } from "@/lib/story-bible-context";
import { formatChapterContext } from "@/lib/chapters";
import type { StoryChapter } from "@/lib/types";

export type AiMode = "ghostwrite" | "soul-check";

export interface PromptContext {
  storyTitle: string;
  bible: StoryBiblePayload;
  chapter?: StoryChapter | null;
  sliderValue: number;
  ghostwriteTier?: GhostwriteTier;
  draftContent: string;
  selectedText?: string;
  cursorPrefix?: string;
}

function soulCheckSliderGuidance(value: number): string {
  if (value <= 25) {
    return `Collaboration Slider: ${value}/100 — VOICE PROTECTION. Gentle, voice-preserving critiques only.`;
  }
  if (value <= 50) {
    return `Collaboration Slider: ${value}/100 — BALANCED. Mix encouragement with specific editorial notes.`;
  }
  if (value <= 75) {
    return `Collaboration Slider: ${value}/100 — EDITORIAL. Direct structural and emotional analysis.`;
  }
  return `Collaboration Slider: ${value}/100 — GHOSTWRITER ANALYTICAL. Ruthless developmental edit with structural dissection.`;
}

function ghostwriteTierPrompt(tier: GhostwriteTier, sliderValue: number): string {
  if (tier === "assist") {
    return `GHOSTWRITER TIER: PURE HUMAN ASSIST (${sliderValue}/100, 0–30%).
DO NOT write prose for the manuscript. Return structural advice and outline ideas ONLY for the sidebar.
The author will write manually. Never output canvas-ready prose.`;
  }
  if (tier === "copilot") {
    return `GHOSTWRITER TIER: CO-PILOT (${sliderValue}/100, 31–70%).
Complete or extend ONLY the author's current sentence at the cursor. Output a short phrase or single sentence (max 30 words).
Match the author's voice exactly. Do not draft new paragraphs.`;
  }
  return `GHOSTWRITER TIER: FULL GHOSTWRITER (${sliderValue}/100, 71–100%).
Draft the next 200–300 words advancing the current Act/Chapter plot objectives.
Bold creative choices grounded in the Story Bible and chapter sequence.`;
}

export function buildSystemPrompt(ctx: PromptContext, mode: AiMode): string {
  const proseSample = ctx.selectedText ?? ctx.draftContent;
  const bibleBlock = buildStoryBibleSystemBlock(ctx.bible, proseSample);
  const chapterBlock = ctx.chapter
    ? `\n=== ACTIVE ACT/CHAPTER ===\n${formatChapterContext(ctx.chapter)}`
    : "";
  const sliderGuidance = soulCheckSliderGuidance(ctx.sliderValue);

  if (mode === "soul-check") {
    return `You are a brutally honest, analytical Literary Editor.

${bibleBlock}
${chapterBlock}

${sliderGuidance}

STORY BIBLE ENFORCEMENT:
- Cross-reference every named character against CHARACTER PROFILES.
- Flag lines where characters contradict their flaw, motivation, role, or appearance.

CRITICAL OUTPUT — raw JSON array ONLY:
[
  {
    "targetText": "verbatim substring from manuscript",
    "severity": "cold" | "lukewarm",
    "critique": "detailed explanation",
    "soulPrompt": "reflective question for manual writing",
    "toneSuggestions": {
      "visceral": "raw, sensory-heavy rewrite snippet replacing targetText",
      "subtextual": "psychological tension rewrite snippet",
      "dramatic": "high-stakes emotional rewrite snippet"
    }
  }
]
Rules:
- targetText MUST be exact manuscript substring or OMIT entry.
- toneSuggestions snippets must be same length/order as targetText replacement candidates.
- soulPrompt remains a question; toneSuggestions are optional fast-rewrite snippets.
- 1–5 entries max. Empty array [] if voice is solid.`;
  }

  const tier = ctx.ghostwriteTier ?? "ghostwriter";
  const tierBlock = ghostwriteTierPrompt(tier, ctx.sliderValue);

  if (tier === "assist") {
    return `You are a structural writing coach in Soul Writer.

${bibleBlock}
${chapterBlock}

${tierBlock}

Return JSON only:
{
  "structuralAdvice": "2-4 sentences of craft guidance for this chapter",
  "outlineIdeas": "bullet-style scene ideas the author can pursue manually",
  "rationale": "why these suggestions fit the chapter objectives"
}`;
  }

  if (tier === "copilot") {
    return `You are a co-pilot sentence completer in Soul Writer.

${bibleBlock}
${chapterBlock}

${tierBlock}

Return JSON only:
{
  "prose": "short completion of the current sentence only",
  "rationale": "brief note on the completion choice"
}`;
  }

  return `You are a ghostwriting collaborator in Soul Writer.

${bibleBlock}
${chapterBlock}

${tierBlock}

Return JSON only:
{
  "prose": "200-300 words continuing the scene per chapter objectives",
  "rationale": "brief creative note"
}`;
}

export function buildUserPrompt(ctx: PromptContext, mode: AiMode): string {
  const sliderLine = `Collaboration Slider: ${ctx.sliderValue}/100`;

  if (mode === "soul-check" && ctx.selectedText) {
    return `Story: "${ctx.storyTitle}"
${sliderLine}

Passage to audit:
---
${ctx.selectedText}
---`;
  }

  if (mode === "soul-check") {
    return `Story: "${ctx.storyTitle}"
${sliderLine}

Chapter draft excerpt:
---
${ctx.draftContent.slice(-4000)}
---`;
  }

  const tier = ctx.ghostwriteTier ?? "ghostwriter";

  if (tier === "copilot" && ctx.cursorPrefix) {
    return `Story: "${ctx.storyTitle}"
${sliderLine}

Complete this sentence in progress:
---
${ctx.cursorPrefix}
---`;
  }

  return `Story: "${ctx.storyTitle}"
${sliderLine}

Current chapter draft:
---
${ctx.draftContent.slice(-6000)}
---`;
}
