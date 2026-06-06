"use client";

import type { Character } from "@/lib/types";

interface CharacterHoverCardProps {
  character: Character;
  anchorRect: DOMRect;
}

export function CharacterHoverCard({
  character,
  anchorRect,
}: CharacterHoverCardProps) {
  const top = anchorRect.bottom + window.scrollY + 8;
  const left = Math.min(
    anchorRect.left + window.scrollX,
    window.innerWidth - 320,
  );

  return (
    <div
      className="pointer-events-none fixed z-50 w-72 rounded-2xl border border-amber-200 bg-white p-4 shadow-xl shadow-amber-900/10"
      style={{ top, left }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Smart Codex
      </p>
      <h4 className="mt-1 font-serif text-lg text-stone-900">{character.name}</h4>
      <p className="text-xs text-stone-500">
        {character.role}
        {character.age != null ? ` · Age ${character.age}` : ""}
      </p>

      <dl className="mt-3 space-y-2 text-sm">
        {character.primary_motivation && (
          <div>
            <dt className="font-medium text-stone-500">Motivation</dt>
            <dd className="text-stone-800">{character.primary_motivation}</dd>
          </div>
        )}
        {character.core_flaw && (
          <div>
            <dt className="font-medium text-stone-500">Flaw</dt>
            <dd className="text-stone-800">{character.core_flaw}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
