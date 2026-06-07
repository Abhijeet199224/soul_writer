import type { CascadeMatchMode } from "@/lib/character-attribute-sync";

export interface PendingCascadeJob {
  id: string;
  storyId: string;
  oldText: string;
  newText: string;
  matchMode: CascadeMatchMode;
  excludeChapterIds: string[];
  createdAt: string;
  attempts: number;
  lastError?: string;
}

const STORAGE_KEY = "soul-writer-cascade-retry-queue";

function readQueue(): PendingCascadeJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingCascadeJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(jobs: PendingCascadeJob[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function enqueueCascadeRetry(job: Omit<PendingCascadeJob, "id" | "createdAt" | "attempts">): void {
  const next: PendingCascadeJob = {
    ...job,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  writeQueue([...readQueue(), next]);
}

export function listCascadeRetries(storyId?: string): PendingCascadeJob[] {
  const jobs = readQueue();
  return storyId ? jobs.filter((job) => job.storyId === storyId) : jobs;
}

export function removeCascadeRetry(id: string): void {
  writeQueue(readQueue().filter((job) => job.id !== id));
}

export function markCascadeRetryFailed(id: string, error: string): void {
  writeQueue(
    readQueue().map((job) =>
      job.id === id
        ? { ...job, attempts: job.attempts + 1, lastError: error }
        : job,
    ),
  );
}

export async function flushCascadeRetryQueue(storyId: string): Promise<number> {
  const jobs = listCascadeRetries(storyId);
  let flushed = 0;

  for (const job of jobs) {
    try {
      const res = await fetch("/api/characters/cascade-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: job.storyId,
          oldText: job.oldText,
          newText: job.newText,
          matchMode: job.matchMode,
          excludeChapterIds: job.excludeChapterIds,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        markCascadeRetryFailed(job.id, data.error ?? "Retry failed");
        continue;
      }
      removeCascadeRetry(job.id);
      flushed += 1;
    } catch (error) {
      markCascadeRetryFailed(
        job.id,
        error instanceof Error ? error.message : "Retry failed",
      );
    }
  }

  return flushed;
}
