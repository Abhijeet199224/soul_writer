"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Character } from "@/lib/types";
import { htmlToPlainText } from "@/lib/draft-content";
import { splitTextByCharacters } from "@/lib/character-highlight";
import { CharacterHoverCard } from "@/components/editor/CharacterHoverCard";
import { SaveStatusIndicator } from "@/components/editor/SaveStatusIndicator";
import { EditorSkeleton } from "@/components/editor/EditorSkeleton";
import { useStoryEngine } from "@/context/StoryEngineContext";
import { getGhostwriteTier } from "@/lib/chapters";
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
    onHighlightInsight,
    runSelectionSoulCheck,
    registerEditor,
  } = useStoryEngine();

  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const plainDraft = useMemo(() => htmlToPlainText(draft), [draft]);
  const segments = useMemo(
    () => splitTextByCharacters(plainDraft, characters),
    [plainDraft, characters],
  );
  const ghostTier = getGhostwriteTier(sliderValue);

  return (
    <section
      className={`flex min-w-0 flex-1 flex-col bg-[#fafaf9] transition-all duration-300 ease-in-out ${
        focusMode ? "mx-auto max-w-3xl" : ""
      }`}
    >
      <header className="shrink-0 border-b border-stone-200 bg-white px-5 py-3">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-serif text-lg text-stone-900">
              {story.title}
            </p>
            {activeChapter && (
              <p className="truncate text-xs text-stone-500">
                {activeChapter.act}: {activeChapter.title}
              </p>
            )}
          </div>
          <SaveStatusIndicator status={saveStatus} />
        </div>

        <div className="flex flex-wrap items-center gap-4">
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
            <p className="mt-1 text-[10px] text-stone-400">
              {ghostTier === "assist" &&
                "Generate shows ideas in sidebar only — no canvas writes."}
              {ghostTier === "copilot" &&
                "Generate completes your current sentence at the cursor."}
              {ghostTier === "ghostwriter" &&
                "Generate drafts 200–300 words on the canvas."}
            </p>
          </div>
          <input
            type="text"
            value={beat}
            onChange={(event) => setBeat(event.target.value)}
            placeholder="Scene beat (optional)"
            title="Active scene beat — synced from Plot Trajectory beats in the Story Bible and sent to AI prompts"
            className="min-w-[220px] flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5">
        <TipTapEditor
          onEditorReady={registerEditor}
          documentKey={activeChapterId}
          content={draft}
          onUpdate={updateDraft}
          soulCheckInsights={soulCheckInsights}
          activeInsightIndex={activeInsightIndex}
          onHighlightInsight={onHighlightInsight}
          onSelectionSoulCheck={(text) => void runSelectionSoulCheck(text)}
          selectionLoading={selectionLoading}
          placeholder="Write this chapter. Select text for Soul Check…"
        />

        {!focusMode && (
          <div className="max-h-40 shrink-0 overflow-y-auto rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-4 py-3 font-serif text-base leading-relaxed text-stone-800">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Smart Codex preview
            </p>
            {segments.map((segment, index) =>
              segment.character ? (
                <button
                  key={`${segment.text}-${index}`}
                  type="button"
                  onClick={(event) => {
                    setActiveCharacter(segment.character!);
                    setAnchorRect(event.currentTarget.getBoundingClientRect());
                  }}
                  className="border-b-2 border-amber-500/80 bg-amber-100/50 px-0.5 font-medium text-amber-900 underline decoration-amber-600 decoration-2 underline-offset-4 hover:bg-amber-200/60"
                >
                  {segment.text}
                </button>
              ) : (
                <span key={`${segment.text}-${index}`}>{segment.text}</span>
              ),
            )}
          </div>
        )}
      </div>

      {activeCharacter && anchorRect && (
        <CharacterHoverCard character={activeCharacter} anchorRect={anchorRect} />
      )}
    </section>
  );
}
