"use client";

import { useMemo, useState } from "react";
import type { Character } from "@/lib/types";
import { splitTextByCharacters } from "@/lib/character-highlight";
import { CharacterHoverCard } from "./CharacterHoverCard";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface SmartCodexEditorProps {
  storyId: string;
  characters: Character[];
}

interface AiResponse {
  result: string;
  charactersUsed: string[];
  mode: "ghostwrite" | "soul-check";
  sliderValue: number;
}

const starterText =
  "Julian stood in the doorway, staring at the empty safe. Rain tapped the glass behind him. He should have called someone first, but that was never his way.";

export function SmartCodexEditor({ storyId, characters }: SmartCodexEditorProps) {
  const [draft, setDraft] = useState(starterText);
  const [sliderValue, setSliderValue] = useState(50);
  const [beat, setBeat] = useState("");
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [aiLoading, setAiLoading] = useState<"ghostwrite" | "soul-check" | null>(
    null,
  );
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<AiResponse | null>(null);

  const segments = useMemo(
    () => splitTextByCharacters(draft, characters),
    [draft, characters],
  );

  const linkedNames = useMemo(
    () =>
      characters
        .filter((character) =>
          new RegExp(`\\b${escapeRegex(character.name)}\\b`, "i").test(draft),
        )
        .map((character) => character.name),
    [characters, draft],
  );

  function handleCharacterClick(
    character: Character,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    setActiveCharacter(character);
    setAnchorRect(event.currentTarget.getBoundingClientRect());
  }

  async function runAi(mode: "ghostwrite" | "soul-check") {
    setAiLoading(mode);
    setAiError(null);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId,
          mode,
          draft,
          sliderValue,
          beat: mode === "ghostwrite" ? beat : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "AI request failed");
      }

      setAiResponse(data as AiResponse);

      if (mode === "ghostwrite" && sliderValue > 50) {
        setDraft((current) =>
          current.trimEnd().endsWith("\n")
            ? `${current}${data.result}`
            : `${current}\n\n${data.result}`,
        );
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setAiLoading(null);
    }
  }

  const sliderLabel =
    sliderValue <= 25
      ? "Inspiration"
      : sliderValue <= 50
        ? "Brainstorm"
        : sliderValue <= 75
          ? "Co-Drafting"
          : "Ghostwriter";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-stone-900">Editor</h2>
            <p className="mt-1 text-sm text-stone-600">
              Character bible context auto-injects into Ghostwriter and Soul Checker.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Context linked
          </span>
        </div>

        <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-stone-700">
              Collaboration Slider
            </span>
            <span className="text-amber-800">
              {sliderValue}% · {sliderLabel}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={sliderValue}
            onChange={(event) => setSliderValue(Number(event.target.value))}
            className="w-full accent-amber-700"
          />
          <input
            type="text"
            value={beat}
            onChange={(event) => setBeat(event.target.value)}
            placeholder="Optional beat: Julian gets caught in the rain..."
            className="mt-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </div>

        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setActiveCharacter(null);
            setAnchorRect(null);
          }}
          rows={14}
          className="mb-4 w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 font-serif text-lg leading-relaxed text-stone-800 outline-none focus:border-amber-400"
          placeholder="Start writing. Mention a character by name..."
        />

        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 px-4 py-4 font-serif text-lg leading-relaxed text-stone-800">
          {segments.map((segment, index) =>
            segment.character ? (
              <button
                key={`${segment.text}-${index}`}
                type="button"
                onClick={(event) =>
                  handleCharacterClick(segment.character!, event)
                }
                className="border-b-2 border-amber-500/80 bg-amber-100/50 px-0.5 font-medium text-amber-900 underline decoration-amber-600 decoration-2 underline-offset-4 transition hover:bg-amber-200/60"
              >
                {segment.text}
              </button>
            ) : (
              <span key={`${segment.text}-${index}`}>{segment.text}</span>
            ),
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            AI Panel
          </h3>
          <p className="mt-2 text-xs text-stone-500">
            Pulls characters from your database — no copy-paste into prompts.
          </p>

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => runAi("ghostwrite")}
              disabled={aiLoading !== null || characters.length === 0}
              className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-60"
            >
              {aiLoading === "ghostwrite" ? "Ghostwriting..." : "Ghostwrite"}
            </button>
            <button
              type="button"
              onClick={() => runAi("soul-check")}
              disabled={aiLoading !== null || characters.length === 0}
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
            >
              {aiLoading === "soul-check" ? "Checking..." : "Soul Check"}
            </button>
          </div>

          {characters.length === 0 && (
            <p className="mt-3 text-xs text-red-600">
              Add characters in the Character Bible first.
            </p>
          )}
          {aiError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {aiError}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Context injected
          </h3>
          {linkedNames.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">
              All bible characters will be sent if none are named in the draft.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {linkedNames.map((name) => (
                <li
                  key={name}
                  className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {aiResponse && (
          <div className="rounded-2xl border border-stone-200 bg-stone-900 p-5 text-stone-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
              {aiResponse.mode === "soul-check" ? "Soul Checker" : "Ghostwriter"}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Used: {aiResponse.charactersUsed.join(", ")}
            </p>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-200">
              {aiResponse.result}
            </div>
          </div>
        )}
      </aside>

      {activeCharacter && anchorRect && (
        <CharacterHoverCard
          character={activeCharacter}
          anchorRect={anchorRect}
        />
      )}
    </div>
  );
}
