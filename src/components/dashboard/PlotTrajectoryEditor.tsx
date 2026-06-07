"use client";

import type { PlotBeat } from "@/lib/types";

interface PlotTrajectoryEditorProps {
  beats: PlotBeat[];
  activeBeatTitle?: string;
  onSelectBeat: (title: string) => void;
  onAddBeat: () => void;
  onRenameBeat: (beatId: string, title: string) => void;
  onRemoveBeat: (beatId: string) => void;
  onMoveBeat: (beatId: string, direction: "up" | "down") => void;
}

export function PlotTrajectoryEditor({
  beats,
  activeBeatTitle,
  onSelectBeat,
  onAddBeat,
  onRenameBeat,
  onRemoveBeat,
  onMoveBeat,
}: PlotTrajectoryEditorProps) {
  return (
    <div className="mt-3 space-y-2 border-t border-stone-200/80 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
          Plot trajectory
        </p>
        <button
          type="button"
          onClick={onAddBeat}
          className="text-[10px] font-medium text-amber-800 hover:underline"
        >
          + Add beat
        </button>
      </div>

      {beats.length === 0 ? (
        <p className="text-[11px] text-stone-500">
          No beats yet. Add beats to map this chapter&apos;s trajectory.
        </p>
      ) : (
        <ul className="space-y-1">
          {beats.map((beat, index) => {
            const beatActive = activeBeatTitle === beat.title;
            return (
              <li
                key={beat.id}
                className={`rounded-lg border px-2 py-1.5 ${
                  beatActive
                    ? "border-amber-200 bg-amber-50"
                    : "border-stone-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectBeat(beat.title)}
                    title="Focus this beat in the canvas and AI context"
                    className="mt-1 shrink-0 text-[10px] text-amber-800"
                  >
                    •
                  </button>
                  <input
                    value={beat.title}
                    onChange={(event) =>
                      onRenameBeat(beat.id, event.target.value)
                    }
                    className="min-w-0 flex-1 bg-transparent text-[11px] text-stone-800 outline-none"
                  />
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => onMoveBeat(beat.id, "up")}
                      className="text-[10px] text-stone-400 disabled:opacity-30"
                      title="Move beat up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === beats.length - 1}
                      onClick={() => onMoveBeat(beat.id, "down")}
                      className="text-[10px] text-stone-400 disabled:opacity-30"
                      title="Move beat down"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveBeat(beat.id)}
                    className="text-[10px] text-red-600 hover:text-red-800"
                    title="Remove beat"
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
