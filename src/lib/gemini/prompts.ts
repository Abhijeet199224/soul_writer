import type { Character } from "@/lib/types";
import { formatCharacterContext } from "@/lib/character-context";

export type AiMode = "ghostwrite" | "soul-check";

function sliderGuidance(sliderValue: number): string {
  if (sliderValue <= 25) {
    return "Inspiration mode (0–25%): Offer 3 brief, distinct options the writer could use. Do not write full prose paragraphs.";
  }
  if (sliderValue <= 50) {
    return "Brainstorm mode (26–50%): Suggest scene beats, lines, or reactions grounded in character flaws and motivations.";
  }
  if (sliderValue <= 75) {
    return "Co-drafting mode (51–75%): Draft the next 150–250 words continuing the scene, matching the writer's voice.";
  }
  return "Ghostwriter mode (76–100%): Draft the next 250–350 words with strong momentum while honoring every character trait.";
}

export function buildSystemInstruction(
  characters: Character[],
  sliderValue: number,
  mode: AiMode,
): string {
  const characterContext = formatCharacterContext(characters);

  if (mode === "soul-check") {
    return `You are the Soul Checker for a fiction writer. Your job is to audit prose against character bible profiles.

CHARACTER BIBLE:
${characterContext}

RULES:
- Flag dialogue or behavior that contradicts a character's flaw, motivation, age, or role.
- Flag generic, voiceless, or interchangeable character writing.
- Quote the problematic line or phrase when possible.
- For each issue: name the character, explain the violation, and suggest a fix in their authentic voice.
- If the prose is faithful to the bible, say so briefly.
- Be direct and editorial, not flattering.`;
  }

  return `You are assisting a writer on Soul Writer. Here is the context of the characters in this story:

${characterContext}

Current Collaboration Slider: ${sliderValue}%.
${sliderGuidance(sliderValue)}

RULES:
- Stay strictly inside these character traits.
- Never invent character facts that contradict the bible.
- Preserve the writer's tense and POV unless the draft is empty.
- Output only the requested writing or suggestions — no preamble.`;
}

export function buildUserPrompt(
  mode: AiMode,
  draft: string,
  sliderValue: number,
  beat?: string,
): string {
  if (mode === "soul-check") {
    return `Run a Soul Check on this draft:

---
${draft}
---

List every character authenticity issue you find.`;
  }

  const beatLine = beat?.trim()
    ? `Scene beat to follow: ${beat.trim()}`
    : "Continue naturally from the last line.";

  return `Draft text so far:

---
${draft}
---

${beatLine}

Collaboration level: ${sliderValue}%.`;
}
