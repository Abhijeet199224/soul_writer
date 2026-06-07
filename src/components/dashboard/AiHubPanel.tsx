"use client";

import { useEffect, useRef, useState } from "react";
import {
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from "lucide-react";
import type { GhostwriteResult, SoulCheckInsight } from "@/lib/gemini/generate";
import {
  useStoryEngine,
  type InsightRewriteState,
} from "@/context/StoryEngineContext";
import { getGhostwriteTier } from "@/lib/chapters";

export interface SoulCheckAiResult {
  kind: "soul-check";
  data: { insights: SoulCheckInsight[] };
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

const severityBadge = {
  cold: "bg-indigo-100 text-indigo-800",
  lukewarm: "bg-amber-100 text-amber-900",
} as const;

const activeCardStyles = {
  cold: "border-indigo-400/80 ring-2 ring-indigo-400/60 ring-offset-2 shadow-lg shadow-indigo-200/40 soul-card-active-cold",
  lukewarm:
    "border-amber-400/80 ring-2 ring-amber-400/60 ring-offset-2 shadow-lg shadow-amber-200/40 soul-card-active-lukewarm",
} as const;

function RewriteCompareBar({
  rewriteState,
  onToggle,
}: {
  rewriteState: InsightRewriteState;
  onToggle: () => void;
}) {
  const showing = rewriteState.showingApplied;

  return (
    <div className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
          {showing ? "AI rewrite applied" : "Showing original"}
          {rewriteState.label ? ` · ${rewriteState.label}` : ""}
        </p>
        <button
          type="button"
          onClick={onToggle}
          title={
            showing
              ? "Swap back to your original sentence in the canvas (Ctrl+Z also works)"
              : "Re-apply the AI suggestion in the canvas"
          }
          className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-900 transition hover:bg-emerald-100"
        >
          {showing ? "↩️ Revert to Original" : "✨ Show AI Rewrite"}
        </button>
      </div>
      <p className="mt-2 font-serif text-xs italic leading-relaxed text-stone-600">
        {showing ? rewriteState.appliedText : rewriteState.originalText}
      </p>
    </div>
  );
}

function SoulCheckInsightCard({
  insight,
  index,
  isActive,
  cardRef,
  rewriteState,
  customLoading,
  onApplyPreset,
  onCustomRewrite,
  onToggleRewrite,
  onResolve,
}: {
  insight: SoulCheckInsight;
  index: number;
  isActive: boolean;
  cardRef: (element: HTMLElement | null) => void;
  rewriteState?: InsightRewriteState;
  customLoading: boolean;
  onApplyPreset: (
    insightIndex: number,
    target: string,
    replacement: string,
    label: string,
  ) => void;
  onCustomRewrite: (
    insightIndex: number,
    target: string,
    prompt: string,
  ) => void;
  onToggleRewrite: (insightIndex: number) => void;
  onResolve: (insightIndex: number) => void;
}) {
  const tones = insight.toneSuggestions;
  const [customPrompt, setCustomPrompt] = useState("");

  return (
    <article
      ref={cardRef}
      className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-300 ${
        isActive ? activeCardStyles[insight.severity] : "hover:border-stone-300"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityBadge[insight.severity]}`}
        >
          {insight.severity}
        </span>
        <span className="text-[10px] text-stone-400">#{index + 1}</span>
      </div>

      <blockquote className="border-l-2 border-amber-400/60 bg-amber-50/40 px-3 py-2 font-serif text-sm italic leading-relaxed text-stone-700">
        &ldquo;{insight.targetText}&rdquo;
      </blockquote>

      {rewriteState && (
        <RewriteCompareBar
          rewriteState={rewriteState}
          onToggle={() => onToggleRewrite(index)}
        />
      )}

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
        Editorial Critique
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
        {insight.critique}
      </p>

      <div className="mt-4 rounded-xl border border-stone-700/60 bg-stone-900 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300">
          Soul Revision Prompt
        </p>
        <p className="mt-2 font-serif text-sm leading-relaxed text-stone-200">
          {insight.soulPrompt}
        </p>
      </div>

      {tones && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            Inspirational tone presets
          </p>
          <p className="text-[10px] text-stone-400">
            Quick-start ideas — use the custom field below for any style you
            want.
          </p>
          <div className="flex flex-col gap-2">
            {(
              [
                ["visceral", "Visceral", tones.visceral],
                ["subtextual", "Subtextual", tones.subtextual],
                ["dramatic", "Dramatic", tones.dramatic],
              ] as const
            )
              .filter(([, , text]) => text?.trim())
              .map(([key, label, text]) => (
                <button
                  key={key}
                  type="button"
                  title={`Apply ${label} rewrite to canvas — undo with Ctrl+Z or Revert`}
                  onClick={() =>
                    onApplyPreset(index, insight.targetText, text, label)
                  }
                  className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-left text-xs text-stone-700 transition hover:border-amber-300 hover:bg-amber-50/60"
                >
                  <span className="font-semibold text-amber-800">{label}</span>
                  <span className="mt-1 block font-serif italic leading-relaxed">
                    {text}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      <form
        className="mt-4 border-t border-stone-100 pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!customPrompt.trim() || customLoading) return;
          onCustomRewrite(index, insight.targetText, customPrompt);
          setCustomPrompt("");
        }}
      >
        <label
          htmlFor={`custom-tone-${index}`}
          className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500"
        >
          ✨ Adjust to any custom tone/style…
        </label>
        <input
          id={`custom-tone-${index}`}
          type="text"
          value={customPrompt}
          onChange={(event) => setCustomPrompt(event.target.value)}
          disabled={customLoading}
          placeholder='e.g. "Make it more sarcastic", "Write it like Hemingway", "Infuse dread"'
          title="Describe any tone or style — press Enter to rewrite this sentence on the canvas"
          className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-400 disabled:opacity-60"
        />
        {customLoading && (
          <p className="mt-1.5 text-[10px] text-amber-700">
            Crafting your custom rewrite…
          </p>
        )}
      </form>

      <button
        type="button"
        onClick={() => onResolve(index)}
        title="Clear the canvas highlight and dismiss this critique"
        className="mt-3 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
      >
        ✓ Mark as Resolved
      </button>
    </article>
  );
}

function ghostwriteButtonLabel(sliderValue: number, loading: boolean) {
  const tier = getGhostwriteTier(sliderValue);
  if (loading) {
    if (tier === "assist") return "Analyzing structure…";
    if (tier === "copilot") return "Completing sentence…";
    return "Ghostwriting…";
  }
  if (tier === "assist") return "Generate ideas (sidebar only)";
  if (tier === "copilot") return "Complete at cursor";
  return "Generate next 200–300 words";
}

function soulCheckButtonTitle(sliderValue: number) {
  return `Run Soul Check on the full chapter — scans for flat prose and suggests tone rewrites (Collaboration Slider: ${sliderValue}%)`;
}

export function AiHubPanel() {
  const engine = useStoryEngine();
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const activeResult =
    engine.aiTab === "soul-check"
      ? engine.soulCheckResult
      : engine.ghostwriteResult;
  const isLoading =
    engine.aiLoading === engine.aiTab ||
    (engine.aiTab === "soul-check" && engine.selectionLoading);
  const isBusy = engine.aiLoading !== null || engine.selectionLoading;

  useEffect(() => {
    if (engine.activeInsightIndex == null) return;
    const card = cardRefs.current[engine.activeInsightIndex];
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [engine.activeInsightIndex]);

  if (engine.aiHubCollapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center overflow-hidden border-l border-stone-200 bg-white py-4 transition-all duration-300 ease-in-out">
        <button
          type="button"
          onClick={() => engine.setAiHubCollapsed(false)}
          title="Expand AI Hub — Soul Check & Ghostwriter"
          className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-stone-200 bg-white transition-all duration-300 ease-in-out xl:w-96">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">
          AI Hub
        </p>
        <button
          type="button"
          onClick={() => engine.setAiHubCollapsed(true)}
          title="Collapse AI Hub for focus writing"
          className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex border-b border-stone-100 p-2">
        <button
          type="button"
          onClick={() => engine.setAiTab("soul-check")}
          title="Soul Checker — editorial insights and tone rewrites"
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
            engine.aiTab === "soul-check"
              ? "bg-amber-100 text-amber-900"
              : "text-stone-500 hover:bg-stone-50"
          }`}
        >
          Soul Checker
        </button>
        <button
          type="button"
          onClick={() => engine.setAiTab("ghostwrite")}
          title="Ghostwriter — AI prose at your collaboration level"
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
            engine.aiTab === "ghostwrite"
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
          onClick={() =>
            engine.aiTab === "soul-check"
              ? void engine.runSoulCheck()
              : void engine.runGhostwrite()
          }
          disabled={isBusy || engine.characters.length === 0}
          title={
            engine.aiTab === "soul-check"
              ? soulCheckButtonTitle(engine.sliderValue)
              : `Ghostwriter at ${engine.sliderValue}% — ${ghostwriteButtonLabel(engine.sliderValue, false)}`
          }
          className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
            engine.aiTab === "soul-check"
              ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
              : "bg-stone-900 text-white hover:bg-stone-800"
          }`}
        >
          {engine.aiLoading === engine.aiTab
            ? engine.aiTab === "soul-check"
              ? "Checking soul…"
              : ghostwriteButtonLabel(engine.sliderValue, true)
            : engine.aiTab === "soul-check"
              ? "Run Soul Check (chapter)"
              : ghostwriteButtonLabel(engine.sliderValue, false)}
        </button>

        {engine.inlineNotice && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
            {engine.inlineNotice}
            <button
              type="button"
              onClick={engine.clearInlineNotice}
              className="ml-2 font-medium underline"
            >
              Dismiss
            </button>
          </p>
        )}

        {engine.aiError && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {engine.aiError}
          </p>
        )}

        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            Story bible injected
          </p>
          <p className="mt-1 text-xs text-stone-600">
            {engine.linkedNames.length > 0
              ? engine.linkedNames.join(", ")
              : "All bible characters (none named in draft)"}
          </p>
          {engine.activeChapter && (
            <p className="mt-1 text-[10px] text-amber-700">
              Chapter context: {engine.activeChapter.act}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs text-amber-800">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Gemini is reading your chapter…</span>
            </div>
            <InsightSkeleton />
          </div>
        ) : activeResult ? (
          activeResult.kind === "soul-check" ? (
            activeResult.data.insights.length === 0 ? (
              <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
                <p className="font-serif text-base text-emerald-900">
                  ✨ Voice is solid! No flat spots detected.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeResult.data.insights.map((insight, index) => (
                  <SoulCheckInsightCard
                    key={`${insight.targetText}-${index}`}
                    insight={insight}
                    index={index}
                    isActive={engine.activeInsightIndex === index}
                    cardRef={(element) => {
                      cardRefs.current[index] = element;
                    }}
                    rewriteState={engine.rewriteStates[index]}
                    customLoading={engine.customRewriteLoading === index}
                    onApplyPreset={engine.applyPresetRewrite}
                    onCustomRewrite={(idx, target, prompt) =>
                      void engine.runCustomRewrite(idx, target, prompt)
                    }
                    onToggleRewrite={engine.toggleRewrite}
                    onResolve={engine.resolveInsight}
                  />
                ))}
              </div>
            )
          ) : activeResult.data.tier === "assist" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                  Structural advice (sidebar only)
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">
                  {activeResult.data.structuralAdvice}
                </p>
              </div>
              {activeResult.data.outlineIdeas && (
                <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    Scene ideas to write manually
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
                    {activeResult.data.outlineIdeas}
                  </p>
                </div>
              )}
              {activeResult.data.rationale && (
                <p className="text-xs text-stone-500">
                  {activeResult.data.rationale}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-stone-900 p-4 text-stone-100">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                {activeResult.data.tier === "copilot"
                  ? "Co-pilot completion"
                  : "Ghostwriter output"}
              </p>
              {activeResult.data.prose && (
                <div className="mt-3 whitespace-pre-wrap font-serif text-sm leading-relaxed text-stone-200">
                  {activeResult.data.prose}
                </div>
              )}
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
              Run Soul Check or Ghostwriter for this chapter.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
