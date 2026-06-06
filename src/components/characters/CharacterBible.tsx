"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Character } from "@/lib/types";
import { CharacterCard } from "./CharacterCard";
import { CharacterForm } from "./CharacterForm";

interface CharacterBibleProps {
  storyId: string;
  characters: Character[];
  onCharactersChange: (characters: Character[]) => void;
}

export function CharacterBible({
  storyId,
  characters,
  onCharactersChange,
}: CharacterBibleProps) {
  const [editing, setEditing] = useState<Character | null>(null);
  const [showForm, setShowForm] = useState(characters.length === 0);

  function handleSaved(character: Character) {
    const exists = characters.some((item) => item.id === character.id);
    const next = exists
      ? characters.map((item) => (item.id === character.id ? character : item))
      : [...characters, character];

    onCharactersChange(next.sort((a, b) => a.name.localeCompare(b.name)));
    setEditing(null);
    setShowForm(false);
  }

  async function handleDelete(character: Character) {
    if (!confirm(`Delete ${character.name}?`)) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("characters")
      .delete()
      .eq("id", character.id);

    if (error) {
      alert(error.message);
      return;
    }

    onCharactersChange(characters.filter((item) => item.id !== character.id));
    if (editing?.id === character.id) {
      setEditing(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-stone-900">Character Bible</h2>
          <p className="mt-1 text-sm text-stone-600">
            Structured profiles that auto-inject into the editor and Soul Checker.
          </p>
        </div>
        {!showForm && !editing && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Add character
          </button>
        )}
      </div>

      {(showForm || editing) && (
        <section className="rounded-2xl border border-amber-200/70 bg-amber-50/30 p-6">
          <h3 className="mb-4 font-medium text-stone-800">
            {editing ? `Edit ${editing.name}` : "New character profile"}
          </h3>
          <CharacterForm
            storyId={storyId}
            character={editing ?? undefined}
            onSaved={handleSaved}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </section>
      )}

      {characters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center">
          <p className="font-serif text-lg text-stone-700">No characters yet</p>
          <p className="mt-2 text-sm text-stone-500">
            Add Julian, his motives, and his flaws — they will underline in the editor automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={(item) => {
                setEditing(item);
                setShowForm(false);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
