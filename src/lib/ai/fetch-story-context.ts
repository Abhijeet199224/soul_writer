import type { SupabaseClient } from "@supabase/supabase-js";
import type { Character, StoryChapter } from "@/lib/types";
import type { StoryBiblePayload } from "@/lib/story-bible-context";
import { parseOutlineJson } from "@/lib/story-bible-context";
import { buildOutlineFromChapters } from "@/lib/plot-beats";
import { normalizeChapter } from "@/lib/chapters";

export async function fetchStoryChapter(
  supabase: SupabaseClient,
  storyId: string,
  chapterId?: string | null,
): Promise<StoryChapter | null> {
  if (chapterId) {
    const { data } = await supabase
      .from("story_chapters")
      .select("*")
      .eq("id", chapterId)
      .eq("story_id", storyId)
      .maybeSingle();
    return data ? normalizeChapter(data as Record<string, unknown>) : null;
  }

  const { data: workspace } = await supabase
    .from("story_workspace")
    .select("active_chapter_id")
    .eq("story_id", storyId)
    .maybeSingle();

  if (!workspace?.active_chapter_id) return null;

  const { data } = await supabase
    .from("story_chapters")
    .select("*")
    .eq("id", workspace.active_chapter_id)
    .maybeSingle();

  return data ? normalizeChapter(data as Record<string, unknown>) : null;
}

export async function fetchStoryBible(
  supabase: SupabaseClient,
  storyId: string,
  chapterId?: string | null,
): Promise<StoryBiblePayload | null> {
  const [charsRes, workspaceRes, chaptersRes, chapter] = await Promise.all([
    supabase
      .from("characters")
      .select("*")
      .eq("story_id", storyId)
      .order("name"),
    supabase
      .from("story_workspace")
      .select("outline_json, setting_notes, scene_beat, active_chapter_id")
      .eq("story_id", storyId)
      .maybeSingle(),
    supabase
      .from("story_chapters")
      .select("act, title, plot_beats")
      .eq("story_id", storyId)
      .order("sequence"),
    fetchStoryChapter(supabase, storyId, chapterId),
  ]);

  if (charsRes.error) {
    console.error("fetchStoryBible characters:", charsRes.error);
    return null;
  }

  const characters = (charsRes.data ?? []) as Character[];
  const ws = workspaceRes.data;
  const activeChapter =
    chapter ??
    (ws?.active_chapter_id
      ? await fetchStoryChapter(supabase, storyId, ws.active_chapter_id)
      : null);

  const chapterOutline = buildOutlineFromChapters(
    (chaptersRes.data ?? []).map((row) => ({
      act: String(row.act),
      title: String(row.title),
      plot_beats: normalizeChapter(row as Record<string, unknown>).plot_beats,
    })),
  );
  const legacyOutline = parseOutlineJson(ws?.outline_json);

  return {
    characters,
    outline: chapterOutline.length ? chapterOutline : legacyOutline,
    settingNotes: ws?.setting_notes ?? "",
    sceneBeat: activeChapter?.scene_beat ?? ws?.scene_beat ?? "",
    chapter: activeChapter,
  };
}
