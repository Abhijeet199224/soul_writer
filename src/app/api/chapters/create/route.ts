import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeChapter } from "@/lib/chapters";

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
    const storyId = String(body.storyId ?? "").trim();

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

    const { data: existing } = await supabase
      .from("story_chapters")
      .select("act, sequence")
      .eq("story_id", storyId)
      .order("sequence");

    const acts = new Set((existing ?? []).map((row) => row.act));
    const maxSequence = (existing ?? []).reduce(
      (max, row) => Math.max(max, row.sequence ?? 0),
      -1,
    );

    let actNumber = (existing?.length ?? 0) + 1;
    let act = `Act ${actNumber}`;
    while (acts.has(act)) {
      actNumber += 1;
      act = `Act ${actNumber}`;
    }

    const sequence = maxSequence + 1;

    const { data: inserted, error: insertError } = await supabase
      .from("story_chapters")
      .insert({
        story_id: storyId,
        act,
        title: "",
        sequence,
        plot_beats: [],
        plot_objectives: "",
        scene_beat: "",
        draft_content: "<p></p>",
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create chapter" },
        { status: 500 },
      );
    }

    await supabase.from("story_workspace").upsert(
      {
        story_id: storyId,
        active_chapter_id: inserted.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "story_id" },
    );

    return NextResponse.json({
      chapter: normalizeChapter(inserted as Record<string, unknown>),
    });
  } catch (err) {
    console.error("POST /api/chapters/create:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
