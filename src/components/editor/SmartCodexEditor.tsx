"use client";

import { useMemo, useState } from "react";
import type { Character } from "@/lib/types";
import { splitTextByCharacters } from "@/lib/character-highlight";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
import { CharacterHoverCard } from "./CharacterHoverCard";

interface SmartCodexEditorProps {
  characters: Character[];
}

const starterText =
  "Julian stood in the doorway, staring at the empty safe. Rain tapped the glass behind him. He should have called someone first, but that was never his way.";

export function SmartCodexEditor({ characters }: SmartCodexEditorProps) {
  const [draft, setDraft] = useState(starterText);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(
    null,
  );
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-stone-900">Editor</h2>
            <p className="mt-1 text-sm text-stone-600">
              Character names from your bible are underlined. Click to open the Smart Codex card.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Context linked
          </span>
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
            Detected in draft
          </h3>
          {linkedNames.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">
              Type a character name to pull in their bible context.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {linkedNames.map((name) => (
                <li
                  key={name}
                  className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                >
                  {name} linked
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-900 p-5 text-stone-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            Coming in Step 2 & 3
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            Ghostwriter Slider and Soul Checker will read this same character data — no copy-paste required.
          </p>
        </div>
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
