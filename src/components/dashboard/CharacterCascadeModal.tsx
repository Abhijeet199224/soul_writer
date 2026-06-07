"use client";

import type { CascadeChapterPreview } from "@/lib/cascade-preview";

interface CharacterCascadeModalProps {
  fieldLabel: string;
  oldText: string;
  newText: string;
  mentionCount: number;
  previews: CascadeChapterPreview[];
  warnings: string[];
  excludedChapterIds: string[];
  activeChapterDiff?: { before: string; after: string } | null;
  queuedCount?: number;
  loading?: boolean;
  onToggleChapter: (chapterId: string) => void;
  onExportSnapshot: () => void;
  onSkip: () => void;
  onCancelAll: () => void;
  onConfirm: () => void | Promise<void>;
}

function describeChangeKind(fieldLabel: string) {
  if (fieldLabel.startsWith("pronoun")) return "pronoun";
  if (fieldLabel === "character name") return "name";
  if (fieldLabel.startsWith("character alias")) return "alias";
  if (fieldLabel === "age reference") return "age reference";
  return "attribute phrase";
}

export function CharacterCascadeModal({
  fieldLabel,
  oldText,
  newText,
  mentionCount,
  previews,
  warnings,
  excludedChapterIds,
  activeChapterDiff,
  queuedCount = 0,
  loading = false,
  onToggleChapter,
  onExportSnapshot,
  onSkip,
  onCancelAll,
  onConfirm,
}: CharacterCascadeModalProps) {
  const changeKind = describeChangeKind(fieldLabel);
  const excluded = new Set(excludedChapterIds);
  const effectiveMentions = previews.reduce(
    (sum, preview) => sum + preview.mentionsReplaced,
    0,
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/45 p-4 backdrop-blur-[2px]"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cascade-modal-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl shadow-stone-900/15"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-stone-100 p-6">
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
            Replace{" "}
            <strong className="text-stone-900">{effectiveMentions || mentionCount}</strong>{" "}
            mention{effectiveMentions === 1 ? "" : "s"} of{" "}
            <strong className="text-stone-900">{oldText || "removed text"}</strong>
            {newText ? (
              <>
                {" "}
                with <strong className="text-amber-900">{newText}</strong>
              </>
            ) : (
              <> (remove from manuscript)</>
            )}{" "}
            across selected chapters. Active canvas edits stay undo-safe (Ctrl+Z).
          </p>
          {queuedCount > 0 && (
            <p className="mt-2 text-xs text-stone-500">
              {queuedCount} more character update{queuedCount === 1 ? "" : "s"} queued.
            </p>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-medium">Pronoun guardrails</p>
              <p className="mt-1 text-amber-900/90">
                These sentences use “{oldText}” without mentioning the character nearby:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {activeChapterDiff && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Active chapter diff
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-stone-500">Before</p>
                  <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm text-stone-700">
                    {activeChapterDiff.before}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-500">After</p>
                  <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm text-stone-800">
                    {activeChapterDiff.after}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Chapter preview
              </p>
              <button
                type="button"
                onClick={onExportSnapshot}
                disabled={loading}
                className="text-xs font-medium text-amber-800 hover:underline disabled:opacity-50"
              >
                Export snapshot backup
              </button>
            </div>
            <ul className="space-y-2">
              {previews.map((preview) => {
                const isExcluded = excluded.has(preview.chapterId);
                return (
                  <li
                    key={preview.chapterId}
                    className={`rounded-xl border p-3 ${
                      isExcluded
                        ? "border-stone-200 bg-stone-50 opacity-60"
                        : "border-amber-100 bg-amber-50/40"
                    }`}
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => onToggleChapter(preview.chapterId)}
                        disabled={loading}
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-stone-900">
                          {preview.act} · {preview.title}
                        </span>
                        <span className="mt-1 block text-xs text-stone-500">
                          {preview.mentionsReplaced} mention
                          {preview.mentionsReplaced === 1 ? "" : "s"}
                        </span>
                        <span className="mt-2 block text-sm italic text-stone-700">
                          “{preview.snippet}”
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 p-4">
          <button
            type="button"
            onClick={onCancelAll}
            disabled={loading}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
          >
            Cancel all
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
          >
            Skip this update
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading || effectiveMentions === 0}
            className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Syncing manuscript…" : `Update ${changeKind} in selected chapters`}
          </button>
        </div>
      </div>
    </div>
  );
}
