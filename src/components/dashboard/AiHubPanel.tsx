"use client";

import {
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from "lucide-react";
import type { GhostwriteResult, SoulCheckResult } from "@/lib/gemini/generate";

export interface SoulCheckAiResult {
  kind: "soul-check";
  data: SoulCheckResult;
  charactersUsed: string[];
  sliderValue: number;
  timestamp: number;
}

export interface GhostwriteAiResult {
  kind: "ghostwrite";
  data: GhostwriteResult;
  charactersUsed: string[];
  sliderValue: number;
  timestamp: number;
}

export type AiResult = SoulCheckAiResult | GhostwriteAiResult;

type AiHubTab = "soul-check" | "ghostwrite";

interface AiHubPanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: AiHubTab;
  onTabChange: (tab: AiHubTab) => void;
  soulCheckResult: SoulCheckAiResult | null;
  ghostwriteResult: GhostwriteAiResult | null;
  linkedNames: string[];
  loading: AiHubTab | null;
  error: string | null;
  charactersCount: number;
  onRunSoulCheck: () => void;
  onRunGhostwrite: () => void;
}

function InsightSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((key) => (
        <div
          key={key}
          className="animate-pulse rounded-xl border border-amber-100 bg-amber-50/40 p-4"
        >
          <div className="h-3 w-1/3 rounded bg-amber-200/70" />
          <div className="mt-3 space-y-2">
            <div className="h-2 w-full rounded bg-amber-100" />
            <div className="h-2 w-5/6 rounded bg-amber-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

const toneStyles = {
  encouraging: "border-emerald-200 bg-emerald-50/50",
  cautionary: "border-amber-300 bg-amber-50/80",
  celebratory: "border-violet-200 bg-violet-50/50",
} as const;

export function AiHubPanel({
  collapsed,
  onToggleCollapse,
  activeTab,
  onTabChange,
  soulCheckResult,
  ghostwriteResult,
  linkedNames,
  loading,
  error,
  charactersCount,
  onRunSoulCheck,
  onRunGhostwrite,
}: AiHubPanelProps) {
  const activeResult =
    activeTab === "soul-check" ? soulCheckResult : ghostwriteResult;
  const isLoading = loading === activeTab;

  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center border-l border-stone-200 bg-white py-4 transition-all duration-300 ease-in-out">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expand AI Hub"
          className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-stone-200 bg-white transition-all duration-300 ease-in-out xl:w-96">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">
          AI Hub
        </p>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Collapse AI Hub"
          className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex border-b border-stone-100 p-2">
        <button
          type="button"
          onClick={() => onTabChange("soul-check")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
            activeTab === "soul-check"
              ? "bg-amber-100 text-amber-900"
              : "text-stone-500 hover:bg-stone-50"
          }`}
        >
          Soul Checker
        </button>
        <button
          type="button"
          onClick={() => onTabChange("ghostwrite")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
            activeTab === "ghostwrite"
              ? "bg-stone-900 text-white"
              : "text-stone-500 hover:bg-stone-50"
          }`}
        >
          Ghostwriter
        </button>
      </div>

      <div className="border-b border-stone-100 p-4">
        <button
          type="button"
          onClick={activeTab === "soul-check" ? onRunSoulCheck : onRunGhostwrite}
          disabled={loading !== null || charactersCount === 0}
          className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
            activeTab === "soul-check"
              ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
              : "bg-stone-900 text-white hover:bg-stone-800"
          }`}
        >
          {loading === activeTab
            ? activeTab === "soul-check"
              ? "Checking soul…"
              : "Ghostwriting…"
            : activeTab === "soul-check"
              ? "Run Soul Check (full draft)"
              : "Generate"}
        </button>

        <p className="mt-2 text-[10px] text-stone-400">
          Tip: highlight a passage in the editor for a targeted Soul Check.
        </p>

        {charactersCount === 0 && (
          <p className="mt-2 text-xs text-red-600">
            Add characters in the Navigator first.
          </p>
        )}
        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            Story bible injected
          </p>
          <p className="mt-1 text-xs text-stone-600">
            {linkedNames.length > 0
              ? linkedNames.join(", ")
              : "All bible characters (none named in draft)"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs text-amber-800">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Gemini is reading your prose…</span>
            </div>
            <InsightSkeleton />
          </div>
        ) : activeResult ? (
          activeResult.kind === "soul-check" ? (
            <div className="space-y-3">
              <p className="text-xs text-stone-500">{activeResult.data.summary}</p>
              {activeResult.data.insights.map((insight, index) => (
                <article
                  key={`${insight.title}-${index}`}
                  className={`rounded-xl border p-4 ${toneStyles[insight.tone]}`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    {insight.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-800">
                    {insight.body}
                  </p>
                </article>
              ))}
              <p className="text-[10px] text-stone-400">
                {activeResult.charactersUsed.join(", ")} · {activeResult.sliderValue}%
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-stone-900 p-4 text-stone-100">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                Ghostwriter output
              </p>
              <p className="mt-1 text-[10px] text-stone-400">
                {activeResult.charactersUsed.join(", ")} · {activeResult.sliderValue}%
              </p>
              <div className="mt-3 whitespace-pre-wrap font-serif text-sm leading-relaxed text-stone-200">
                {activeResult.data.prose}
              </div>
              {activeResult.data.rationale && (
                <p className="mt-3 border-t border-stone-700 pt-3 text-xs text-stone-400">
                  {activeResult.data.rationale}
                </p>
              )}
            </div>
          )
        ) : (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center">
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-amber-400/70" />
            <p className="font-serif text-sm text-stone-600">
              {activeTab === "soul-check"
                ? "Highlight text and run Soul Check, or audit the full draft from here."
                : "Generate prose grounded in your Story Bible."}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
