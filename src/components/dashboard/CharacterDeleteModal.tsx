"use client";

interface CharacterDeleteModalProps {
  characterName: string;
  mentionCount: number;
  loading?: boolean;
  onRemoveMentions: () => void | Promise<void>;
  onReplacePlaceholder: () => void | Promise<void>;
  onCodexOnly: () => void;
  onDismiss: () => void;
}

export function CharacterDeleteModal({
  characterName,
  mentionCount,
  loading = false,
  onRemoveMentions,
  onReplacePlaceholder,
  onCodexOnly,
  onDismiss,
}: CharacterDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/45 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
          Character deletion
        </p>
        <h2 className="mt-2 font-serif text-xl text-stone-900">
          Delete {characterName}?
        </h2>
        <p className="mt-3 text-sm text-stone-600">
          {mentionCount > 0
            ? `This name appears ${mentionCount} time${mentionCount === 1 ? "" : "s"} across your manuscript. Choose how to handle historical text.`
            : "This character has no detected mentions in chapter drafts."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {mentionCount > 0 && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => void onRemoveMentions()}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
              >
                Remove all mentions from manuscript
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void onReplacePlaceholder()}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
              >
                Replace with [removed character]
              </button>
            </>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={onCodexOnly}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Delete from codex only
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onDismiss}
            className="rounded-xl px-4 py-2 text-sm text-stone-500 hover:text-stone-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
