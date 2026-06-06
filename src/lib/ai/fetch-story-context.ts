import type { SupabaseClient } from "@supabase/supabase-js";
import type { Character } from "@/lib/types";
import type { StoryBiblePayload } from "@/lib/story-bible-context";
import { parseOutlineJson } from "@/lib/story-bible-context";

export async function fetchStoryBible(
  supabase: SupabaseClient,
  storyId: string,
): Promise<StoryBiblePayload | null> {
  const [charsRes, workspaceRes] = await Promise.all([
    supabase
      .from("characters")
      .select("*")
      .eq("story_id", storyId)
      .order("name"),
    supabase
      .from("story_workspace")
      .select("outline_json, setting_notes, scene_beat")
      .eq("story_id", storyId)
      .maybeSingle(),
  ]);

  if (charsRes.error) {
    console.error("fetchStoryBible characters:", charsRes.error);
    return null;
  }

  const characters = (charsRes.data ?? []) as Character[];

  if (workspaceRes.error) {
    console.error("fetchStoryBible workspace:", workspaceRes.error);
    return { characters, outline: [], settingNotes: "", sceneBeat: "" };
  }

  const ws = workspaceRes.data;
  return {
    characters,
    outline: parseOutlineJson(ws?.outline_json),
    settingNotes: ws?.setting_notes ?? "",
    sceneBeat: ws?.scene_beat ?? "",
  };
}
