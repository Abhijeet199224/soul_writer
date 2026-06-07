import { NextResponse } from "next/server";
import { generatePlainTextWithGemini } from "@/lib/gemini/generate";
import { buildCustomRewritePrompt } from "@/lib/gemini/prompts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const targetText = String(body.targetText ?? "").trim();
    const customPrompt = String(body.customPrompt ?? "").trim();
    const characterContext = String(body.characterContext ?? "").trim();
    const sceneBeat = String(body.sceneBeat ?? "").trim();
    const plotObjectives = String(body.plotObjectives ?? "").trim();
    const chapterAct = String(body.chapterAct ?? "").trim();
    const chapterTitle = String(body.chapterTitle ?? "").trim();
    const settingNotes = String(body.settingNotes ?? "").trim();

    if (!targetText || !customPrompt) {
      return NextResponse.json(
        { error: "targetText and customPrompt are required" },
        { status: 400 },
      );
    }

    const prompt = buildCustomRewritePrompt({
      targetText,
      customPrompt,
      characterContext,
      sceneBeat,
      plotObjectives,
      chapterAct,
      chapterTitle,
      settingNotes,
    });

    const raw = await generatePlainTextWithGemini(prompt);
    const rewrite = raw.trim().replace(/^["']|["']$/g, "");

    if (!rewrite) {
      return NextResponse.json(
        { error: "Model returned an empty rewrite" },
        { status: 502 },
      );
    }

    return NextResponse.json({ rewrite });
  } catch (error) {
    console.error("[custom-rewrite]", error);
    const message =
      error instanceof Error ? error.message : "Custom rewrite failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
