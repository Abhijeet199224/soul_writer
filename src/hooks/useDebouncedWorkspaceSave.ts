"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OutlineBeat } from "@/lib/story-notes";
import type { SaveStatus } from "@/lib/types";

const DEBOUNCE_MS = 1500;

export interface WorkspaceSnapshot {
  draftContent: string;
  outline: OutlineBeat[];
  settingNotes: string;
  sceneBeat: string;
  sliderValue: number;
}

interface UseDebouncedWorkspaceSaveOptions {
  storyId: string;
  snapshot: WorkspaceSnapshot;
  enabled?: boolean;
  /** Server-loaded snapshot — avoids "Unsaved changes" flash on first paint */
  baselineKey?: string;
}

export function useDebouncedWorkspaceSave({
  storyId,
  snapshot,
  enabled = true,
  baselineKey,
}: UseDebouncedWorkspaceSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    baselineKey ? "saved" : "idle",
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(baselineKey ?? "");
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const persist = useCallback(async () => {
    const current = snapshotRef.current;
    const payloadKey = JSON.stringify(current);

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
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId,
          draftContent: current.draftContent,
          outline: current.outline,
          settingNotes: current.settingNotes,
          sceneBeat: current.sceneBeat,
          sliderValue: current.sliderValue,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }

      lastSavedRef.current = payloadKey;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [storyId]);

  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const payloadKey = JSON.stringify(snapshot);
    if (payloadKey === lastSavedRef.current) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("idle");

    timerRef.current = setTimeout(() => {
      void persist();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, snapshot, persist]);

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
