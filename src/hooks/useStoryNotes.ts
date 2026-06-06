"use client";

import { useEffect, useState } from "react";
import {
  loadStoryNotes,
  saveStoryNotes,
  type OutlineBeat,
  type StoryNotes,
} from "@/lib/story-notes";

export function useStoryNotes(storyId: string) {
  const [notes, setNotes] = useState<StoryNotes>(() => loadStoryNotes(storyId));

  useEffect(() => {
    saveStoryNotes(storyId, notes);
  }, [storyId, notes]);

  function updateOutline(outline: OutlineBeat[]) {
    setNotes((current) => ({ ...current, outline }));
  }

  function updateSettingNotes(settingNotes: string) {
    setNotes((current) => ({ ...current, settingNotes }));
  }

  return { notes, updateOutline, updateSettingNotes };
}
