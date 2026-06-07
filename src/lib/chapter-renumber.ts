import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRenumberedChapterUpdates,
  chaptersNeedRenumbering,
  normalizeChapter,
} from "@/lib/chapters";
import type { StoryChapter } from "@/lib/types";

export async function ensureSequentialChapterLabels(
  supabase: SupabaseClient,
  storyId: string,
  options?: { force?: boolean },
): Promise<StoryChapter[]> {
  const { data: chapters, error } = await supabase
    .from("story_chapters")
    .select("*")
    .eq("story_id", storyId)
    .order("sequence");

  if (error) {
    throw new Error(error.message);
  }

  if (!chapters?.length) {
    return [];
  }

  if (!options?.force && !chaptersNeedRenumbering(chapters)) {
    return chapters.map((row) =>
      normalizeChapter(row as Record<string, unknown>),
    );
  }

  const updates = buildRenumberedChapterUpdates(chapters);
  const updatedAt = new Date().toISOString();

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from("story_chapters")
      .update({
        sequence: update.sequence,
        act: update.act,
        updated_at: updatedAt,
      })
      .eq("id", update.id)
      .eq("story_id", storyId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from("story_chapters")
    .select("*")
    .eq("story_id", storyId)
    .order("sequence");

  if (refreshError) {
    throw new Error(refreshError.message);
  }

  return (refreshed ?? []).map((row) =>
    normalizeChapter(row as Record<string, unknown>),
  );
}
