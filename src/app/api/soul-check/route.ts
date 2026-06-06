import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchStoryBible } from "@/lib/ai/fetch-story-context";
import { generateWithGemini } from "@/lib/gemini/generate";
import { getCharactersUsedInText } from "@/lib/story-bible-context";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { storyId, selectedText, sliderValue = 50 } = body as {
      storyId?: string;
      selectedText?: string;
      sliderValue?: number;
    };

    if (!storyId || !selectedText?.trim()) {
      return NextResponse.json(
        { error: "storyId and selectedText are required" },
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

    const bible = await fetchStoryBible(supabase, storyId);
    if (!bible || bible.characters.length === 0) {
      return NextResponse.json(
        {
          error:
            "Add at least one character to your Story Bible before running Soul Check.",
        },
        { status: 400 },
      );
    }

    const clampedSlider = Math.min(100, Math.max(0, sliderValue));
    const result = await generateWithGemini(
      {
        storyTitle: story.title,
        bible,
        sliderValue: clampedSlider,
        draftContent: "",
        selectedText: selectedText.trim(),
      },
      "soul-check",
    );

    return NextResponse.json({
      ...result,
      charactersUsed: getCharactersUsedInText(selectedText, bible.characters),
      sliderValue: clampedSlider,
    });
  } catch (err) {
    console.error("POST /api/soul-check:", err);
    const message = err instanceof Error ? err.message : "Soul Check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
