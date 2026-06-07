import type { GhostwriteTier, PlotBeat, StoryChapter } from "@/lib/types";

export function formatChapterLabel(number: number): string {
  return `Chapter ${number}`;
}

export function buildRenumberedChapterUpdates(
  chapters: Array<{ id: string; sequence: number }>,
): Array<{ id: string; sequence: number; act: string }> {
  return [...chapters]
    .sort((a, b) => a.sequence - b.sequence)
    .map((chapter, index) => ({
      id: chapter.id,
      sequence: index,
      act: formatChapterLabel(index + 1),
    }));
}

export function chaptersNeedRenumbering(
  chapters: Array<{ sequence: number; act: string }>,
): boolean {
  const sorted = [...chapters].sort((a, b) => a.sequence - b.sequence);
  return sorted.some(
    (chapter, index) => chapter.act !== formatChapterLabel(index + 1),
  );
}

export const DEFAULT_CHAPTERS: Omit<
  StoryChapter,
  "id" | "story_id" | "created_at" | "updated_at"
>[] = [
  {
    act: "Chapter 1",
    title: "The Inciting Incident",
    sequence: 0,
    plot_beats: [
      { id: "a1-1", title: "Ordinary world established" },
      { id: "a1-2", title: "Inciting incident strikes" },
    ],
    plot_objectives:
      "Establish the protagonist's world and disrupt it with a catalyzing event.",
    scene_beat: "",
    draft_content: "",
  },
  {
    act: "Chapter 2",
    title: "The Midpoint Crisis",
    sequence: 1,
    plot_beats: [
      { id: "a2-1", title: "Rising complications" },
      { id: "a2-2", title: "Midpoint reversal" },
    ],
    plot_objectives:
      "Escalate stakes and force the protagonist through a midpoint crisis.",
    scene_beat: "",
    draft_content: "",
  },
  {
    act: "Chapter 3",
    title: "The Final Confrontation",
    sequence: 2,
    plot_beats: [
      { id: "a3-1", title: "Climax approaches" },
      { id: "a3-2", title: "Final confrontation" },
    ],
    plot_objectives:
      "Deliver the climax and resolve the central dramatic question.",
    scene_beat: "",
    draft_content: "",
  },
];

export function parsePlotBeats(value: unknown): PlotBeat[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is PlotBeat =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as PlotBeat).id === "string" &&
        typeof (item as PlotBeat).title === "string",
    )
    .map((item) => ({ id: item.id, title: item.title }));
}

export function normalizeChapter(row: Record<string, unknown>): StoryChapter {
  return {
    id: String(row.id),
    story_id: String(row.story_id),
    act: String(row.act),
    title: String(row.title),
    sequence: Number(row.sequence ?? 0),
    plot_beats: parsePlotBeats(row.plot_beats),
    plot_objectives: String(row.plot_objectives ?? ""),
    scene_beat: String(row.scene_beat ?? ""),
    draft_content: String(row.draft_content ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function chapterTimestampsEqual(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) return left === right;
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  if (Number.isNaN(leftMs) || Number.isNaN(rightMs)) return left === right;
  return leftMs === rightMs;
}

export function getGhostwriteTier(sliderValue: number): GhostwriteTier {
  if (sliderValue <= 30) return "assist";
  if (sliderValue <= 70) return "copilot";
  return "ghostwriter";
}

export function formatChapterContext(chapter: StoryChapter): string {
  const beats = chapter.plot_beats.map((b) => `• ${b.title}`).join("\n");
  return [
    `Chapter: ${chapter.act} — ${chapter.title}`,
    chapter.plot_objectives
      ? `Plot objectives: ${chapter.plot_objectives}`
      : null,
    beats ? `Sequence beats:\n${beats}` : null,
    chapter.scene_beat ? `Active scene beat: ${chapter.scene_beat}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildChaptersFromLegacyWorkspace(
  storyId: string,
  draftContent: string,
  outlineJson: unknown,
  sceneBeat: string,
): Omit<StoryChapter, "id" | "created_at" | "updated_at">[] {
  const outline = Array.isArray(outlineJson) ? outlineJson : [];
  const actMap = new Map<string, { title: string; beats: PlotBeat[] }>();

  for (const item of outline) {
    if (typeof item !== "object" || item === null) continue;
    const beat = item as Record<string, unknown>;
    const act = String(beat.act ?? "Chapter 2");
    const title = String(beat.title ?? "Untitled");
    const id = String(beat.id ?? crypto.randomUUID());
    const entry = actMap.get(act) ?? { title, beats: [] };
    entry.beats.push({ id, title });
    actMap.set(act, entry);
  }

  if (actMap.size === 0) {
    return DEFAULT_CHAPTERS.map((chapter, index) => ({
      ...chapter,
      story_id: storyId,
      draft_content: index === 0 ? draftContent : "",
      scene_beat: index === 0 ? sceneBeat : "",
    }));
  }

  return [...actMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([act, data], index) => ({
      story_id: storyId,
      act,
      title: data.title,
      sequence: index,
      plot_beats: data.beats,
      plot_objectives: data.beats.map((b) => b.title).join(" → "),
      scene_beat: index === 0 ? sceneBeat : "",
      draft_content: index === 0 ? draftContent : "",
    }));
}
