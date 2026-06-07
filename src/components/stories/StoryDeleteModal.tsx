"use client";

interface StoryDeleteModalProps {
  storyTitle: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onDismiss: () => void;
}

export function StoryDeleteModal({
  storyTitle,
  loading = false,
  onConfirm,
  onDismiss,
}: StoryDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/45 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
          Delete story
        </p>
        <h2 className="mt-2 font-serif text-xl text-stone-900">
          Delete &ldquo;{storyTitle}&rdquo;?
        </h2>
        <p className="mt-3 text-sm text-stone-600">
          This permanently removes the story, all chapters, characters, and
          manuscript drafts. This cannot be undone.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            disabled={loading}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-60"
          >
            {loading ? "Deleting…" : "Delete story"}
          </button>
        </div>
      </div>
    </div>
  );
}
