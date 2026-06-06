"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Character } from "@/lib/types";
import type { OutlineBeat, StoryNotes } from "@/lib/story-notes";
import { CharacterForm } from "@/components/characters/CharacterForm";

type NavigatorSection = "outline" | "characters" | "settings";

interface NavigatorPanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  storyId: string;
  characters: Character[];
  onCharactersChange: (characters: Character[]) => void;
  notes: StoryNotes;
  onOutlineChange: (outline: OutlineBeat[]) => void;
  onSettingNotesChange: (value: string) => void;
  onSelectBeat: (beat: string) => void;
}

const roleColors: Record<Character["role"], string> = {
  Protagonist: "bg-emerald-100 text-emerald-800",
  Antagonist: "bg-rose-100 text-rose-800",
  Supporting: "bg-sky-100 text-sky-800",
};

export function NavigatorPanel({
  collapsed,
  onToggleCollapse,
  storyId,
  characters,
  onCharactersChange,
  notes,
  onOutlineChange,
  onSettingNotesChange,
  onSelectBeat,
}: NavigatorPanelProps) {
  const [section, setSection] = useState<NavigatorSection>("outline");
  const [editing, setEditing] = useState<Character | null>(null);
  const [showCharacterForm, setShowCharacterForm] = useState(false);

  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center border-r border-stone-200 bg-white py-4 transition-all duration-300 ease-in-out">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expand Story Bible"
          className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  function handleCharacterSaved(character: Character) {
    const exists = characters.some((item) => item.id === character.id);
    const next = exists
      ? characters.map((item) => (item.id === character.id ? character : item))
      : [...characters, character];
    onCharactersChange(next.sort((a, b) => a.name.localeCompare(b.name)));
    setEditing(null);
    setShowCharacterForm(false);
  }

  async function handleDeleteCharacter(character: Character) {
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
  }

  function addOutlineBeat() {
    onOutlineChange([
      ...notes.outline,
      {
        id: crypto.randomUUID(),
        title: "New plot point",
        act: "Act 2",
      },
    ]);
  }

  function updateBeat(id: string, title: string) {
    onOutlineChange(
      notes.outline.map((beat) => (beat.id === id ? { ...beat, title } : beat)),
    );
  }

  function removeBeat(id: string) {
    onOutlineChange(notes.outline.filter((beat) => beat.id !== id));
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-stone-200 bg-white transition-all duration-300 ease-in-out xl:w-80">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">
          Story Bible
        </p>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Collapse Story Bible"
          className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex border-b border-stone-100 px-2 py-2">
        {(
          [
            ["outline", "Plot"],
            ["characters", "Characters"],
            ["settings", "Lore"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
              section === key
                ? "bg-stone-900 text-white"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {section === "outline" && (
          <div className="space-y-3">
            <p className="text-xs text-stone-500">
              Plot trajectory — click a beat to inject it into Ghostwriter.
            </p>
            {notes.outline.map((beat) => (
              <div
                key={beat.id}
                className="group rounded-xl border border-stone-200 bg-stone-50 p-3"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  {beat.act}
                </span>
                <input
                  value={beat.title}
                  onChange={(event) => updateBeat(beat.id, event.target.value)}
                  className="mt-1 w-full bg-transparent text-sm font-medium text-stone-800 outline-none"
                />
                <div className="mt-2 flex gap-2 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onSelectBeat(beat.title)}
                    className="text-xs text-amber-800 hover:underline"
                  >
                    Use as beat
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBeat(beat.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addOutlineBeat}
              className="w-full rounded-xl border border-dashed border-stone-300 py-2 text-xs text-stone-600 hover:border-amber-300"
            >
              + Add plot point
            </button>
          </div>
        )}

        {section === "characters" && (
          <div className="space-y-3">
            {(showCharacterForm || editing) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                <CharacterForm
                  storyId={storyId}
                  character={editing ?? undefined}
                  onSaved={handleCharacterSaved}
                  onCancel={() => {
                    setShowCharacterForm(false);
                    setEditing(null);
                  }}
                />
              </div>
            )}

            {!showCharacterForm && !editing && (
              <button
                type="button"
                onClick={() => setShowCharacterForm(true)}
                className="w-full rounded-xl bg-amber-700 px-3 py-2 text-xs font-medium text-white hover:bg-amber-800"
              >
                + Add character
              </button>
            )}

            {characters.map((character) => (
              <article
                key={character.id}
                className="rounded-xl border border-stone-200 p-3 transition hover:border-amber-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-base text-stone-900">
                    {character.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[character.role]}`}
                  >
                    {character.role}
                  </span>
                </div>
                {character.core_flaw && (
                  <p className="mt-2 line-clamp-2 text-xs text-stone-600">
                    <span className="font-medium text-stone-500">Flaw:</span>{" "}
                    {character.core_flaw}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(character);
                      setShowCharacterForm(false);
                    }}
                    className="text-xs text-stone-500 hover:text-stone-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCharacter(character)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}

            {characters.length === 0 && !showCharacterForm && (
              <p className="text-xs text-stone-500">
                No characters yet. Add profiles that feed the AI automatically.
              </p>
            )}
          </div>
        )}

        {section === "settings" && (
          <div>
            <p className="mb-2 text-xs text-stone-500">
              World-building, locations, tone, and lore notes.
            </p>
            <textarea
              value={notes.settingNotes}
              onChange={(event) => onSettingNotesChange(event.target.value)}
              rows={16}
              placeholder="The city never sleeps. Julian's safehouse is above a pawn shop on Mercer Street..."
              className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-relaxed text-stone-800 outline-none focus:border-amber-400"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
