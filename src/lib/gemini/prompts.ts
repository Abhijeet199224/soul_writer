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

function sliderModeLabel(value: number): string {
  if (value <= 25) return "Inspiration";
  if (value <= 50) return "Brainstorm";
  if (value <= 75) return "Co-Drafting";
  return "Ghostwriter";
}

function soulCheckSliderGuidance(value: number): string {
  if (value <= 25) {
    return `Collaboration Slider: ${value}/100 (${sliderModeLabel(value)}).
VOICE PROTECTION MODE — Be gentle and suggestive. Protect the author's original voice.
Only flag egregious flat spots. Frame critiques as invitations, not directives.
Prioritize emotional authenticity over craft mechanics.`;
  }

  if (value <= 50) {
    return `Collaboration Slider: ${value}/100 (${sliderModeLabel(value)}).
BALANCED MODE — Mix voice preservation with clear editorial notes.
Name specific weaknesses but acknowledge what is working.`;
  }

  if (value <= 75) {
    return `Collaboration Slider: ${value}/100 (${sliderModeLabel(value)}).
EDITORIAL MODE — Be direct and specific about structural and emotional weaknesses.
Dissect subtext, pacing, and resonance with professional rigor.`;
  }

  return `Collaboration Slider: ${value}/100 (${sliderModeLabel(value)}).
GHOSTWRITER ANALYTICAL MODE — Deliver highly analytical, structural critiques.
Dissect pacing, subtext, scene architecture, and craft mechanics ruthlessly.
Treat this as a developmental edit at maximum AI collaboration.`;
}

function ghostwriteSliderGuidance(value: number): string {
  if (value <= 25) {
    return `Collaboration Slider: ${value}/100 (${sliderModeLabel(value)}).
Match the author's existing voice and rhythm exactly. Offer only light continuations.`;
  }

  if (value <= 50) {
    return `Collaboration Slider: ${value}/100 (${sliderModeLabel(value)}).
Collaborate evenly — extend the scene while mirroring the author's style.`;
  }

  if (value <= 75) {
    return `Collaboration Slider: ${value}/100 (${sliderModeLabel(value)}).
Take stronger creative guidance while staying canon-consistent with the Story Bible.`;
  }

  return `Collaboration Slider: ${value}/100 (${sliderModeLabel(value)}).
Maximum AI creative direction — bold structural and prose choices grounded in the Story Bible.`;
}

export function buildSystemPrompt(ctx: PromptContext, mode: AiMode): string {
  const proseSample = ctx.selectedText ?? ctx.draftContent;
  const bibleBlock = buildStoryBibleSystemBlock(ctx.bible, proseSample);
  const sliderGuidance =
    mode === "soul-check"
      ? soulCheckSliderGuidance(ctx.sliderValue)
      : ghostwriteSliderGuidance(ctx.sliderValue);

  if (mode === "soul-check") {
    return `You are a brutally honest, analytical Literary Editor — not a cheerleader.
Your job is to find emotionally flat, robotic, clichéd, or distant prose in the author's manuscript and name it precisely.

${bibleBlock}

${sliderGuidance}

STORY BIBLE ENFORCEMENT (The "Kamala" test):
- Cross-reference every named character in the manuscript against their CHARACTER PROFILES above.
- If a character's actions, voice, choices, or emotional beats contradict their defined role, flaw, motivation, or appearance — flag it as a targetText entry.
- Example: if Kamala is defined as cautious but acts recklessly without narrative justification, cite the exact line and explain the contradiction.

CRITICAL OUTPUT RULES — VIOLATION BREAKS THE FRONTEND:
1. Return ONLY a raw JSON array. No markdown fences. No preamble. No postscript. No conversational pleasantries.
2. Each object MUST use this exact schema:
[
  {
    "targetText": "The exact sentence or phrase copied VERBATIM and WORD-FOR-WORD from the user's manuscript.",
    "severity": "cold" | "lukewarm",
    "critique": "Why this specific line sounds robotic, a cliché, lacks emotional resonance, or breaks character canon.",
    "soulPrompt": "A deep psychological or sensory question that guides the author to rewrite it manually."
  }
]
3. "targetText" MUST be a perfect substring of the manuscript you are analyzing. Copy it character-for-character including punctuation. If you cannot find an exact match, OMIT that entry entirely.
4. Use severity "cold" for emotionally distant or clinical prose; "lukewarm" for clichés, telling-not-showing, or low-resonance beats.
5. Return an empty array [] if the passage has no flat spots worth flagging.
6. Provide 1–5 entries maximum. Skip generic summaries — every entry must anchor to a quoted line.
7. Do NOT rewrite the prose. The soulPrompt must be a question only — the human author rewrites manually.`;
  }

  return `You are a ghostwriting collaborator embedded in Soul Writer.
Continue or expand the author's prose while honoring their established world.

${bibleBlock}

${sliderGuidance}

Honor every character profile, plot beat, and lore note from the Story Bible.

You MUST respond with valid JSON only — no markdown fences, no preamble. Use this exact shape:
{
  "prose": "the continuation or expansion text",
  "rationale": "brief note on creative choices (1-2 sentences)"
}`;
}

export function buildUserPrompt(ctx: PromptContext, mode: AiMode): string {
  if (mode === "soul-check" && ctx.selectedText) {
    return `Story: "${ctx.storyTitle}"
Collaboration Slider value for this request: ${ctx.sliderValue}/100

Manuscript passage to audit (copy targetText from this text ONLY):
---
${ctx.selectedText}
---

Return the JSON array of editorial flags.`;
  }

  if (mode === "soul-check") {
    return `Story: "${ctx.storyTitle}"
Collaboration Slider value for this request: ${ctx.sliderValue}/100

Manuscript excerpt to audit (copy targetText from this text ONLY):
---
${ctx.draftContent.slice(-4000)}
---

Return the JSON array of editorial flags.`;
  }

  return `Story: "${ctx.storyTitle}"
Collaboration Slider value for this request: ${ctx.sliderValue}/100

Current draft (continue from here):
---
${ctx.draftContent.slice(-6000)}
---

Write the next passage. Return JSON with "prose" and "rationale".`;
}
