"use client";

import type { Character } from "@/lib/types";

interface CharacterCardProps {
  character: Character;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
}

const roleColors: Record<Character["role"], string> = {
  Protagonist: "bg-emerald-100 text-emerald-800",
  Antagonist: "bg-rose-100 text-rose-800",
  Supporting: "bg-sky-100 text-sky-800",
};

export function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl text-stone-900">{character.name}</h3>
          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${roleColors[character.role]}`}
          >
            {character.role}
          </span>
        </div>
        {character.age != null && (
          <span className="text-sm text-stone-500">Age {character.age}</span>
        )}
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        {character.primary_motivation && (
          <div>
            <dt className="font-medium text-stone-500">Motivation</dt>
            <dd className="mt-1 text-stone-800">{character.primary_motivation}</dd>
          </div>
        )}
        {character.core_flaw && (
          <div>
            <dt className="font-medium text-stone-500">Core flaw</dt>
            <dd className="mt-1 text-stone-800">{character.core_flaw}</dd>
          </div>
        )}
        {character.physical_appearance && (
          <div>
            <dt className="font-medium text-stone-500">Appearance</dt>
            <dd className="mt-1 text-stone-800">{character.physical_appearance}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(character)}
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:border-amber-300"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(character)}
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-red-600 hover:border-red-200"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
