import type { PlotBeat } from "@/lib/types";

export const DEFAULT_NEW_ACT_PLOT_BEATS: PlotBeat[] = [
  { id: "beat-opening", title: "Opening beat" },
  { id: "beat-development", title: "Development beat" },
  { id: "beat-turn", title: "Turning point" },
];

export function createPlotBeat(title = "New beat"): PlotBeat {
  return {
    id: crypto.randomUUID(),
    title: title.trim() || "New beat",
  };
}

export function reorderPlotBeats(
  beats: PlotBeat[],
  beatId: string,
  direction: "up" | "down",
): PlotBeat[] {
  const index = beats.findIndex((beat) => beat.id === beatId);
  if (index < 0) return beats;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= beats.length) return beats;
  const next = [...beats];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function renamePlotBeat(
  beats: PlotBeat[],
  beatId: string,
  title: string,
): PlotBeat[] {
  return beats.map((beat) =>
    beat.id === beatId ? { ...beat, title: title.trim() || beat.title } : beat,
  );
}

export function removePlotBeat(beats: PlotBeat[], beatId: string): PlotBeat[] {
  return beats.filter((beat) => beat.id !== beatId);
}

export function addPlotBeat(beats: PlotBeat[], title?: string): PlotBeat[] {
  return [...beats, createPlotBeat(title ?? "New beat")];
}

export function buildOutlineFromChapters(
  chapters: Array<{
    act: string;
    title: string;
    plot_beats: PlotBeat[];
  }>,
): Array<{ id: string; title: string; act: string }> {
  return chapters.flatMap((chapter) =>
    chapter.plot_beats.map((beat) => ({
      id: beat.id,
      title: beat.title,
      act: chapter.act,
    })),
  );
}
