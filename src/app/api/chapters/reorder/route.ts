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
    const chapterId = String(body.chapterId ?? "").trim();
    const direction = body.direction as "up" | "down";

    if (!storyId || !chapterId) {
      return NextResponse.json(
        { error: "storyId and chapterId are required" },
        { status: 400 },
      );
    }

    if (direction !== "up" && direction !== "down") {
      return NextResponse.json(
        { error: "direction must be \"up\" or \"down\"" },
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

    const ordered = chapters ?? [];
    const index = ordered.findIndex((chapter) => chapter.id === chapterId);
    if (index < 0) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= ordered.length) {
      return NextResponse.json(
        { error: "Cannot move this Act in that direction." },
        { status: 400 },
      );
    }

    const current = ordered[index];
    const neighbor = ordered[swapIndex];
    const updatedAt = new Date().toISOString();

    const { error: currentError } = await supabase
      .from("story_chapters")
      .update({ sequence: neighbor.sequence, updated_at: updatedAt })
      .eq("id", current.id)
      .eq("story_id", storyId);

    if (currentError) {
      return NextResponse.json({ error: currentError.message }, { status: 500 });
    }

    const { error: neighborError } = await supabase
      .from("story_chapters")
      .update({ sequence: current.sequence, updated_at: updatedAt })
      .eq("id", neighbor.id)
      .eq("story_id", storyId);

    if (neighborError) {
      return NextResponse.json({ error: neighborError.message }, { status: 500 });
    }

    const { data: refreshed, error: refreshError } = await supabase
      .from("story_chapters")
      .select("*")
      .eq("story_id", storyId)
      .order("sequence");

    if (refreshError) {
      return NextResponse.json({ error: refreshError.message }, { status: 500 });
    }

    return NextResponse.json({
      chapters: (refreshed ?? []).map((row) =>
        normalizeChapter(row as Record<string, unknown>),
      ),
    });
  } catch (err) {
    console.error("POST /api/chapters/reorder:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
