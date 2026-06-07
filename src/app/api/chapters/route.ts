import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildChaptersFromLegacyWorkspace,
  normalizeChapter,
} from "@/lib/chapters";

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
      act,
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
      act?: string;
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
          currentChapter.updated_at !== body.expectedUpdatedAt
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

      if (act !== undefined) {
        const trimmedAct = act.trim();
        if (!trimmedAct) {
          return NextResponse.json(
            { error: "Act label cannot be empty." },
            { status: 400 },
          );
        }

        const { data: siblings, error: siblingsError } = await supabase
          .from("story_chapters")
          .select("id, act")
          .eq("story_id", storyId)
          .neq("id", chapterId);

        if (siblingsError) {
          return NextResponse.json({ error: siblingsError.message }, { status: 500 });
        }

        const duplicate = (siblings ?? []).some(
          (row) => row.act.trim().toLowerCase() === trimmedAct.toLowerCase(),
        );
        if (duplicate) {
          return NextResponse.json(
            {
              error: `An Act named "${trimmedAct}" already exists in this story.`,
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
      if (act !== undefined) chapterRow.act = act.trim();

      const { error: chapterError } = await supabase
        .from("story_chapters")
        .update(chapterRow)
        .eq("id", chapterId)
        .eq("story_id", storyId);

      if (chapterError) {
        if (chapterError.code === "23505") {
          return NextResponse.json(
            {
              error: `An Act named "${String(act).trim()}" already exists in this story.`,
            },
            { status: 409 },
          );
        }
        return NextResponse.json({ error: chapterError.message }, { status: 500 });
      }
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/chapters:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
