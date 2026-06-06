"use client";

interface SelectionSoulCheckMenuProps {
  top: number;
  left: number;
  onRunSoulCheck: () => void;
  onDismiss: () => void;
  loading?: boolean;
}

export function SelectionSoulCheckMenu({
  top,
  left,
  onRunSoulCheck,
  onDismiss,
  loading = false,
}: SelectionSoulCheckMenuProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Dismiss selection menu"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onDismiss}
      />
      <div
        className="fixed z-50 -translate-x-1/2"
        style={{ top: top - 44, left }}
      >
        <button
          type="button"
          onClick={onRunSoulCheck}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-amber-900 shadow-lg shadow-amber-900/10 backdrop-blur-sm transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-60"
        >
          <span aria-hidden>✨</span>
          {loading ? "Checking…" : "Run Soul Check"}
        </button>
      </div>
    </>
  );
}
