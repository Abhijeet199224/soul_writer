"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Character, SaveStatus, Story } from "@/lib/types";
import { splitTextByCharacters } from "@/lib/character-highlight";
import { CharacterHoverCard } from "@/components/editor/CharacterHoverCard";
import { SaveStatusIndicator } from "@/components/editor/SaveStatusIndicator";
import { SelectionSoulCheckMenu } from "@/components/editor/SelectionSoulCheckMenu";

interface WritingCanvasProps {
  story: Story;
  draft: string;
  onDraftChange: (value: string) => void;
  sliderValue: number;
  onSliderChange: (value: number) => void;
  beat: string;
  onBeatChange: (value: string) => void;
  characters: Character[];
  activeCharacter: Character | null;
  anchorRect: DOMRect | null;
  onCharacterClick: (
    character: Character,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  onClearHover: () => void;
  saveStatus: SaveStatus;
  focusMode: boolean;
  onSelectionSoulCheck: (selectedText: string) => Promise<void>;
  selectionLoading: boolean;
}

function sliderLabel(value: number) {
  if (value <= 25) return "Inspiration";
  if (value <= 50) return "Brainstorm";
  if (value <= 75) return "Co-Drafting";
  return "Ghostwriter";
}

export function WritingCanvas({
  story,
  draft,
  onDraftChange,
  sliderValue,
  onSliderChange,
  beat,
  onBeatChange,
  characters,
  activeCharacter,
  anchorRect,
  onCharacterClick,
  onClearHover,
  saveStatus,
  focusMode,
  onSelectionSoulCheck,
  selectionLoading,
}: WritingCanvasProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectionMenu, setSelectionMenu] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);

  const segments = useMemo(
    () => splitTextByCharacters(draft, characters),
    [draft, characters],
  );

  const handleSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.slice(start, end).trim();

    if (!selected || selected.length < 3) {
      setSelectionMenu(null);
      return;
    }

    const rect = textarea.getBoundingClientRect();
    const lineHeight = 28;
    const linesBefore = draft.slice(0, start).split("\n").length - 1;
    const top = rect.top + 80 + linesBefore * lineHeight;
    const left = rect.left + rect.width / 2;

    setSelectionMenu({ text: selected, top, left });
  }, [draft]);

  async function handleRunSelectionSoulCheck() {
    if (!selectionMenu) return;
    await onSelectionSoulCheck(selectionMenu.text);
    setSelectionMenu(null);
  }

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
            {story.synopsis && (
              <p className="truncate text-xs text-stone-500">{story.synopsis}</p>
            )}
          </div>
          <SaveStatusIndicator status={saveStatus} />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[200px] flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-stone-600">
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
              onChange={(event) => onSliderChange(Number(event.target.value))}
              className="w-full accent-amber-700"
            />
          </div>
          <input
            type="text"
            value={beat}
            onChange={(event) => onBeatChange(event.target.value)}
            placeholder="Scene beat (optional)"
            className="min-w-[220px] flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden p-5">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => {
            onDraftChange(event.target.value);
            onClearHover();
            setSelectionMenu(null);
          }}
          onMouseUp={handleSelection}
          onKeyUp={handleSelection}
          className="min-h-[240px] flex-1 resize-none rounded-xl border border-stone-200 bg-white px-5 py-4 font-serif text-lg leading-relaxed text-stone-800 shadow-sm outline-none focus:border-amber-400"
          placeholder="Write your scene. Highlight a passage to run Soul Check…"
        />

        {!focusMode && (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-4 py-3 font-serif text-base leading-relaxed text-stone-800">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Smart Codex preview
            </p>
            {segments.map((segment, index) =>
              segment.character ? (
                <button
                  key={`${segment.text}-${index}`}
                  type="button"
                  onClick={(event) => onCharacterClick(segment.character!, event)}
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

      {selectionMenu && (
        <SelectionSoulCheckMenu
          top={selectionMenu.top}
          left={selectionMenu.left}
          loading={selectionLoading}
          onRunSoulCheck={() => void handleRunSelectionSoulCheck()}
          onDismiss={() => setSelectionMenu(null)}
        />
      )}

      {activeCharacter && anchorRect && (
        <CharacterHoverCard character={activeCharacter} anchorRect={anchorRect} />
      )}
    </section>
  );
}
