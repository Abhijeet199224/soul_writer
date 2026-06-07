import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchStoryBible } from "@/lib/ai/fetch-story-context";
import { generatePlainTextWithGemini } from "@/lib/gemini/generate";
import { getCharactersUsedInText } from "@/lib/story-bible-context";
import { formatCharacterContext } from "@/lib/character-context";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const storyId = String(body.storyId ?? "").trim();
    const draft = String(body.draft ?? "").trim();
    const chapterId = body.chapterId ? String(body.chapterId) : undefined;
    const settingNotes = String(body.settingNotes ?? "").trim();
    const characterId = body.characterId ? String(body.characterId) : undefined;

    if (!storyId) {
      return NextResponse.json({ error: "storyId is required" }, { status: 400 });
    }

    if (!draft) {
      return NextResponse.json(
        { error: "Write a paragraph in this chapter before verifying tone alignment." },
        { status: 400 },
      );
    }

    const { data: story } = await supabase
      .from("stories")
      .select("id, title")
      .eq("id", storyId)
      .eq("user_id", user.id)
      .single();

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const bible = await fetchStoryBible(supabase, storyId, chapterId);
    if (!bible?.characters.length) {
      return NextResponse.json(
        { error: "Add characters to your Smart Codex before running tone alignment." },
        { status: 400 },
      );
    }

    const charactersUsed = getCharactersUsedInText(draft, bible.characters);
    let relevant = bible.characters.filter((c) =>
      charactersUsed.includes(c.name),
    );

    if (characterId) {
      const scoped = bible.characters.find((c) => c.id === characterId);
      relevant = scoped ? [scoped] : relevant;
    }

    const prompt = `You are a developmental editor verifying character voice alignment in Soul Writer.

Story: "${story.title}"

Smart Codex character profiles:
${formatCharacterContext(relevant.length ? relevant : bible.characters)}

Setting & lore:
${settingNotes || bible.settingNotes || "None provided"}

Chapter excerpt:
---
${draft.slice(-8000)}
---

Analyze whether dialogue and interior prose match each character's defined psychology (role, flaw, motivation).
Return a concise report with:
1. Overall alignment score (0-100)
2. Character-by-character notes (only for names appearing in the excerpt)
3. Two specific line-level fixes if misalignment exists

Plain text only — no JSON.`;

    const report = await generatePlainTextWithGemini(prompt, {
      temperature: 0.4,
      maxOutputTokens: 1200,
    });

    return NextResponse.json({
      report: report.trim(),
      charactersChecked: charactersUsed.length
        ? charactersUsed
        : bible.characters.map((c) => c.name),
    });
  } catch (error) {
    console.error("[tone-alignment]", error);
    const message =
      error instanceof Error ? error.message : "Tone alignment check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
