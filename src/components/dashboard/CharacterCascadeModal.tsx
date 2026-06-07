"use client";

interface CharacterCascadeModalProps {
  fieldLabel: string;
  oldText: string;
  newText: string;
  mentionCount: number;
  queuedCount?: number;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onDismiss: () => void;
}

function describeChangeKind(fieldLabel: string) {
  if (fieldLabel.startsWith("pronoun")) return "pronoun";
  if (fieldLabel === "character name") return "name";
  return "attribute phrase";
}

export function CharacterCascadeModal({
  fieldLabel,
  oldText,
  newText,
  mentionCount,
  queuedCount = 0,
  loading = false,
  onConfirm,
  onDismiss,
}: CharacterCascadeModalProps) {
  const changeKind = describeChangeKind(fieldLabel);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={loading ? undefined : onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cascade-modal-title"
        className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl shadow-stone-900/15"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
          Living lore sync
        </p>
        <h2
          id="cascade-modal-title"
          className="mt-2 font-serif text-xl text-stone-900"
        >
          Update {fieldLabel} across your manuscript?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Change all {mentionCount} mention{mentionCount === 1 ? "" : "s"} of{" "}
          <strong className="text-stone-900">{oldText}</strong> to{" "}
          <strong className="text-amber-900">{newText}</strong> in every Act and
          chapter? Background storage updates immediately for this {changeKind},
          and the open canvas uses TipTap transactions — Ctrl+Z can revert the
          active chapter.
        </p>
        {queuedCount > 0 && (
          <p className="mt-2 text-xs text-stone-500">
            {queuedCount} more character update
            {queuedCount === 1 ? "" : "s"} queued after this one.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            disabled={loading}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep Original
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Syncing manuscript…" : "Update All Chapters"}
          </button>
        </div>
      </div>
    </div>
  );
}
