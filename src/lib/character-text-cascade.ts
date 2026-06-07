import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildChapterTextCascadePatches,
  type ChapterDraftPatch,
} from "@/lib/manuscript-cascade";
import type { CascadeMatchMode } from "@/lib/character-attribute-sync";

export interface CascadeTextRequest {
  storyId: string;
  oldText: string;
  newText: string;
  matchMode?: CascadeMatchMode;
}

export async function runCharacterTextCascade(
  supabase: SupabaseClient,
  userId: string,
  payload: CascadeTextRequest,
) {
  const storyId = payload.storyId.trim();
  const oldText = payload.oldText.trim();
  const newText = payload.newText.trim();
  const matchMode: CascadeMatchMode = payload.matchMode ?? "phrase";

  if (!storyId || !oldText || !newText) {
    return NextResponse.json(
      { error: "storyId, oldText, and newText are required" },
      { status: 400 },
    );
  }

  if (oldText.toLowerCase() === newText.toLowerCase()) {
    return NextResponse.json(
      { error: "oldText and newText must differ" },
      { status: 400 },
    );
  }

  const { data: story } = await supabase
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .eq("user_id", userId)
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

  const patches: ChapterDraftPatch[] = buildChapterTextCascadePatches(
    chapters ?? [],
    oldText,
    newText,
    matchMode,
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
}
