"use client";

import { useState } from "react";
import type { Character, Story } from "@/lib/types";
import { CharacterBible } from "@/components/characters/CharacterBible";
import { SmartCodexEditor } from "@/components/editor/SmartCodexEditor";

type Tab = "bible" | "editor";

interface StoryWorkspaceProps {
  story: Story;
  initialCharacters: Character[];
}

export function StoryWorkspace({ story, initialCharacters }: StoryWorkspaceProps) {
  const [tab, setTab] = useState<Tab>("bible");
  const [characters, setCharacters] = useState(initialCharacters);

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          Story Bible Engine
        </p>
        <h1 className="mt-2 font-serif text-4xl text-stone-900">{story.title}</h1>
        {story.synopsis && (
          <p className="mt-2 max-w-2xl text-stone-600">{story.synopsis}</p>
        )}
      </div>

      <div className="mb-8 inline-flex rounded-full border border-stone-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setTab("bible")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition ${
            tab === "bible"
              ? "bg-stone-900 text-white"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Character Bible
        </button>
        <button
          type="button"
          onClick={() => setTab("editor")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition ${
            tab === "editor"
              ? "bg-stone-900 text-white"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Smart Codex Editor
        </button>
      </div>

      {tab === "bible" ? (
        <CharacterBible
          storyId={story.id}
          characters={characters}
          onCharactersChange={setCharacters}
        />
      ) : (
        <SmartCodexEditor storyId={story.id} characters={characters} />
      )}
    </div>
  );
}
