import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithGemini } from "@/lib/gemini/generate";
import { getRelevantCharacters } from "@/lib/character-context";
import type { Character } from "@/lib/types";
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
    .select("id")
    .eq("id", storyId)
    .eq("user_id", user.id)
    .single();

  if (storyError || !story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const { data: characters, error: charactersError } = await supabase
    .from("characters")
    .select("*")
    .eq("story_id", storyId)
    .order("name");

  if (charactersError) {
    return NextResponse.json(
      { error: charactersError.message },
      { status: 500 },
    );
  }

  const allCharacters = (characters as Character[]) ?? [];
  const relevantCharacters = getRelevantCharacters(draft, allCharacters);

  if (allCharacters.length === 0) {
    return NextResponse.json(
      {
        error:
          "Add characters to your Story Bible before using Ghostwriter or Soul Checker.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await generateWithGemini({
      characters: relevantCharacters,
      mode,
      draft,
      sliderValue,
      beat,
    });

    return NextResponse.json({
      result,
      mode,
      sliderValue,
      charactersUsed: relevantCharacters.map((character) => character.name),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
