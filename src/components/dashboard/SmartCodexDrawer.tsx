"use client";

import { useState } from "react";
import { Loader2, Shuffle, Sparkles } from "lucide-react";
import type { Character } from "@/lib/types";
import { useStoryEngine } from "@/context/StoryEngineContext";
import { CharacterForm } from "@/components/characters/CharacterForm";
import { BulkCharacterImport } from "@/components/characters/BulkCharacterImport";
import { Sheet, SheetHeader } from "@/components/ui/sheet";

const roleColors: Record<Character["role"], string> = {
  Protagonist: "bg-emerald-100 text-emerald-800",
  Antagonist: "bg-rose-100 text-rose-800",
  Supporting: "bg-sky-100 text-sky-800",
};

export function SmartCodexDrawer() {
  const engine = useStoryEngine();
  const [deckIndex, setDeckIndex] = useState(0);
  const [editing, setEditing] = useState<Character | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"characters" | "lore">("characters");

  const deck = engine.characters;
  const activeCard = deck.length ? deck[deckIndex % deck.length] : null;

  function shuffleDeck() {
    if (deck.length < 2) return;
    setDeckIndex((prev) => (prev + 1 + Math.floor(Math.random() * deck.length)) % deck.length);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => engine.setCodexOpen(true)}
        title="Open Smart Codex (Shift+C)"
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full border border-amber-200 bg-white/95 px-4 py-2.5 text-sm font-medium text-amber-900 shadow-lg shadow-amber-900/10 backdrop-blur-sm transition hover:border-amber-300 hover:bg-amber-50"
      >
        🎴 Open Smart Codex
      </button>

      <Sheet open={engine.codexOpen} onOpenChange={engine.setCodexOpen} side="left">
        <SheetHeader
          title="Smart Codex"
          description="Browse your character deck, lore, and voice alignment tools."
          onClose={() => engine.setCodexOpen(false)}
        />

        <div className="flex border-b border-stone-100 px-3 py-2">
          {(["characters", "lore"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium capitalize transition ${
                tab === key
                  ? "bg-stone-900 text-white"
                  : "text-stone-500 hover:bg-stone-50"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "characters" && (
            <div className="space-y-4">
              {activeCard && (
                <article className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-stone-50 p-5 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    Card {deckIndex + 1} of {deck.length}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl text-stone-900">
                    {activeCard.name}
                  </h3>
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[activeCard.role]}`}
                  >
                    {activeCard.role}
                  </span>
                  {activeCard.core_flaw && (
                    <p className="mt-3 text-sm text-stone-700">
                      <span className="font-medium text-stone-500">Flaw:</span>{" "}
                      {activeCard.core_flaw}
                    </p>
                  )}
                  {activeCard.primary_motivation && (
                    <p className="mt-2 text-sm text-stone-700">
                      <span className="font-medium text-stone-500">Motivation:</span>{" "}
                      {activeCard.primary_motivation}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(activeCard);
                      setShowForm(false);
                    }}
                    className="mt-4 text-xs font-medium text-amber-800 hover:underline"
                  >
                    Edit this card
                  </button>
                  <button
                    type="button"
                    onClick={() => engine.requestCharacterDelete(activeCard)}
                    className="mt-2 block text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Delete character
                  </button>
                </article>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={shuffleDeck}
                  disabled={deck.length < 2}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Shuffle deck
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(true);
                    setEditing(null);
                  }}
                  className="rounded-xl bg-amber-700 px-3 py-2 text-xs font-medium text-white hover:bg-amber-800"
                >
                  + Add character
                </button>
              </div>

              {(showForm || editing) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                  <CharacterForm
                    storyId={engine.story.id}
                    character={editing ?? undefined}
                    onSaved={(character, previous, options) => {
                      engine.handleCharacterSaved(
                        character,
                        previous,
                        options,
                      );
                      setEditing(null);
                      setShowForm(false);
                    }}
                    onCancel={() => {
                      setShowForm(false);
                      setEditing(null);
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {deck.map((character, index) => (
                  <div
                    key={character.id}
                    className={`rounded-xl border p-3 transition ${
                      index === deckIndex % Math.max(deck.length, 1)
                        ? "border-amber-300 bg-amber-50/80"
                        : "border-stone-200 bg-white hover:border-amber-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setDeckIndex(index)}
                      className="w-full text-left"
                    >
                      <p className="font-serif text-sm text-stone-900">
                        {character.name}
                      </p>
                      <p className="text-[10px] text-stone-500">{character.role}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => engine.requestCharacterDelete(character)}
                      className="mt-2 text-[10px] text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              <BulkCharacterImport
                storyId={engine.story.id}
                onImported={async () => {
                  const { createClient } = await import("@/lib/supabase/client");
                  const supabase = createClient();
                  const { data } = await supabase
                    .from("characters")
                    .select("*")
                    .eq("story_id", engine.story.id)
                    .order("name");
                  if (data) engine.setCharacters(data);
                }}
              />
            </div>
          )}

          {tab === "lore" && (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-stone-600">
                  Scope tone check to character
                </span>
                <select
                  value={engine.toneAlignmentCharacterId ?? ""}
                  onChange={(event) =>
                    engine.setToneAlignmentCharacterId(
                      event.target.value || null,
                    )
                  }
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                >
                  <option value="">All characters in chapter</option>
                  {engine.characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
              </label>

              <textarea
                value={engine.settingNotes}
                onChange={(event) => engine.setSettingNotes(event.target.value)}
                rows={12}
                placeholder="World tone, locations, historical context…"
                className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-relaxed text-stone-800 outline-none focus:border-amber-400"
              />

              <button
                type="button"
                disabled={engine.toneAlignmentLoading}
                onClick={() => void engine.runToneAlignmentCheck()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
              >
                {engine.toneAlignmentLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying tone alignment…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Verify Chapter Tone Alignment
                  </>
                )}
              </button>

              {engine.toneAlignmentReport && (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    Alignment report
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-stone-700">
                    {engine.toneAlignmentReport}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
