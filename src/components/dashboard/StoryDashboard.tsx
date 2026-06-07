"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { Character, Story, StoryWorkspace } from "@/lib/types";
import {
  StoryEngineProvider,
  useStoryEngine,
} from "@/context/StoryEngineContext";
import { NavigatorPanel } from "./NavigatorPanel";
import { WritingCanvas } from "./WritingCanvas";
import { AiHubPanel } from "./AiHubPanel";
import { RenameConfirmModal } from "./RenameConfirmModal";
import { SmartCodexDrawer } from "./SmartCodexDrawer";

interface StoryDashboardProps {
  story: Story;
  initialCharacters: Character[];
  initialWorkspace: StoryWorkspace | null;
}

function StoryDashboardShell() {
  const engine = useStoryEngine();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        engine.setCodexOpen(!engine.codexOpen);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [engine]);

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
        <RenameConfirmModal
          oldName={engine.renamePrompt.oldName}
          newName={engine.renamePrompt.newName}
          mentionCount={engine.renamePrompt.mentionCount}
          onConfirm={engine.confirmRenameInDraft}
          onDismiss={engine.dismissRenamePrompt}
        />
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden transition-all duration-300 ease-in-out">
        <NavigatorPanel />
        <WritingCanvas />
        <AiHubPanel />
      </div>

      <SmartCodexDrawer />
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
