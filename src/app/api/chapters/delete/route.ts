import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureSequentialChapterLabels } from "@/lib/chapter-renumber";

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
    const chapterId = String(body.chapterId ?? "").trim();

    if (!storyId || !chapterId) {
      return NextResponse.json(
        { error: "storyId and chapterId are required" },
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

    const { data: chapters, error: listError } = await supabase
      .from("story_chapters")
      .select("id, sequence")
      .eq("story_id", storyId)
      .order("sequence");

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    if ((chapters ?? []).length <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the only remaining chapter in this story." },
        { status: 400 },
      );
    }

    const target = chapters?.find((chapter) => chapter.id === chapterId);
    if (!target) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("story_chapters")
      .delete()
      .eq("id", chapterId)
      .eq("story_id", storyId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const remainingBeforeRenumber = (chapters ?? []).filter(
      (chapter) => chapter.id !== chapterId,
    );
    const fallbackId = remainingBeforeRenumber[0]?.id ?? null;

    await supabase.from("story_workspace").upsert(
      {
        story_id: storyId,
        active_chapter_id: fallbackId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "story_id" },
    );

    const renumberedChapters = await ensureSequentialChapterLabels(
      supabase,
      storyId,
      { force: true },
    );

    return NextResponse.json({
      ok: true,
      activeChapterId: fallbackId,
      deletedChapterId: chapterId,
      chapters: renumberedChapters,
    });
  } catch (err) {
    console.error("POST /api/chapters/delete:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
