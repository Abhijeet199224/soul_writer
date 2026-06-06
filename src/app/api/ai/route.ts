import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchStoryBible } from "@/lib/ai/fetch-story-context";
import { generateWithGemini } from "@/lib/gemini/generate";
import { getCharactersUsedInText } from "@/lib/story-bible-context";
import type { AiMode } from "@/lib/gemini/prompts";

interface AiRequestBody {
  storyId: string;
  mode: AiMode;
  draft: string;
  sliderValue?: number;
  beat?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AiRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { storyId, mode, draft, beat } = body;
  const sliderValue = Math.min(100, Math.max(0, body.sliderValue ?? 50));

  if (!storyId || !mode || typeof draft !== "string") {
    return NextResponse.json(
      { error: "storyId, mode, and draft are required" },
      { status: 400 },
    );
  }

  if (mode !== "ghostwrite" && mode !== "soul-check") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  if (!draft.trim()) {
    return NextResponse.json(
      { error: "Draft text cannot be empty" },
      { status: 400 },
    );
  }

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, title")
    .eq("id", storyId)
    .eq("user_id", user.id)
    .single();

  if (storyError || !story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const bible = await fetchStoryBible(supabase, storyId);

  if (!bible || bible.characters.length === 0) {
    return NextResponse.json(
      {
        error:
          "Add characters to your Story Bible before using Ghostwriter or Soul Checker.",
      },
      { status: 400 },
    );
  }

  const bibleWithBeat = beat?.trim()
    ? { ...bible, sceneBeat: beat.trim() }
    : bible;

  try {
    const result = await generateWithGemini(
      {
        storyTitle: story.title,
        bible: bibleWithBeat,
        sliderValue,
        draftContent: draft,
      },
      mode,
    );

    const charactersUsed = getCharactersUsedInText(draft, bible.characters);

    return NextResponse.json({
      result,
      mode,
      sliderValue,
      charactersUsed,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
