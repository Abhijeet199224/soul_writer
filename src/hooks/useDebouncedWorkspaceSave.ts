"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveStatus } from "@/lib/types";
import type { PlotBeat } from "@/lib/types";

const DRAFT_DEBOUNCE_MS = 1500;
const LARGE_DRAFT_DEBOUNCE_MS = 3500;
const META_DEBOUNCE_MS = 600;
const LARGE_DRAFT_CHAR_THRESHOLD = 50_000;
const MAX_DRAFT_SAVE_CHARS = 500_000;

export interface ChapterSaveSnapshot {
  chapterId: string;
  draftContent: string;
  sceneBeat: string;
  title?: string;
  act?: string;
  plotObjectives?: string;
  plotBeats?: PlotBeat[];
  expectedUpdatedAt?: string | null;
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
  persistBaselineKey?: string;
  onSaveConflict?: (message: string) => void;
  onChapterPersisted?: (payload: {
    chapterId: string;
    updatedAt: string;
  }) => void;
}

function stablePayloadKey(
  chapter: ChapterSaveSnapshot,
  meta: StoryMetaSnapshot,
): string {
  return JSON.stringify({
    chapter: {
      chapterId: chapter.chapterId,
      draftContent: chapter.draftContent,
      sceneBeat: chapter.sceneBeat,
      title: chapter.title,
      act: chapter.act,
      plotObjectives: chapter.plotObjectives,
      plotBeats: chapter.plotBeats,
    },
    meta,
  });
}

export function useDebouncedChapterSave({
  chapterSnapshot,
  metaSnapshot,
  enabled = true,
  baselineKey,
  persistBaselineKey,
  onSaveConflict,
  onChapterPersisted,
}: UseDebouncedChapterSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    baselineKey ? "saved" : "idle",
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(baselineKey ?? "");
  const chapterRef = useRef(chapterSnapshot);
  const metaRef = useRef(metaSnapshot);
  const onConflictRef = useRef(onSaveConflict);
  const onPersistedRef = useRef(onChapterPersisted);
  const expectedUpdatedAtRef = useRef<string | null>(
    chapterSnapshot.expectedUpdatedAt ?? null,
  );

  useEffect(() => {
    onConflictRef.current = onSaveConflict;
  }, [onSaveConflict]);

  useEffect(() => {
    onPersistedRef.current = onChapterPersisted;
  }, [onChapterPersisted]);

  const lastDraftRef = useRef(chapterSnapshot.draftContent);

  useEffect(() => {
    chapterRef.current = chapterSnapshot;
  }, [chapterSnapshot]);

  useEffect(() => {
    metaRef.current = metaSnapshot;
  }, [metaSnapshot]);

  useEffect(() => {
    expectedUpdatedAtRef.current = chapterSnapshot.expectedUpdatedAt ?? null;
  }, [chapterSnapshot.chapterId, chapterSnapshot.expectedUpdatedAt]);

  useEffect(() => {
    if (!persistBaselineKey) return;
    lastSavedRef.current = stablePayloadKey(chapterRef.current, metaRef.current);
    lastDraftRef.current = chapterRef.current.draftContent;
    expectedUpdatedAtRef.current = chapterRef.current.expectedUpdatedAt ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset save indicator after server sync
    setSaveStatus("saved");
  }, [persistBaselineKey]);

  const persist = useCallback(async () => {
    const chapter = chapterRef.current;
    const meta = metaRef.current;
    const payloadKey = stablePayloadKey(chapter, meta);

    if (payloadKey === lastSavedRef.current) {
      setSaveStatus("saved");
      return;
    }

    if (!navigator.onLine) {
      setSaveStatus("offline");
      return;
    }

    if (chapter.draftContent.length > MAX_DRAFT_SAVE_CHARS) {
      setSaveStatus("error");
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
          title: chapter.title,
          act: chapter.act,
          plotObjectives: chapter.plotObjectives,
          plotBeats: chapter.plotBeats,
          activeChapterId: meta.activeChapterId,
          settingNotes: meta.settingNotes,
          sliderValue: meta.sliderValue,
          expectedUpdatedAt: expectedUpdatedAtRef.current,
        }),
      });

      if (response.status === 409) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setSaveStatus("error");
        onConflictRef.current?.(
          data.error ??
            "This chapter was updated elsewhere. Reload the story to avoid overwriting changes.",
        );
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }

      const data = (await response.json()) as { chapterUpdatedAt?: string | null };
      if (data.chapterUpdatedAt) {
        expectedUpdatedAtRef.current = data.chapterUpdatedAt;
        onPersistedRef.current?.({
          chapterId: chapter.chapterId,
          updatedAt: data.chapterUpdatedAt,
        });
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

    const payloadKey = stablePayloadKey(chapterSnapshot, metaSnapshot);

    if (payloadKey === lastSavedRef.current) {
      setSaveStatus("saved");
      return;
    }

    const draftChanged =
      chapterSnapshot.draftContent !== lastDraftRef.current;
    const draftSize = chapterSnapshot.draftContent.length;
    let delay = draftChanged ? DRAFT_DEBOUNCE_MS : META_DEBOUNCE_MS;

    if (draftChanged && draftSize > LARGE_DRAFT_CHAR_THRESHOLD) {
      delay = LARGE_DRAFT_DEBOUNCE_MS;
    }

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
