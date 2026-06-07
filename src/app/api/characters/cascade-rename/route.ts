import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildChapterNameCascadePatches } from "@/lib/manuscript-cascade";

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
    const oldName = String(body.oldName ?? "").trim();
    const newName = String(body.newName ?? "").trim();

    if (!storyId || !oldName || !newName) {
      return NextResponse.json(
        { error: "storyId, oldName, and newName are required" },
        { status: 400 },
      );
    }

    if (oldName.toLowerCase() === newName.toLowerCase()) {
      return NextResponse.json(
        { error: "oldName and newName must differ" },
        { status: 400 },
      );
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

    const { data: chapters, error: fetchError } = await supabase
      .from("story_chapters")
      .select("id, draft_content")
      .eq("story_id", storyId);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const patches = buildChapterNameCascadePatches(
      chapters ?? [],
      oldName,
      newName,
    );

    if (!patches.length) {
      return NextResponse.json({
        chapters: [],
        totalMentionsReplaced: 0,
      });
    }

    const updatedAt = new Date().toISOString();

    const results = await Promise.all(
      patches.map((patch) =>
        supabase
          .from("story_chapters")
          .update({
            draft_content: patch.draft_content,
            updated_at: updatedAt,
          })
          .eq("id", patch.id)
          .eq("story_id", storyId)
          .select("id, draft_content")
          .single(),
      ),
    );

    const failures = results.filter(({ error }) => error);
    if (failures.length) {
      return NextResponse.json(
        { error: failures[0].error?.message ?? "Cascade update failed" },
        { status: 500 },
      );
    }

    const updatedChapters = results.map(({ data }, index) => ({
      id: data!.id as string,
      draft_content: data!.draft_content as string,
      mentionsReplaced: patches[index].mentionsReplaced,
    }));

    const totalMentionsReplaced = patches.reduce(
      (sum, patch) => sum + patch.mentionsReplaced,
      0,
    );

    return NextResponse.json({
      chapters: updatedChapters,
      totalMentionsReplaced,
    });
  } catch (err) {
    console.error("POST /api/characters/cascade-rename:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
