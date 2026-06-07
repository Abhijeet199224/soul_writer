"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Character } from "@/lib/types";
import { useStoryEngine } from "@/context/StoryEngineContext";
import { CharacterForm } from "@/components/characters/CharacterForm";

type NavigatorSection = "chapters" | "characters" | "settings";

const roleColors: Record<Character["role"], string> = {
  Protagonist: "bg-emerald-100 text-emerald-800",
  Antagonist: "bg-rose-100 text-rose-800",
  Supporting: "bg-sky-100 text-sky-800",
};

export function NavigatorPanel() {
  const {
    story,
    chapters,
    activeChapterId,
    switchChapter,
    selectPlotBeat,
    chaptersLoaded,
    addChapter,
    addingChapter,
    characters,
    handleCharacterSaved,
    setCharacters,
    settingNotes,
    setSettingNotes,
    updateChapterMeta,
    navigatorCollapsed,
    setNavigatorCollapsed,
  } = useStoryEngine();

  const [section, setSection] = useState<NavigatorSection>("chapters");
  const [editing, setEditing] = useState<Character | null>(null);
  const [showCharacterForm, setShowCharacterForm] = useState(false);

  if (navigatorCollapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center overflow-hidden border-r border-stone-200 bg-white py-4 transition-all duration-300 ease-in-out">
        <button
          type="button"
          onClick={() => setNavigatorCollapsed(false)}
          title="Expand Story Bible"
          className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </aside>
    );
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
    setCharacters(characters.filter((item) => item.id !== character.id));
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-stone-200 bg-white transition-all duration-300 ease-in-out xl:w-80">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">
          Story Bible
        </p>
        <button
          type="button"
          onClick={() => setNavigatorCollapsed(true)}
          title="Collapse Story Bible"
          className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex border-b border-stone-100 px-2 py-2">
        {(
          [
            ["chapters", "Acts"],
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
        {section === "chapters" && (
          <div className="space-y-3">
            <p className="text-xs text-stone-500">
              Each Act is a chapter workspace. Select one to edit its manuscript.
            </p>
            {!chaptersLoaded ? (
              <div className="space-y-3">
                {[1, 2, 3].map((key) => (
                  <div
                    key={key}
                    className="animate-pulse rounded-xl border border-stone-200 bg-stone-50 p-3"
                  >
                    <div className="h-2 w-16 rounded bg-stone-200" />
                    <div className="mt-2 h-4 w-3/4 rounded bg-stone-100" />
                    <div className="mt-2 h-3 w-full rounded bg-stone-100" />
                  </div>
                ))}
              </div>
            ) : (
              chapters.map((chapter) => {
              const isActive = chapter.id === activeChapterId;
              return (
                <div
                  key={chapter.id}
                  className={`w-full rounded-xl border p-3 transition ${
                    isActive
                      ? "border-amber-400 bg-amber-50/70 ring-1 ring-amber-300/60"
                      : "border-stone-200 bg-stone-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => switchChapter(chapter.id)}
                    title={`Open ${chapter.act} workspace — loads manuscript without affecting undo history`}
                    className="w-full text-left"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      {chapter.act}
                    </span>
                    <p className="mt-1 font-serif text-sm font-medium text-stone-900">
                      {chapter.title}
                    </p>
                    {chapter.plot_objectives && (
                      <p className="mt-1 line-clamp-2 text-xs text-stone-500">
                        {chapter.plot_objectives}
                      </p>
                    )}
                  </button>

                  {chapter.plot_beats.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-stone-200/80 pt-2">
                      <li className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                        Plot trajectory beats
                      </li>
                      {chapter.plot_beats.map((plotBeat) => {
                        const beatActive =
                          isActive && chapter.scene_beat === plotBeat.title;
                        return (
                          <li key={plotBeat.id}>
                            <button
                              type="button"
                              onClick={() =>
                                selectPlotBeat(chapter.id, plotBeat.title)
                              }
                              title={`Focus this scene beat in the canvas header and AI context — ${plotBeat.title}`}
                              className={`w-full rounded-lg px-2 py-1.5 text-left text-[11px] transition ${
                                beatActive
                                  ? "bg-amber-100 font-medium text-amber-900"
                                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                              }`}
                            >
                              • {plotBeat.title}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })
            )}

            {chaptersLoaded && activeChapterId && (
              <div className="rounded-xl border border-dashed border-stone-200 p-3">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Chapter objectives
                </label>
                <textarea
                  value={
                    chapters.find((c) => c.id === activeChapterId)
                      ?.plot_objectives ?? ""
                  }
                  onChange={(e) =>
                    updateChapterMeta({ plot_objectives: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-amber-400"
                />
              </div>
            )}
          </div>
        )}

        {section === "chapters" && chaptersLoaded && (
          <div className="mt-3 border-t border-stone-100 pt-3">
            <button
              type="button"
              onClick={() => void addChapter()}
              disabled={addingChapter}
              title="Create a new Act/Chapter workspace with an empty canvas"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-3 py-3 text-sm font-medium text-amber-900 transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-60"
            >
              {addingChapter ? "Creating chapter…" : "+ Add Chapter / Act"}
            </button>
          </div>
        )}

        {section === "characters" && (
          <div className="space-y-3">
            {(showCharacterForm || editing) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                <CharacterForm
                  storyId={story.id}
                  character={editing ?? undefined}
                  onSaved={(character) => {
                    handleCharacterSaved(character, editing?.name);
                    setEditing(null);
                    setShowCharacterForm(false);
                  }}
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
          </div>
        )}

        {section === "settings" && (
          <div>
            <p className="mb-2 text-xs text-stone-500">
              World-building, locations, tone, and lore notes.
            </p>
            <textarea
              value={settingNotes}
              onChange={(event) => setSettingNotes(event.target.value)}
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
