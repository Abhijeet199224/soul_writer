"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Story } from "@/lib/types";
import { StoryDeleteModal } from "@/components/stories/StoryDeleteModal";
import { clearStoryLocalData } from "@/lib/story-local-data";

interface StoryLibraryProps {
  stories: Story[];
}

export function StoryLibrary({ stories: initialStories }: StoryLibraryProps) {
  const router = useRouter();
  const [stories, setStories] = useState(initialStories);
  const [deleteTarget, setDeleteTarget] = useState<Story | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/stories/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: deleteTarget.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete story");
      }

      clearStoryLocalData(deleteTarget.id);
      setStories((prev) => prev.filter((story) => story.id !== deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete story");
    } finally {
      setDeleting(false);
    }
  }

  if (!stories.length) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-10 text-center">
        <p className="font-serif text-lg text-stone-700">No stories yet</p>
        <p className="mt-2 text-sm text-stone-500">
          Create your first project to start building character profiles.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {stories.map((story) => (
          <article
            key={story.id}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <Link href={`/stories/${story.id}`} className="min-w-0 flex-1">
                <h3 className="font-serif text-xl text-stone-900 hover:text-amber-900">
                  {story.title}
                </h3>
                {story.synopsis && (
                  <p className="mt-2 line-clamp-2 text-sm text-stone-600">
                    {story.synopsis}
                  </p>
                )}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setDeleteTarget(story);
                }}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                title={`Delete ${story.title}`}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {deleteTarget && (
        <StoryDeleteModal
          storyTitle={deleteTarget.title}
          loading={deleting}
          onConfirm={confirmDelete}
          onDismiss={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        />
      )}
    </>
  );
}
