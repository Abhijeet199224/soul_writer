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
  excludeChapterIds?: string[];
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
  const exclude = new Set(payload.excludeChapterIds ?? []);

  if (!storyId || !oldText) {
    return NextResponse.json(
      { error: "storyId and oldText are required" },
      { status: 400 },
    );
  }

  if (newText === undefined) {
    return NextResponse.json({ error: "newText is required" }, { status: 400 });
  }

  if (newText.length > 0 && oldText.toLowerCase() === newText.toLowerCase()) {
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
  ).filter((patch) => !exclude.has(patch.id));

  if (!patches.length) {
    return NextResponse.json({
      chapters: [],
      totalMentionsReplaced: 0,
    });
  }

  const { error: rpcError } = await supabase.rpc("cascade_story_chapter_drafts", {
    p_story_id: storyId,
    p_updates: patches.map((patch) => ({
      id: patch.id,
      draft_content: patch.draft_content,
    })),
  });

  if (rpcError) {
    return NextResponse.json(
      { error: rpcError.message ?? "Cascade update failed" },
      { status: 500 },
    );
  }

  const totalMentionsReplaced = patches.reduce(
    (sum, patch) => sum + patch.mentionsReplaced,
    0,
  );

  return NextResponse.json({
    chapters: patches.map((patch) => ({
      id: patch.id,
      draft_content: patch.draft_content,
      mentionsReplaced: patch.mentionsReplaced,
    })),
    totalMentionsReplaced,
  });
}

export async function runCharacterMentionRemoval(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    storyId: string;
    searchText: string;
    matchMode?: CascadeMatchMode;
    replacement?: string;
    excludeChapterIds?: string[];
  },
) {
  return runCharacterTextCascade(supabase, userId, {
    storyId: payload.storyId,
    oldText: payload.searchText,
    newText: payload.replacement ?? "",
    matchMode: payload.matchMode ?? "word",
    excludeChapterIds: payload.excludeChapterIds,
  });
}
