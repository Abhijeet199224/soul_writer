import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseOutlineJson } from "@/lib/story-bible-context";

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
    const {
      storyId,
      draftContent,
      outline,
      settingNotes,
      sceneBeat,
      sliderValue,
    } = body as {
      storyId?: string;
      draftContent?: string;
      outline?: unknown;
      settingNotes?: string;
      sceneBeat?: string;
      sliderValue?: number;
    };

    if (!storyId) {
      return NextResponse.json({ error: "storyId is required" }, { status: 400 });
    }

    const { data: story } = await supabase
      .from("stories")
      .select("id")
      .eq("id", storyId)
      .eq("user_id", user.id)
      .single();

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const outlineJson = outline !== undefined ? parseOutlineJson(outline) : undefined;

    const row: Record<string, unknown> = {
      story_id: storyId,
      updated_at: new Date().toISOString(),
    };

    if (draftContent !== undefined) row.draft_content = draftContent;
    if (outlineJson !== undefined) row.outline_json = outlineJson;
    if (settingNotes !== undefined) row.setting_notes = settingNotes;
    if (sceneBeat !== undefined) row.scene_beat = sceneBeat;
    if (sliderValue !== undefined) row.slider_value = sliderValue;

    const { error } = await supabase.from("story_workspace").upsert(row, {
      onConflict: "story_id",
    });

    if (error) {
      console.error("workspace upsert:", error);
      return NextResponse.json({ error: "Failed to save workspace" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/workspace:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
