"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useStoryEngine } from "@/context/StoryEngineContext";
import { getGhostwriteTier } from "@/lib/chapters";
import { SaveStatusIndicator } from "@/components/editor/SaveStatusIndicator";
import { EditorSkeleton } from "@/components/editor/EditorSkeleton";

const TipTapEditor = dynamic(
  () =>
    import("@/components/editor/TipTapEditor").then((mod) => mod.TipTapEditor),
  { ssr: false, loading: () => <EditorSkeleton /> },
);

function sliderLabel(value: number) {
  if (value <= 30) return "Human Assist";
  if (value <= 70) return "Co-Pilot";
  return "Ghostwriter";
}

export function WritingCanvas() {
  const {
    story,
    activeChapter,
    activeChapterId,
    draft,
    beat,
    sliderValue,
    saveStatus,
    focusMode,
    characters,
    soulCheckInsights,
    activeInsightIndex,
    selectionLoading,
    updateDraft,
    setBeat,
    setSliderValue,
    setChapterTitle,
    chapterTitleFocusToken,
    onHighlightInsight,
    runSelectionSoulCheck,
    registerEditor,
    syncRewriteStatesFromDocument,
    isProcessingLargeContent,
  } = useStoryEngine();

  const chapterTitleRef = useRef<HTMLInputElement>(null);
  const ghostTier = getGhostwriteTier(sliderValue);

  useEffect(() => {
    if (!chapterTitleFocusToken) return;
    chapterTitleRef.current?.focus();
    chapterTitleRef.current?.select();
  }, [chapterTitleFocusToken]);

  return (
    <section
      className={`flex min-w-0 flex-1 flex-col bg-[#fafaf9] transition-all duration-300 ease-in-out ${
        focusMode ? "mx-auto max-w-4xl" : ""
      }`}
    >
      <header className="shrink-0 border-b border-stone-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-xl tracking-tight text-stone-900">
              {story.title}
            </p>
            {activeChapter && (
              <>
                <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800">
                  {activeChapter.act}
                </p>
                <input
                  ref={chapterTitleRef}
                  type="text"
                  value={activeChapter.title}
                  onChange={(event) => setChapterTitle(event.target.value)}
                  placeholder="Chapter title…"
                  title="Chapter title — auto-focused when you add a new Act"
                  className="mt-1 w-full truncate border-b border-transparent bg-transparent font-serif text-sm text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-amber-300"
                />
              </>
            )}
          </div>
          <SaveStatusIndicator status={saveStatus} />
        </div>

        <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center gap-4">
          <div
            className="min-w-[200px] flex-1"
            title="Controls how much AI writes on the canvas: 0–30% ideas only, 31–70% completes your sentence, 71–100% drafts new paragraphs"
          >
            <div className="mb-1 flex items-center justify-between text-xs">
              <span
                className="font-medium text-stone-600"
                title="Slide left for more human control, right for more AI ghostwriting"
              >
                Collaboration Slider
              </span>
              <span className="font-medium text-amber-800">
                {sliderValue}% · {sliderLabel(sliderValue)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sliderValue}
              onChange={(event) =>
                setSliderValue(Number(event.target.value))
              }
              title={`Collaboration level ${sliderValue}% — ${sliderLabel(sliderValue)}`}
              aria-label="Collaboration slider"
              className="w-full accent-amber-700"
            />
            <p className="mt-1 text-[10px] leading-relaxed text-stone-400">
              {ghostTier === "assist" &&
                "Generate dumps scene outlines in the AI Hub only — canvas stays untouched."}
              {ghostTier === "copilot" &&
                "Generate completes or extends your current line at the cursor."}
              {ghostTier === "ghostwriter" &&
                "Generate drafts the next 200–300 words into the canvas."}
            </p>
          </div>
          <input
            type="text"
            value={beat}
            onChange={(event) => setBeat(event.target.value)}
            placeholder="Scene beat (synced from Plot Trajectory)"
            title="Active scene beat — synced from Plot Trajectory beats in the Story Bible and sent to AI prompts"
            className="min-w-[240px] flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:bg-white"
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 md:p-6">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
          {isProcessingLargeContent && (
            <p className="mb-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
              Processing a large paste — saving will continue in the background…
            </p>
          )}
          <TipTapEditor
            onEditorReady={registerEditor}
            documentKey={activeChapterId}
            characters={characters}
            content={draft}
            onUpdate={updateDraft}
            onAfterUpdate={syncRewriteStatesFromDocument}
            soulCheckInsights={soulCheckInsights}
            activeInsightIndex={activeInsightIndex}
            onHighlightInsight={onHighlightInsight}
            onSelectionSoulCheck={(text) => void runSelectionSoulCheck(text)}
            selectionLoading={selectionLoading}
            placeholder="Write this chapter. Character names underline in Smart Codex — hover for traits. Select text for Soul Check…"
          />
        </div>
      </div>
    </section>
  );
}
