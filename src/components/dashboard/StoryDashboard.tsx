"use client";

import Link from "next/link";
import type { Character, Story, StoryWorkspace } from "@/lib/types";
import {
  StoryEngineProvider,
  useStoryEngine,
} from "@/context/StoryEngineContext";
import { NavigatorPanel } from "./NavigatorPanel";
import { WritingCanvas } from "./WritingCanvas";
import { AiHubPanel } from "./AiHubPanel";

interface StoryDashboardProps {
  story: Story;
  initialCharacters: Character[];
  initialWorkspace: StoryWorkspace | null;
}

function StoryDashboardShell() {
  const engine = useStoryEngine();

  return (
    <div className="flex h-[calc(100dvh-57px)] flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white/80 px-4 py-2 text-xs text-stone-500">
        <Link href="/dashboard" className="hover:text-stone-800">
          ← Stories
        </Link>
        <span>
          Soul Writer
          {engine.activeChapter && (
            <span className="ml-2 text-amber-800">
              · {engine.activeChapter.act}
            </span>
          )}
          {engine.focusMode && (
            <span className="ml-2 text-amber-700">· Focus mode</span>
          )}
        </span>
      </div>

      {engine.renamePrompt && (
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
          <p>
            Update all {engine.renamePrompt.mentionCount} mention
            {engine.renamePrompt.mentionCount === 1 ? "" : "s"} of{" "}
            <strong>{engine.renamePrompt.oldName}</strong> to{" "}
            <strong>{engine.renamePrompt.newName}</strong> in this chapter?
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={engine.dismissRenamePrompt}
              className="rounded-lg border border-amber-300 px-3 py-1 text-xs hover:bg-white"
            >
              No
            </button>
            <button
              type="button"
              onClick={engine.confirmRenameInDraft}
              className="rounded-lg bg-amber-700 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800"
            >
              Yes
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <NavigatorPanel />
        <WritingCanvas />
        <AiHubPanel />
      </div>
    </div>
  );
}

export function StoryDashboard(props: StoryDashboardProps) {
  return (
    <StoryEngineProvider {...props}>
      <StoryDashboardShell />
    </StoryEngineProvider>
  );
}
