"use client";

interface RenameConfirmModalProps {
  oldName: string;
  newName: string;
  mentionCount: number;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function RenameConfirmModal({
  oldName,
  newName,
  mentionCount,
  onConfirm,
  onDismiss,
}: RenameConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-modal-title"
        className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl shadow-stone-900/15"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
          Living lore sync
        </p>
        <h2
          id="rename-modal-title"
          className="mt-2 font-serif text-xl text-stone-900"
        >
          Update character name in this chapter?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Change all {mentionCount} mention{mentionCount === 1 ? "" : "s"} of{" "}
          <strong className="text-stone-900">{oldName}</strong> to{" "}
          <strong className="text-amber-900">{newName}</strong> in the active
          manuscript? This swap uses TipTap transactions — Ctrl+Z can revert it.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            Keep Original
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
          >
            Update All
          </button>
        </div>
      </div>
    </div>
  );
}
