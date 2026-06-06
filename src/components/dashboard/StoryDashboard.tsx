"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Character, Story } from "@/lib/types";
import { useStoryNotes } from "@/hooks/useStoryNotes";
import { NavigatorPanel } from "./NavigatorPanel";
import { WritingCanvas } from "./WritingCanvas";
import { AiHubPanel, type AiResult } from "./AiHubPanel";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const starterDraft =
  "Julian stood in the doorway, staring at the empty safe. Rain tapped the glass behind him. He should have called someone first, but that was never his way.";

interface StoryDashboardProps {
  story: Story;
  initialCharacters: Character[];
}

export function StoryDashboard({
  story,
  initialCharacters,
}: StoryDashboardProps) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [navigatorCollapsed, setNavigatorCollapsed] = useState(false);
  const [draft, setDraft] = useState(starterDraft);
  const [sliderValue, setSliderValue] = useState(50);
  const [beat, setBeat] = useState("");
  const [aiTab, setAiTab] = useState<"soul-check" | "ghostwrite">("soul-check");
  const [aiLoading, setAiLoading] = useState<"soul-check" | "ghostwrite" | null>(
    null,
  );
  const [aiError, setAiError] = useState<string | null>(null);
  const [soulCheckResult, setSoulCheckResult] = useState<AiResult | null>(null);
  const [ghostwriteResult, setGhostwriteResult] = useState<AiResult | null>(null);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const { notes, updateOutline, updateSettingNotes } = useStoryNotes(story.id);

  const linkedNames = useMemo(
    () =>
      characters
        .filter((character) =>
          new RegExp(`\\b${escapeRegex(character.name)}\\b`, "i").test(draft),
        )
        .map((character) => character.name),
    [characters, draft],
  );

  async function runAi(mode: "ghostwrite" | "soul-check") {
    setAiLoading(mode);
    setAiError(null);
    setAiTab(mode);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
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

      const result: AiResult = {
        result: data.result,
        charactersUsed: data.charactersUsed,
        sliderValue: data.sliderValue,
        timestamp: Date.now(),
      };

      if (mode === "soul-check") {
        setSoulCheckResult(result);
      } else {
        setGhostwriteResult(result);
        if (sliderValue > 50) {
          setDraft((current) =>
            current.trimEnd().endsWith("\n")
              ? `${current}${data.result}`
              : `${current}\n\n${data.result}`,
          );
        }
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setAiLoading(null);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-57px)] flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white/80 px-4 py-2 text-xs text-stone-500">
        <Link href="/dashboard" className="hover:text-stone-800">
          ← Stories
        </Link>
        <span>Soul Writer · Unified Dashboard</span>
      </div>

      <div className="flex min-h-0 flex-1">
        <NavigatorPanel
          collapsed={navigatorCollapsed}
          onToggleCollapse={() => setNavigatorCollapsed((value) => !value)}
          storyId={story.id}
          characters={characters}
          onCharactersChange={setCharacters}
          notes={notes}
          onOutlineChange={updateOutline}
          onSettingNotesChange={updateSettingNotes}
          onSelectBeat={setBeat}
        />

        <WritingCanvas
          story={story}
          draft={draft}
          onDraftChange={setDraft}
          sliderValue={sliderValue}
          onSliderChange={setSliderValue}
          beat={beat}
          onBeatChange={setBeat}
          characters={characters}
          activeCharacter={activeCharacter}
          anchorRect={anchorRect}
          onCharacterClick={(character, event) => {
            setActiveCharacter(character);
            setAnchorRect(event.currentTarget.getBoundingClientRect());
          }}
          onClearHover={() => {
            setActiveCharacter(null);
            setAnchorRect(null);
          }}
        />

        <AiHubPanel
          activeTab={aiTab}
          onTabChange={setAiTab}
          soulCheckResult={soulCheckResult}
          ghostwriteResult={ghostwriteResult}
          linkedNames={linkedNames}
          loading={aiLoading}
          error={aiError}
          charactersCount={characters.length}
          onRunSoulCheck={() => runAi("soul-check")}
          onRunGhostwrite={() => runAi("ghostwrite")}
        />
      </div>
    </div>
  );
}
