import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildChaptersFromLegacyWorkspace,
  chapterTimestampsEqual,
  normalizeChapter,
} from "@/lib/chapters";
import { ensureSequentialChapterLabels } from "@/lib/chapter-renumber";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storyId = new URL(request.url).searchParams.get("storyId");
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

  const { data: initialChapters, error } = await supabase
    .from("story_chapters")
    .select("*")
    .eq("story_id", storyId)
    .order("sequence");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let chapters = initialChapters;

  if (!chapters?.length) {
    const { data: workspace } = await supabase
      .from("story_workspace")
      .select("draft_content, outline_json, scene_beat, active_chapter_id")
      .eq("story_id", storyId)
      .maybeSingle();

    const seeds = buildChaptersFromLegacyWorkspace(
      storyId,
      workspace?.draft_content ?? "",
      workspace?.outline_json ?? [],
      workspace?.scene_beat ?? "",
    );

    const { data: inserted, error: insertError } = await supabase
      .from("story_chapters")
      .insert(seeds)
      .select("*");

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    chapters = inserted ?? [];

    const activeId = workspace?.active_chapter_id ?? chapters[0]?.id;
    if (activeId) {
      await supabase
        .from("story_workspace")
        .upsert({
          story_id: storyId,
          active_chapter_id: activeId,
          updated_at: new Date().toISOString(),
        });
    }
  }

  try {
    chapters = await ensureSequentialChapterLabels(supabase, storyId);
  } catch (renumberError) {
    console.error("GET /api/chapters renumber:", renumberError);
  }

  const { data: workspace } = await supabase
    .from("story_workspace")
    .select("active_chapter_id, setting_notes, slider_value")
    .eq("story_id", storyId)
    .maybeSingle();

  return NextResponse.json({
    chapters: (chapters ?? []).map((row) =>
      normalizeChapter(row as Record<string, unknown>),
    ),
    activeChapterId: workspace?.active_chapter_id ?? chapters?.[0]?.id ?? null,
    settingNotes: workspace?.setting_notes ?? "",
    sliderValue: workspace?.slider_value ?? 50,
  });
}

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
      chapterId,
      draftContent,
      sceneBeat,
      plotObjectives,
      plotBeats,
      title,
      activeChapterId,
      settingNotes,
      sliderValue,
    } = body as {
      storyId?: string;
      chapterId?: string;
      draftContent?: string;
      sceneBeat?: string;
      plotObjectives?: string;
      plotBeats?: unknown;
      title?: string;
      activeChapterId?: string;
      settingNotes?: string;
      sliderValue?: number;
      expectedUpdatedAt?: string;
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

    let chapterUpdatedAt: string | null = null;

    if (chapterId) {
      if (body.expectedUpdatedAt) {
        const { data: currentChapter } = await supabase
          .from("story_chapters")
          .select("updated_at")
          .eq("id", chapterId)
          .eq("story_id", storyId)
          .single();

        if (
          currentChapter?.updated_at &&
          !chapterTimestampsEqual(
            currentChapter.updated_at,
            body.expectedUpdatedAt,
          )
        ) {
          return NextResponse.json(
            {
              error:
                "This chapter was updated elsewhere. Reload the story to avoid overwriting changes.",
            },
            { status: 409 },
          );
        }
      }

      const chapterRow: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (draftContent !== undefined) chapterRow.draft_content = draftContent;
      if (sceneBeat !== undefined) chapterRow.scene_beat = sceneBeat;
      if (plotObjectives !== undefined) chapterRow.plot_objectives = plotObjectives;
      if (plotBeats !== undefined) chapterRow.plot_beats = plotBeats;
      if (title !== undefined) chapterRow.title = title;

      const { data: updatedChapter, error: chapterError } = await supabase
        .from("story_chapters")
        .update(chapterRow)
        .eq("id", chapterId)
        .eq("story_id", storyId)
        .select("updated_at")
        .single();

      if (chapterError) {
        return NextResponse.json({ error: chapterError.message }, { status: 500 });
      }

      chapterUpdatedAt = updatedChapter?.updated_at
        ? String(updatedChapter.updated_at)
        : null;
    }

    const workspaceRow: Record<string, unknown> = {
      story_id: storyId,
      updated_at: new Date().toISOString(),
    };
    if (activeChapterId !== undefined) {
      workspaceRow.active_chapter_id = activeChapterId;
    }
    if (settingNotes !== undefined) workspaceRow.setting_notes = settingNotes;
    if (sliderValue !== undefined) workspaceRow.slider_value = sliderValue;

    const { error: workspaceError } = await supabase
      .from("story_workspace")
      .upsert(workspaceRow, { onConflict: "story_id" });

    if (workspaceError) {
      return NextResponse.json({ error: workspaceError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, chapterUpdatedAt });
  } catch (err) {
    console.error("POST /api/chapters:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
