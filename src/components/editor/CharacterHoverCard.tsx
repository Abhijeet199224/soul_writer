"use client";

import { useEffect } from "react";
import type { Character } from "@/lib/types";

interface CharacterHoverCardProps {
  character: Character;
  anchorRect: DOMRect;
  onClose?: () => void;
}

export function CharacterHoverCard({
  character,
  anchorRect,
  onClose,
}: CharacterHoverCardProps) {
  const top = anchorRect.bottom + 8;
  const left = Math.min(anchorRect.left, window.innerWidth - 288);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="character-codex-popover fixed z-50 w-72 rounded-2xl border border-amber-200 bg-white p-4 shadow-xl shadow-amber-900/10"
      style={{ top, left }}
      onMouseLeave={() => onClose?.()}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Smart Codex
      </p>
      <h4 className="mt-1 font-serif text-lg text-stone-900">{character.name}</h4>
      <p className="text-xs text-stone-500">
        {[
          character.role,
          character.age != null ? `Age ${character.age}` : null,
          character.pronouns ?? null,
        ]
          .filter(Boolean)
          .join(" · ")}
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
