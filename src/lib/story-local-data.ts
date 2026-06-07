import { getStoryNotesKey } from "@/lib/story-notes";

const CASCADE_RETRY_KEY = "soul-writer-cascade-retry-queue";

export function clearStoryLocalData(storyId: string): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(getStoryNotesKey(storyId));

  try {
    const raw = localStorage.getItem(CASCADE_RETRY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Array<{ storyId?: string }>;
    if (!Array.isArray(parsed)) return;
    const next = parsed.filter((job) => job.storyId !== storyId);
    localStorage.setItem(CASCADE_RETRY_KEY, JSON.stringify(next));
  } catch {
    // ignore malformed queue data
  }
}
