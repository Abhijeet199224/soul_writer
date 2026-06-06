"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Character, Story, StoryChapter, StoryWorkspace } from "@/lib/types";
import type { GhostwriteResult, SoulCheckInsight } from "@/lib/gemini/generate";
import { getGhostwriteTier } from "@/lib/chapters";
import {
  htmlToPlainText,
  insertPlainTextAtEnd,
  normalizeDraftContent,
  replaceTargetTextInHtml,
} from "@/lib/draft-content";
import { useStoryBibleIndex } from "@/hooks/useStoryBibleIndex";
import { useDebouncedChapterSave } from "@/hooks/useDebouncedWorkspaceSave";
import {
  countNameMentions,
  draftContainsName,
  replaceNameInHtmlDraft,
} from "@/lib/character-name-sync";
import type {
  GhostwriteAiResult,
  SoulCheckAiResult,
} from "@/components/dashboard/AiHubPanel";
import type { TipTapEditorHandle } from "@/components/editor/TipTapEditor";

interface StoryEngineProviderProps {
  story: Story;
  initialCharacters: Character[];
  initialWorkspace: StoryWorkspace | null;
  children: ReactNode;
}

interface CharacterRenamePrompt {
  oldName: string;
  newName: string;
  mentionCount: number;
}

interface StoryEngineContextValue {
  story: Story;
  characters: Character[];
  chapters: StoryChapter[];
  activeChapter: StoryChapter | null;
  activeChapterId: string | null;
  settingNotes: string;
  sliderValue: number;
  draft: string;
  beat: string;
  saveStatus: ReturnType<typeof useDebouncedChapterSave>["saveStatus"];
  navigatorCollapsed: boolean;
  aiHubCollapsed: boolean;
  aiTab: "soul-check" | "ghostwrite";
  aiLoading: "soul-check" | "ghostwrite" | null;
  selectionLoading: boolean;
  aiError: string | null;
  soulCheckResult: SoulCheckAiResult | null;
  ghostwriteResult: GhostwriteAiResult | null;
  activeInsightIndex: number | null;
  soulCheckInsights: SoulCheckInsight[];
  linkedNames: string[];
  focusMode: boolean;
  renamePrompt: CharacterRenamePrompt | null;
  registerEditor: (handle: TipTapEditorHandle | null) => void;
  setNavigatorCollapsed: (v: boolean | ((p: boolean) => boolean)) => void;
  setAiHubCollapsed: (v: boolean | ((p: boolean) => boolean)) => void;
  setAiTab: (tab: "soul-check" | "ghostwrite") => void;
  switchChapter: (chapterId: string) => void;
  updateDraft: (html: string) => void;
  setBeat: (beat: string) => void;
  setSliderValue: (value: number) => void;
  setSettingNotes: (notes: string) => void;
  updateChapterMeta: (updates: Partial<StoryChapter>) => void;
  setCharacters: (characters: Character[]) => void;
  handleCharacterSaved: (character: Character, previousName?: string) => void;
  confirmRenameInDraft: () => void;
  dismissRenamePrompt: () => void;
  runSelectionSoulCheck: (selectedText: string) => Promise<void>;
  runSoulCheck: () => Promise<void>;
  runGhostwrite: () => Promise<void>;
  applyToneRewrite: (targetText: string, replacement: string) => void;
  setActiveInsightIndex: (index: number | null) => void;
  onHighlightInsight: (index: number) => void;
}

const StoryEngineContext = createContext<StoryEngineContextValue | null>(null);

export function useStoryEngine() {
  const ctx = useContext(StoryEngineContext);
  if (!ctx) {
    throw new Error("useStoryEngine must be used within StoryEngineProvider");
  }
  return ctx;
}

export function StoryEngineProvider({
  story,
  initialCharacters,
  initialWorkspace,
  children,
}: StoryEngineProviderProps) {
  const editorHandleRef = useRef<TipTapEditorHandle | null>(null);
  const registerEditor = useCallback((handle: TipTapEditorHandle | null) => {
    editorHandleRef.current = handle;
  }, []);

  const [characters, setCharacters] = useState(initialCharacters);
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(
    initialWorkspace?.active_chapter_id ?? null,
  );
  const [settingNotes, setSettingNotes] = useState(
    initialWorkspace?.setting_notes ?? "",
  );
  const [sliderValue, setSliderValue] = useState(
    initialWorkspace?.slider_value ?? 50,
  );
  const [chaptersLoaded, setChaptersLoaded] = useState(false);

  const [navigatorCollapsed, setNavigatorCollapsed] = useState(false);
  const [aiHubCollapsed, setAiHubCollapsed] = useState(false);
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
  const [activeInsightIndex, setActiveInsightIndex] = useState<number | null>(
    null,
  );
  const [renamePrompt, setRenamePrompt] =
    useState<CharacterRenamePrompt | null>(null);

  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === activeChapterId) ?? chapters[0] ?? null,
    [chapters, activeChapterId],
  );

  const draft = activeChapter?.draft_content ?? "";
  const beat = activeChapter?.scene_beat ?? "";

  const storyBible = useStoryBibleIndex(
    characters,
    chapters.map((c) => ({
      id: c.id,
      title: c.title,
      act: c.act,
    })),
    settingNotes,
  );

  const plainDraft = useMemo(() => htmlToPlainText(draft), [draft]);
  const linkedNames = useMemo(
    () => storyBible.getCharacterNamesInText(plainDraft),
    [storyBible, plainDraft],
  );
  const soulCheckInsights = soulCheckResult?.data.insights ?? [];
  const focusMode = navigatorCollapsed && aiHubCollapsed;

  const chapterSnapshot = useMemo(
    () => ({
      chapterId: activeChapter?.id ?? "",
      draftContent: draft,
      sceneBeat: beat,
      plotObjectives: activeChapter?.plot_objectives,
    }),
    [activeChapter?.id, activeChapter?.plot_objectives, draft, beat],
  );

  const metaSnapshot = useMemo(
    () => ({
      storyId: story.id,
      activeChapterId: activeChapterId ?? "",
      settingNotes,
      sliderValue,
    }),
    [story.id, activeChapterId, settingNotes, sliderValue],
  );

  const baselineKey = useMemo(
    () =>
      JSON.stringify({
        chapterId: initialWorkspace?.active_chapter_id ?? "",
        draft: normalizeDraftContent(initialWorkspace?.draft_content ?? ""),
        settingNotes: initialWorkspace?.setting_notes ?? "",
        sliderValue: initialWorkspace?.slider_value ?? 50,
      }),
    [initialWorkspace],
  );

  const { saveStatus } = useDebouncedChapterSave({
    chapterSnapshot,
    metaSnapshot,
    enabled: chaptersLoaded && Boolean(activeChapter?.id),
    baselineKey,
  });

  const loadChapters = useCallback(async () => {
    const response = await fetch(`/api/chapters?storyId=${story.id}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to load chapters");
    setChapters(data.chapters ?? []);
    setActiveChapterId(data.activeChapterId ?? data.chapters?.[0]?.id ?? null);
    if (data.settingNotes !== undefined) setSettingNotes(data.settingNotes);
    if (data.sliderValue !== undefined) setSliderValue(data.sliderValue);
    setChaptersLoaded(true);
  }, [story.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial chapter fetch
    void loadChapters();
  }, [loadChapters]);

  const updateChapterInState = useCallback(
    (chapterId: string, patch: Partial<StoryChapter>) => {
      setChapters((prev) =>
        prev.map((c) => (c.id === chapterId ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  const switchChapter = useCallback(
    (chapterId: string) => {
      if (chapterId === activeChapterId) return;
      setActiveChapterId(chapterId);
      setActiveInsightIndex(null);
    },
    [activeChapterId],
  );

  const updateDraft = useCallback(
    (html: string) => {
      if (!activeChapter) return;
      updateChapterInState(activeChapter.id, {
        draft_content: html,
      });
    },
    [activeChapter, updateChapterInState],
  );

  const setBeat = useCallback(
    (value: string) => {
      if (!activeChapter) return;
      updateChapterInState(activeChapter.id, { scene_beat: value });
    },
    [activeChapter, updateChapterInState],
  );

  const updateChapterMeta = useCallback(
    (updates: Partial<StoryChapter>) => {
      if (!activeChapter) return;
      updateChapterInState(activeChapter.id, updates);
    },
    [activeChapter, updateChapterInState],
  );

  const handleCharacterSaved = useCallback(
    (character: Character, previousName?: string) => {
      setCharacters((prev) => {
        const exists = prev.some((c) => c.id === character.id);
        const next = exists
          ? prev.map((c) => (c.id === character.id ? character : c))
          : [...prev, character];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });

      if (
        previousName &&
        previousName !== character.name &&
        activeChapter &&
        draftContainsName(activeChapter.draft_content, previousName)
      ) {
        setRenamePrompt({
          oldName: previousName,
          newName: character.name,
          mentionCount: countNameMentions(
            activeChapter.draft_content,
            previousName,
          ),
        });
      }
    },
    [activeChapter],
  );

  const confirmRenameInDraft = useCallback(() => {
    if (!renamePrompt || !activeChapter) return;
    const updated = replaceNameInHtmlDraft(
      activeChapter.draft_content,
      renamePrompt.oldName,
      renamePrompt.newName,
    );
    updateChapterInState(activeChapter.id, { draft_content: updated });
    setRenamePrompt(null);
  }, [renamePrompt, activeChapter, updateChapterInState]);

  const dismissRenamePrompt = useCallback(() => setRenamePrompt(null), []);

  const applyToneRewrite = useCallback(
    (targetText: string, replacement: string) => {
      if (!activeChapter) return;
      const updated = replaceTargetTextInHtml(
        activeChapter.draft_content,
        targetText,
        replacement,
      );
      updateChapterInState(activeChapter.id, { draft_content: updated });
      setActiveInsightIndex(null);
    },
    [activeChapter, updateChapterInState],
  );

  const onHighlightInsight = useCallback((index: number) => {
    setActiveInsightIndex(index);
    setAiTab("soul-check");
    setAiHubCollapsed(false);
  }, []);

  const runSelectionSoulCheck = useCallback(
    async (selectedText: string) => {
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
            chapterId: activeChapterId,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Soul Check failed");

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
    },
    [story.id, sliderValue, activeChapterId],
  );

  const runSoulCheck = useCallback(async () => {
    setAiLoading("soul-check");
    setAiError(null);
    setAiTab("soul-check");
    setAiHubCollapsed(false);
    setActiveInsightIndex(null);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          mode: "soul-check",
          draft: plainDraft,
          sliderValue,
          beat,
          chapterId: activeChapterId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Soul Check failed");

      setSoulCheckResult({
        kind: "soul-check",
        data: { insights: data.result?.insights ?? [] },
        charactersUsed: data.charactersUsed ?? [],
        sliderValue: data.sliderValue ?? sliderValue,
        timestamp: Date.now(),
      });
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Soul Check failed");
    } finally {
      setAiLoading(null);
    }
  }, [story.id, plainDraft, sliderValue, beat, activeChapterId]);

  const runGhostwrite = useCallback(async () => {
    setAiLoading("ghostwrite");
    setAiError(null);
    setAiTab("ghostwrite");
    setAiHubCollapsed(false);

    const tier = getGhostwriteTier(sliderValue);
    const cursorPrefix = editorHandleRef.current?.getCursorPrefix() ?? "";

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          mode: "ghostwrite",
          draft: plainDraft,
          sliderValue,
          beat,
          chapterId: activeChapterId,
          cursorPrefix: tier === "copilot" ? cursorPrefix : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Ghostwrite failed");

      const result = data.result as GhostwriteResult;
      setGhostwriteResult({
        kind: "ghostwrite",
        data: result,
        charactersUsed: data.charactersUsed ?? [],
        sliderValue: data.sliderValue ?? sliderValue,
        timestamp: Date.now(),
      });

      if (tier === "copilot" && result.prose) {
        editorHandleRef.current?.insertAtCursor(result.prose);
      } else if (tier === "ghostwriter" && result.prose && activeChapter) {
        updateChapterInState(activeChapter.id, {
          draft_content: insertPlainTextAtEnd(draft, result.prose),
        });
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Ghostwrite failed");
    } finally {
      setAiLoading(null);
    }
  }, [
    story.id,
    plainDraft,
    sliderValue,
    beat,
    activeChapterId,
    activeChapter,
    draft,
    updateChapterInState,
  ]);

  const value: StoryEngineContextValue = {
    story,
    characters,
    chapters,
    activeChapter,
    activeChapterId,
    settingNotes,
    sliderValue,
    draft,
    beat,
    saveStatus,
    navigatorCollapsed,
    aiHubCollapsed,
    aiTab,
    aiLoading,
    selectionLoading,
    aiError,
    soulCheckResult,
    ghostwriteResult,
    activeInsightIndex,
    soulCheckInsights,
    linkedNames,
    focusMode,
    renamePrompt,
    registerEditor,
    setNavigatorCollapsed,
    setAiHubCollapsed,
    setAiTab,
    switchChapter,
    updateDraft,
    setBeat,
    setSliderValue,
    setSettingNotes,
    updateChapterMeta,
    setCharacters,
    handleCharacterSaved,
    confirmRenameInDraft,
    dismissRenamePrompt,
    runSelectionSoulCheck,
    runSoulCheck,
    runGhostwrite,
    applyToneRewrite,
    setActiveInsightIndex,
    onHighlightInsight,
  };

  return (
    <StoryEngineContext.Provider value={value}>
      {children}
    </StoryEngineContext.Provider>
  );
}
