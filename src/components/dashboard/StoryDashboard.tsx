"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Character, Story, StoryWorkspace } from "@/lib/types";
import type { OutlineBeat } from "@/lib/story-notes";
import { parseOutlineJson } from "@/lib/story-bible-context";
import { useDebouncedWorkspaceSave } from "@/hooks/useDebouncedWorkspaceSave";
import { NavigatorPanel } from "./NavigatorPanel";
import { WritingCanvas } from "./WritingCanvas";
import {
  AiHubPanel,
  type GhostwriteAiResult,
  type SoulCheckAiResult,
} from "./AiHubPanel";
import type { GhostwriteResult } from "@/lib/gemini/generate";
import {
  appendHtmlParagraph,
  htmlToPlainText,
  normalizeDraftContent,
} from "@/lib/draft-content";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const defaultOutline: OutlineBeat[] = [
  { id: "1", title: "Act 1: The Inciting Incident", act: "Act 1" },
  { id: "2", title: "Act 2: The Midpoint Crisis", act: "Act 2" },
  { id: "3", title: "Act 3: The Final Confrontation", act: "Act 3" },
];

interface StoryDashboardProps {
  story: Story;
  initialCharacters: Character[];
  initialWorkspace: StoryWorkspace | null;
}

export function StoryDashboard({
  story,
  initialCharacters,
  initialWorkspace,
}: StoryDashboardProps) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [navigatorCollapsed, setNavigatorCollapsed] = useState(false);
  const [aiHubCollapsed, setAiHubCollapsed] = useState(false);

  const [draft, setDraft] = useState(
    normalizeDraftContent(initialWorkspace?.draft_content ?? ""),
  );
  const [outline, setOutline] = useState<OutlineBeat[]>(
    initialWorkspace?.outline_json
      ? parseOutlineJson(initialWorkspace.outline_json)
      : defaultOutline,
  );
  const [settingNotes, setSettingNotes] = useState(
    initialWorkspace?.setting_notes ?? "",
  );
  const [sliderValue, setSliderValue] = useState(
    initialWorkspace?.slider_value ?? 50,
  );
  const [beat, setBeat] = useState(initialWorkspace?.scene_beat ?? "");

  const [aiTab, setAiTab] = useState<"soul-check" | "ghostwrite">("soul-check");
  const [aiLoading, setAiLoading] = useState<"soul-check" | "ghostwrite" | null>(
    null,
  );
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [soulCheckResult, setSoulCheckResult] = useState<SoulCheckAiResult | null>(
    null,
  );
  const [ghostwriteResult, setGhostwriteResult] =
    useState<GhostwriteAiResult | null>(null);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [activeInsightIndex, setActiveInsightIndex] = useState<number | null>(
    null,
  );

  const workspaceSnapshot = useMemo(
    () => ({
      draftContent: draft,
      outline,
      settingNotes,
      sceneBeat: beat,
      sliderValue,
    }),
    [draft, outline, settingNotes, beat, sliderValue],
  );

  const baselineKey = useMemo(
    () =>
      JSON.stringify({
        draftContent: normalizeDraftContent(
          initialWorkspace?.draft_content ?? "",
        ),
        outline: initialWorkspace?.outline_json
          ? parseOutlineJson(initialWorkspace.outline_json)
          : defaultOutline,
        settingNotes: initialWorkspace?.setting_notes ?? "",
        sceneBeat: initialWorkspace?.scene_beat ?? "",
        sliderValue: initialWorkspace?.slider_value ?? 50,
      }),
    [initialWorkspace],
  );

  const { saveStatus } = useDebouncedWorkspaceSave({
    storyId: story.id,
    snapshot: workspaceSnapshot,
    baselineKey,
  });

  const focusMode = navigatorCollapsed && aiHubCollapsed;

  const plainDraft = useMemo(() => htmlToPlainText(draft), [draft]);

  const linkedNames = useMemo(
    () =>
      characters
        .filter((character) =>
          new RegExp(`\\b${escapeRegex(character.name)}\\b`, "i").test(
            plainDraft,
          ),
        )
        .map((character) => character.name),
    [characters, plainDraft],
  );

  const soulCheckInsights = soulCheckResult?.data.insights ?? [];

  async function runSelectionSoulCheck(selectedText: string) {
    setSelectionLoading(true);
    setAiError(null);
    setAiTab("soul-check");
    setAiHubCollapsed(false);
    setActiveInsightIndex(null);

    try {
      const response = await fetch("/api/soul-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          selectedText,
          sliderValue,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Soul Check failed");
      }

      setSoulCheckResult({
        kind: "soul-check",
        data: { insights: data.insights ?? [] },
        charactersUsed: data.charactersUsed ?? [],
        sliderValue: data.sliderValue ?? sliderValue,
        timestamp: Date.now(),
      });
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Soul Check failed");
    } finally {
      setSelectionLoading(false);
    }
  }

  async function runAi(mode: "ghostwrite" | "soul-check") {
    setAiLoading(mode);
    setAiError(null);
    setAiTab(mode);
    setAiHubCollapsed(false);
    setActiveInsightIndex(null);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          mode,
          draft: plainDraft,
          sliderValue,
          beat: mode === "ghostwrite" ? beat : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "AI request failed");
      }

      if (mode === "soul-check") {
        setSoulCheckResult({
          kind: "soul-check",
          data: {
            insights: (data.result as { insights?: SoulCheckAiResult["data"]["insights"] })
              ?.insights ?? [],
          },
          charactersUsed: data.charactersUsed ?? [],
          sliderValue: data.sliderValue ?? sliderValue,
          timestamp: Date.now(),
        });
      } else {
        const ghostData = data.result as GhostwriteResult;
        setGhostwriteResult({
          kind: "ghostwrite",
          data: ghostData,
          charactersUsed: data.charactersUsed ?? [],
          sliderValue: data.sliderValue ?? sliderValue,
          timestamp: Date.now(),
        });
        if (sliderValue > 50 && ghostData.prose) {
          setDraft((current) => appendHtmlParagraph(current, ghostData.prose));
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
        <span>
          Soul Writer
          {focusMode && (
            <span className="ml-2 text-amber-700">· Focus mode</span>
          )}
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <NavigatorPanel
          collapsed={navigatorCollapsed}
          onToggleCollapse={() => setNavigatorCollapsed((value) => !value)}
          storyId={story.id}
          characters={characters}
          onCharactersChange={setCharacters}
          notes={{ outline, settingNotes }}
          onOutlineChange={setOutline}
          onSettingNotesChange={setSettingNotes}
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
          saveStatus={saveStatus}
          focusMode={focusMode}
          onSelectionSoulCheck={runSelectionSoulCheck}
          selectionLoading={selectionLoading}
          soulCheckInsights={soulCheckInsights}
          onHighlightInsight={(index) => {
            setActiveInsightIndex(index);
            setAiTab("soul-check");
            setAiHubCollapsed(false);
          }}
        />

        <AiHubPanel
          collapsed={aiHubCollapsed}
          onToggleCollapse={() => setAiHubCollapsed((value) => !value)}
          activeTab={aiTab}
          onTabChange={setAiTab}
          soulCheckResult={soulCheckResult}
          ghostwriteResult={ghostwriteResult}
          linkedNames={linkedNames}
          loading={aiLoading}
          selectionLoading={selectionLoading}
          error={aiError}
          charactersCount={characters.length}
          activeInsightIndex={activeInsightIndex}
          onRunSoulCheck={() => runAi("soul-check")}
          onRunGhostwrite={() => runAi("ghostwrite")}
        />
      </div>
    </div>
  );
}
