"use client";

import { useMemo, useState } from "react";
import type { StoryChapter } from "@/lib/types";
import { searchManuscriptMentions } from "@/lib/manuscript-search";

interface ManuscriptSearchPanelProps {
  chapters: StoryChapter[];
  onJumpToChapter: (chapterId: string) => void;
}

export function ManuscriptSearchPanel({
  chapters,
  onJumpToChapter,
}: ManuscriptSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"phrase" | "word">("phrase");

  const hits = useMemo(
    () => searchManuscriptMentions(chapters, query, mode),
    [chapters, query, mode],
  );

  return (
    <div className="border-b border-stone-100 px-3 py-3">
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500">
          Search manuscript
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, phrase, pronoun…"
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
        />
      </label>
      <div className="mt-2 flex gap-2 text-[10px]">
        {(["phrase", "word"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`rounded-full px-2 py-0.5 font-medium ${
              mode === key
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
      {query.trim() && (
        <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
          {hits.length === 0 ? (
            <li className="text-xs text-stone-500">No matches.</li>
          ) : (
            hits.map((hit) => (
              <li key={hit.chapterId}>
                <button
                  type="button"
                  onClick={() => onJumpToChapter(hit.chapterId)}
                  className="w-full rounded-lg border border-stone-100 bg-stone-50 px-2 py-2 text-left hover:border-amber-200"
                >
                  <span className="block text-xs font-medium text-stone-800">
                    {hit.act} · {hit.title} ({hit.mentionCount})
                  </span>
                  <span className="mt-1 block text-[11px] italic text-stone-600">
                    {hit.snippet}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
