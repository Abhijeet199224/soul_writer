"use client";

import type { SaveStatus } from "@/lib/types";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
}

const labels: Record<SaveStatus, string> = {
  idle: "Unsaved changes",
  saving: "Saving…",
  saved: "Changes saved",
  error: "Save failed",
  offline: "Offline — syncing when back",
};

const dotColors: Record<SaveStatus, string> = {
  idle: "bg-amber-400",
  saving: "bg-amber-500 animate-pulse",
  saved: "bg-emerald-500",
  error: "bg-red-500",
  offline: "bg-stone-400 animate-pulse",
};

export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  return (
    <div
      className="flex items-center gap-1.5 text-[11px] text-stone-400"
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColors[status]}`}
        aria-hidden
      />
      <span className="opacity-80">{labels[status]}</span>
    </div>
  );
}
