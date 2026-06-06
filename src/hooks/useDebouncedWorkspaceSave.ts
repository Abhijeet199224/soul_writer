"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveStatus } from "@/lib/types";

const DRAFT_DEBOUNCE_MS = 1500;
const META_DEBOUNCE_MS = 600;

export interface ChapterSaveSnapshot {
  chapterId: string;
  draftContent: string;
  sceneBeat: string;
  plotObjectives?: string;
}

export interface StoryMetaSnapshot {
  storyId: string;
  activeChapterId: string;
  settingNotes: string;
  sliderValue: number;
}

interface UseDebouncedChapterSaveOptions {
  chapterSnapshot: ChapterSaveSnapshot;
  metaSnapshot: StoryMetaSnapshot;
  enabled?: boolean;
  baselineKey?: string;
}

export function useDebouncedChapterSave({
  chapterSnapshot,
  metaSnapshot,
  enabled = true,
  baselineKey,
}: UseDebouncedChapterSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    baselineKey ? "saved" : "idle",
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(baselineKey ?? "");
  const chapterRef = useRef(chapterSnapshot);
  const metaRef = useRef(metaSnapshot);
  const lastDraftRef = useRef(chapterSnapshot.draftContent);

  useEffect(() => {
    chapterRef.current = chapterSnapshot;
  }, [chapterSnapshot]);

  useEffect(() => {
    metaRef.current = metaSnapshot;
  }, [metaSnapshot]);

  const persist = useCallback(async () => {
    const chapter = chapterRef.current;
    const meta = metaRef.current;
    const payloadKey = JSON.stringify({ chapter, meta });

    if (payloadKey === lastSavedRef.current) {
      setSaveStatus("saved");
      return;
    }

    if (!navigator.onLine) {
      setSaveStatus("offline");
      return;
    }

    setSaveStatus("saving");

    try {
      const response = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: meta.storyId,
          chapterId: chapter.chapterId,
          draftContent: chapter.draftContent,
          sceneBeat: chapter.sceneBeat,
          plotObjectives: chapter.plotObjectives,
          activeChapterId: meta.activeChapterId,
          settingNotes: meta.settingNotes,
          sliderValue: meta.sliderValue,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }

      lastSavedRef.current = payloadKey;
      lastDraftRef.current = chapter.draftContent;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!enabled || !chapterSnapshot.chapterId) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const payloadKey = JSON.stringify({
      chapter: chapterSnapshot,
      meta: metaSnapshot,
    });

    if (payloadKey === lastSavedRef.current) {
      setSaveStatus("saved");
      return;
    }

    const draftChanged =
      chapterSnapshot.draftContent !== lastDraftRef.current;
    const delay = draftChanged ? DRAFT_DEBOUNCE_MS : META_DEBOUNCE_MS;

    setSaveStatus((current) => (current === "saving" ? current : "idle"));

    timerRef.current = setTimeout(() => {
      void persist();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, chapterSnapshot, metaSnapshot, persist]);

  useEffect(() => {
    function handleOnline() {
      if (saveStatus === "offline" || saveStatus === "error") {
        void persist();
      }
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [persist, saveStatus]);

  return { saveStatus, flushSave: persist };
}
