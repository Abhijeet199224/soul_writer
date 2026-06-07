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
  normalizeDraftContent,
} from "@/lib/draft-content";
import { useStoryBibleIndex } from "@/hooks/useStoryBibleIndex";
import { useDebouncedChapterSave } from "@/hooks/useDebouncedWorkspaceSave";
import { countTextMentionsAcrossChapters } from "@/lib/manuscript-cascade";
import {
  detectCharacterTextChanges,
  type CascadeMatchMode,
  type CharacterTextChange,
} from "@/lib/character-attribute-sync";
import {
  buildCascadeChapterPreviews,
  buildManuscriptSnapshot,
  downloadManuscriptSnapshot,
  getPronounCascadeWarnings,
  type CascadeChapterPreview,
} from "@/lib/cascade-preview";
import {
  enqueueCascadeRetry,
  flushCascadeRetryQueue,
} from "@/lib/cascade-retry-queue";
import {
  addPlotBeat as appendPlotBeat,
  reorderPlotBeats,
  removePlotBeat as dropPlotBeat,
  renamePlotBeat as relabelPlotBeat,
} from "@/lib/plot-beats";
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

interface CharacterCascadePrompt {
  fieldLabel: string;
  oldText: string;
  newText: string;
  mentionCount: number;
  matchMode: CascadeMatchMode;
  characterId?: string;
  characterName?: string;
  previews: CascadeChapterPreview[];
  warnings: string[];
  excludedChapterIds: string[];
}

interface CharacterDeletePrompt {
  character: Character;
  mentionCount: number;
}

export interface InsightRewriteState {
  originalText: string;
  appliedText: string;
  showingApplied: boolean;
  label: string;
}

export interface WorkspaceSessionContext {
  chapterId: string;
  act: string;
  chapterTitle: string;
  plotObjectives: string;
  sceneBeat: string;
  activePlotBeatTitle: string | null;
}

interface ChapterDeletePrompt {
  chapter: StoryChapter;
}

interface StoryEngineContextValue {
  story: Story;
  characters: Character[];
  chapters: StoryChapter[];
  activeChapter: StoryChapter | null;
  activeChapterId: string | null;
  sessionContext: WorkspaceSessionContext | null;
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
  chaptersLoaded: boolean;
  cascadePrompt: CharacterCascadePrompt | null;
  cascadeQueueCount: number;
  cascadeSyncLoading: boolean;
  deletePrompt: CharacterDeletePrompt | null;
  deleteCharacterLoading: boolean;
  editorExternalSyncPaused: boolean;
  toneAlignmentCharacterId: string | null;
  setToneAlignmentCharacterId: (id: string | null) => void;
  rewriteStates: Record<number, InsightRewriteState>;
  customRewriteLoading: number | null;
  registerEditor: (handle: TipTapEditorHandle | null) => void;
  syncRewriteStatesFromDocument: () => void;
  setNavigatorCollapsed: (v: boolean | ((p: boolean) => boolean)) => void;
  setAiHubCollapsed: (v: boolean | ((p: boolean) => boolean)) => void;
  setAiTab: (tab: "soul-check" | "ghostwrite") => void;
  switchChapter: (chapterId: string, plotBeatTitle?: string) => void;
  selectPlotBeat: (chapterId: string, plotBeatTitle: string) => void;
  updateDraft: (html: string) => void;
  setBeat: (beat: string) => void;
  setSliderValue: (value: number) => void;
  setSettingNotes: (notes: string) => void;
  updateChapterMeta: (updates: Partial<StoryChapter>) => void;
  setCharacters: (characters: Character[]) => void;
  handleCharacterSaved: (
    character: Character,
    previous?: Character,
    options?: { includeAgeCascade?: boolean },
  ) => void;
  confirmCharacterCascade: () => Promise<void>;
  skipCharacterCascade: () => void;
  dismissCharacterCascade: () => void;
  toggleCascadeChapterExclusion: (chapterId: string) => void;
  exportCascadeSnapshot: () => void;
  requestCharacterDelete: (character: Character) => void;
  confirmCharacterDelete: (mode: "remove" | "placeholder" | "codex") => Promise<void>;
  dismissCharacterDelete: () => void;
  runSelectionSoulCheck: (selectedText: string) => Promise<void>;
  runSoulCheck: () => Promise<void>;
  runGhostwrite: () => Promise<void>;
  applyPresetRewrite: (
    insightIndex: number,
    targetText: string,
    replacement: string,
    label: string,
  ) => void;
  runCustomRewrite: (
    insightIndex: number,
    targetText: string,
    customPrompt: string,
  ) => Promise<void>;
  toggleRewrite: (insightIndex: number) => void;
  resolveInsight: (insightIndex: number) => void;
  setActiveInsightIndex: (index: number | null) => void;
  onHighlightInsight: (index: number) => void;
  addChapter: () => Promise<void>;
  addingChapter: boolean;
  chapterTitleFocusToken: number;
  setChapterTitle: (title: string) => void;
  moveChapter: (chapterId: string, direction: "up" | "down") => Promise<void>;
  reorderingChapter: boolean;
  addPlotBeat: () => void;
  renamePlotBeat: (beatId: string, title: string) => void;
  removePlotBeat: (beatId: string) => void;
  movePlotBeat: (beatId: string, direction: "up" | "down") => void;
  requestChapterDelete: (chapter: StoryChapter) => void;
  confirmChapterDelete: () => Promise<void>;
  dismissChapterDelete: () => void;
  chapterDeletePrompt: ChapterDeletePrompt | null;
  deleteChapterLoading: boolean;
  reloadChapters: () => Promise<void>;
  codexOpen: boolean;
  setCodexOpen: (open: boolean) => void;
  toneAlignmentLoading: boolean;
  toneAlignmentReport: string | null;
  runToneAlignmentCheck: () => Promise<void>;
  inlineNotice: string | null;
  clearInlineNotice: () => void;
  isProcessingLargeContent: boolean;
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
  const [chaptersPersistBaseline, setChaptersPersistBaseline] = useState(0);

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
  const [cascadePrompt, setCascadePrompt] =
    useState<CharacterCascadePrompt | null>(null);
  const [cascadeQueueCount, setCascadeQueueCount] = useState(0);
  const [cascadeSyncLoading, setCascadeSyncLoading] = useState(false);
  const cascadeQueueRef = useRef<CharacterCascadePrompt[]>([]);
  const [deletePrompt, setDeletePrompt] = useState<CharacterDeletePrompt | null>(
    null,
  );
  const [deleteCharacterLoading, setDeleteCharacterLoading] = useState(false);
  const [editorExternalSyncPaused, setEditorExternalSyncPaused] = useState(false);
  const [toneAlignmentCharacterId, setToneAlignmentCharacterId] = useState<
    string | null
  >(null);
  const [rewriteStates, setRewriteStates] = useState<
    Record<number, InsightRewriteState>
  >({});
  const [customRewriteLoading, setCustomRewriteLoading] = useState<number | null>(
    null,
  );
  const [addingChapter, setAddingChapter] = useState(false);
  const [reorderingChapter, setReorderingChapter] = useState(false);
  const [chapterTitleFocusToken, setChapterTitleFocusToken] = useState(0);
  const [chapterDeletePrompt, setChapterDeletePrompt] =
    useState<ChapterDeletePrompt | null>(null);
  const [deleteChapterLoading, setDeleteChapterLoading] = useState(false);
  const [codexOpen, setCodexOpen] = useState(false);
  const [toneAlignmentLoading, setToneAlignmentLoading] = useState(false);
  const [toneAlignmentReport, setToneAlignmentReport] = useState<string | null>(
    null,
  );
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [isProcessingLargeContent, setIsProcessingLargeContent] = useState(false);

  const clearInlineNotice = useCallback(() => setInlineNotice(null), []);
  const clearRewriteStates = useCallback(() => setRewriteStates({}), []);
  const rewriteStatesRef = useRef(rewriteStates);

  useEffect(() => {
    rewriteStatesRef.current = rewriteStates;
  }, [rewriteStates]);

  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === activeChapterId) ?? chapters[0] ?? null,
    [chapters, activeChapterId],
  );

  const [activePlotBeatTitle, setActivePlotBeatTitle] = useState<string | null>(
    null,
  );

  const draft = activeChapter?.draft_content ?? "";
  const beat = activeChapter?.scene_beat ?? "";

  const sessionContext = useMemo<WorkspaceSessionContext | null>(() => {
    if (!activeChapter) return null;
    return {
      chapterId: activeChapter.id,
      act: activeChapter.act,
      chapterTitle: activeChapter.title,
      plotObjectives: activeChapter.plot_objectives,
      sceneBeat: beat,
      activePlotBeatTitle,
    };
  }, [activeChapter, beat, activePlotBeatTitle]);

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
      title: activeChapter?.title,
      act: activeChapter?.act,
      plotObjectives: activeChapter?.plot_objectives,
      plotBeats: activeChapter?.plot_beats,
      expectedUpdatedAt: activeChapter?.updated_at ?? null,
    }),
    [
      activeChapter?.id,
      activeChapter?.title,
      activeChapter?.act,
      activeChapter?.plot_objectives,
      activeChapter?.plot_beats,
      activeChapter?.updated_at,
      draft,
      beat,
    ],
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

  const bumpPersistBaseline = useCallback(() => {
    setChaptersPersistBaseline((value) => value + 1);
  }, []);

  const syncChapterTimestamps = useCallback(
    async (chapterIds: string[]) => {
      if (!chapterIds.length) return;

      const response = await fetch(`/api/chapters?storyId=${story.id}`);
      const data = await response.json();
      if (!response.ok) return;

      const timestamps = new Map<string, string>(
        (data.chapters ?? []).map((chapter: StoryChapter) => [
          chapter.id,
          chapter.updated_at,
        ]),
      );

      setChapters((prev) =>
        prev.map((chapter) => {
          if (!chapterIds.includes(chapter.id)) return chapter;
          const updatedAt = timestamps.get(chapter.id);
          return updatedAt ? { ...chapter, updated_at: updatedAt } : chapter;
        }),
      );
      bumpPersistBaseline();
    },
    [story.id, bumpPersistBaseline],
  );

  const loadChapters = useCallback(async () => {
    const response = await fetch(`/api/chapters?storyId=${story.id}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to load chapters");
    setChapters(data.chapters ?? []);
    setActiveChapterId(data.activeChapterId ?? data.chapters?.[0]?.id ?? null);
    if (data.settingNotes !== undefined) setSettingNotes(data.settingNotes);
    if (data.sliderValue !== undefined) setSliderValue(data.sliderValue);
    setChaptersLoaded(true);
    bumpPersistBaseline();
  }, [story.id, bumpPersistBaseline]);

  const handleChapterPersisted = useCallback(
    ({ chapterId, updatedAt }: { chapterId: string; updatedAt: string }) => {
      setChapters((prev) =>
        prev.map((chapter) =>
          chapter.id === chapterId ? { ...chapter, updated_at: updatedAt } : chapter,
        ),
      );
    },
    [],
  );

  const handleSaveConflict = useCallback(
    (message: string) => {
      setInlineNotice(message);
      if (message.includes("updated elsewhere")) {
        void loadChapters();
        return;
      }
      if (message.includes("already exists")) {
        void loadChapters();
      }
    },
    [loadChapters],
  );

  const { saveStatus } = useDebouncedChapterSave({
    chapterSnapshot,
    metaSnapshot,
    enabled: chaptersLoaded && Boolean(activeChapter?.id),
    baselineKey,
    persistBaselineKey: `${activeChapterId ?? ""}:${chaptersPersistBaseline}`,
    onSaveConflict: handleSaveConflict,
    onChapterPersisted: handleChapterPersisted,
  });

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
    (chapterId: string, plotBeatTitle?: string) => {
      const chapter = chapters.find((c) => c.id === chapterId);
      if (!chapter) return;

      const isSameChapter = chapterId === activeChapterId;
      if (isSameChapter && !plotBeatTitle) return;

      if (!isSameChapter) {
        setActiveChapterId(chapterId);
        setActiveInsightIndex(null);
        clearRewriteStates();
        setSoulCheckResult(null);
        setGhostwriteResult(null);
      }

      const nextBeat = plotBeatTitle ?? chapter.scene_beat ?? "";
      if (nextBeat !== chapter.scene_beat) {
        updateChapterInState(chapterId, { scene_beat: nextBeat });
      }

      setActivePlotBeatTitle(plotBeatTitle ?? null);
    },
    [chapters, activeChapterId, clearRewriteStates, updateChapterInState],
  );

  const selectPlotBeat = useCallback(
    (chapterId: string, plotBeatTitle: string) => {
      switchChapter(chapterId, plotBeatTitle);
    },
    [switchChapter],
  );

  const updateDraft = useCallback(
    (html: string) => {
      if (!activeChapter) return;

      const plainLength = htmlToPlainText(html).length;
      if (plainLength > 50_000) {
        setIsProcessingLargeContent(true);
        window.setTimeout(() => setIsProcessingLargeContent(false), 400);
      }

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
      const matchingBeat = activeChapter.plot_beats.find(
        (plotBeat) => plotBeat.title === value,
      );
      setActivePlotBeatTitle(matchingBeat?.title ?? null);
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

  const setChapterTitle = useCallback(
    (title: string) => {
      updateChapterMeta({ title });
    },
    [updateChapterMeta],
  );

  const moveChapter = useCallback(
    async (chapterId: string, direction: "up" | "down") => {
      setReorderingChapter(true);
      try {
        const response = await fetch("/api/chapters/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyId: story.id,
            chapterId,
            direction,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to reorder chapters");
        }

        setChapters(data.chapters ?? []);
        bumpPersistBaseline();
      } catch (error) {
        setInlineNotice(
          error instanceof Error ? error.message : "Failed to reorder chapters",
        );
      } finally {
        setReorderingChapter(false);
      }
    },
    [story.id, bumpPersistBaseline],
  );

  const addPlotBeat = useCallback(() => {
    if (!activeChapter) return;
    updateChapterInState(activeChapter.id, {
      plot_beats: appendPlotBeat(activeChapter.plot_beats),
    });
  }, [activeChapter, updateChapterInState]);

  const renamePlotBeat = useCallback(
    (beatId: string, title: string) => {
      if (!activeChapter) return;
      const previous = activeChapter.plot_beats.find((beat) => beat.id === beatId);
      const nextBeats = relabelPlotBeat(activeChapter.plot_beats, beatId, title);
      const patch: Partial<StoryChapter> = { plot_beats: nextBeats };
      if (previous && activeChapter.scene_beat === previous.title) {
        patch.scene_beat = title.trim() || previous.title;
        setActivePlotBeatTitle(patch.scene_beat);
      }
      updateChapterInState(activeChapter.id, patch);
    },
    [activeChapter, updateChapterInState],
  );

  const removePlotBeat = useCallback(
    (beatId: string) => {
      if (!activeChapter) return;
      const removed = activeChapter.plot_beats.find((beat) => beat.id === beatId);
      const nextBeats = dropPlotBeat(activeChapter.plot_beats, beatId);
      const patch: Partial<StoryChapter> = { plot_beats: nextBeats };
      if (removed && activeChapter.scene_beat === removed.title) {
        patch.scene_beat = "";
        setActivePlotBeatTitle(null);
      }
      updateChapterInState(activeChapter.id, patch);
    },
    [activeChapter, updateChapterInState],
  );

  const movePlotBeat = useCallback(
    (beatId: string, direction: "up" | "down") => {
      if (!activeChapter) return;
      updateChapterInState(activeChapter.id, {
        plot_beats: reorderPlotBeats(activeChapter.plot_beats, beatId, direction),
      });
    },
    [activeChapter, updateChapterInState],
  );

  const requestChapterDelete = useCallback((chapter: StoryChapter) => {
    setChapterDeletePrompt({ chapter });
  }, []);

  const dismissChapterDelete = useCallback(() => {
    setChapterDeletePrompt(null);
  }, []);

  const confirmChapterDelete = useCallback(async () => {
    if (!chapterDeletePrompt) return;
    const { chapter } = chapterDeletePrompt;
    setDeleteChapterLoading(true);

    try {
      const response = await fetch("/api/chapters/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          chapterId: chapter.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete chapter");
      }

      setChapters(data.chapters ?? []);
      setActiveChapterId(data.activeChapterId as string | null);
      bumpPersistBaseline();
      setChapterDeletePrompt(null);
      setActiveInsightIndex(null);
      clearRewriteStates();
      setSoulCheckResult(null);
      setGhostwriteResult(null);
    } catch (error) {
      setInlineNotice(
        error instanceof Error ? error.message : "Failed to delete chapter",
      );
    } finally {
      setDeleteChapterLoading(false);
    }
  }, [chapterDeletePrompt, story.id, clearRewriteStates, bumpPersistBaseline]);

  const addChapter = useCallback(async () => {
    setAddingChapter(true);
    setAiError(null);

    try {
      const response = await fetch("/api/chapters/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to add chapter");

      const chapter = data.chapter as StoryChapter;
      setChapters((prev) =>
        [...prev, chapter].sort((a, b) => a.sequence - b.sequence),
      );
      setActiveChapterId(chapter.id);
      setActiveInsightIndex(null);
      clearRewriteStates();
      setSoulCheckResult(null);
      setGhostwriteResult(null);
      setActivePlotBeatTitle(null);
      setChapterTitleFocusToken((token) => token + 1);
      setNavigatorCollapsed(false);
    } catch (error) {
      setAiError(
        error instanceof Error ? error.message : "Failed to add chapter",
      );
    } finally {
      setAddingChapter(false);
    }
  }, [story.id, clearRewriteStates]);

  const resolveInsight = useCallback(
    (insightIndex: number) => {
      const insight = soulCheckResult?.data.insights[insightIndex];
      if (!insight) return;

      editorHandleRef.current?.clearHighlightForTarget(insight.targetText.trim());

      setSoulCheckResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: {
            insights: prev.data.insights.filter(
              (_, index) => index !== insightIndex,
            ),
          },
        };
      });

      setRewriteStates((prev) => {
        const next: Record<number, InsightRewriteState> = {};
        Object.entries(prev).forEach(([key, value]) => {
          const index = Number(key);
          if (index === insightIndex) return;
          next[index > insightIndex ? index - 1 : index] = value;
        });
        return next;
      });

      if (activeInsightIndex === insightIndex) {
        setActiveInsightIndex(null);
      } else if (
        activeInsightIndex != null &&
        activeInsightIndex > insightIndex
      ) {
        setActiveInsightIndex(activeInsightIndex - 1);
      }
    },
    [soulCheckResult, activeInsightIndex],
  );

  useEffect(() => {
    if (!chaptersLoaded) return;
    void flushCascadeRetryQueue(story.id).then((flushed) => {
      if (flushed > 0) void loadChapters();
    });
    function onOnline() {
      void flushCascadeRetryQueue(story.id).then((flushed) => {
        if (flushed > 0) void loadChapters();
      });
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [chaptersLoaded, story.id, loadChapters]);

  const runToneAlignmentCheck = useCallback(async () => {
    if (!plainDraft.trim()) {
      setToneAlignmentReport(
        "Write a paragraph in this chapter before verifying tone alignment.",
      );
      return;
    }

    setToneAlignmentLoading(true);
    setToneAlignmentReport(null);

    try {
      const response = await fetch("/api/tone-alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          draft: plainDraft,
          chapterId: activeChapterId,
          settingNotes,
          characterId: toneAlignmentCharacterId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Tone alignment check failed");
      }
      setToneAlignmentReport(data.report as string);
    } catch (error) {
      setToneAlignmentReport(
        error instanceof Error ? error.message : "Tone alignment check failed",
      );
    } finally {
      setToneAlignmentLoading(false);
    }
  }, [story.id, plainDraft, activeChapterId, settingNotes, toneAlignmentCharacterId]);

  const buildCascadePrompt = useCallback(
    (
      change: CharacterTextChange,
      character: Character,
      excludedChapterIds: string[] = [],
    ): CharacterCascadePrompt | null => {
      const previews = buildCascadeChapterPreviews(
        chapters,
        change.oldText,
        change.newText,
        change.matchMode,
        excludedChapterIds,
      );
      const mentionCount = previews.reduce(
        (sum, preview) => sum + preview.mentionsReplaced,
        0,
      );
      if (mentionCount === 0) return null;

      const warnings =
        change.field === "pronouns" && character.name
          ? getPronounCascadeWarnings(chapters, change.oldText, character.name)
          : [];

      return {
        fieldLabel: change.fieldLabel,
        oldText: change.oldText,
        newText: change.newText,
        matchMode: change.matchMode,
        mentionCount,
        characterId: character.id,
        characterName: character.name,
        previews,
        warnings,
        excludedChapterIds,
      };
    },
    [chapters],
  );

  const presentNextCascadePrompt = useCallback(() => {
    const next = cascadeQueueRef.current.shift() ?? null;
    setCascadeQueueCount(cascadeQueueRef.current.length);
    setCascadePrompt(next);
    setEditorExternalSyncPaused(Boolean(next));
  }, []);

  const enqueueCascadePrompts = useCallback(
    (prompts: CharacterCascadePrompt[]) => {
      if (!prompts.length) return;

      if (cascadePrompt) {
        cascadeQueueRef.current.push(...prompts);
        setCascadeQueueCount(cascadeQueueRef.current.length);
        return;
      }

      const [first, ...rest] = prompts;
      cascadeQueueRef.current = rest;
      setCascadeQueueCount(rest.length);
      setCascadePrompt(first);
      setEditorExternalSyncPaused(true);
    },
    [cascadePrompt],
  );

  const handleCharacterSaved = useCallback(
    (
      character: Character,
      previous?: Character,
      options?: { includeAgeCascade?: boolean },
    ) => {
      setCharacters((prev) => {
        const exists = prev.some((c) => c.id === character.id);
        const next = exists
          ? prev.map((c) => (c.id === character.id ? character : c))
          : [...prev, character];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });

      if (!previous) return;

      const prompts = detectCharacterTextChanges(previous, character, {
        includeAgeCascade: options?.includeAgeCascade,
      })
        .map((change) => buildCascadePrompt(change, character))
        .filter((prompt): prompt is CharacterCascadePrompt => prompt !== null)
        .sort((a, b) => b.mentionCount - a.mentionCount);

      enqueueCascadePrompts(prompts);
    },
    [buildCascadePrompt, enqueueCascadePrompts],
  );

  const toggleCascadeChapterExclusion = useCallback((chapterId: string) => {
    setCascadePrompt((current) => {
      if (!current) return current;
      const excluded = new Set(current.excludedChapterIds);
      if (excluded.has(chapterId)) excluded.delete(chapterId);
      else excluded.add(chapterId);

      const previews = buildCascadeChapterPreviews(
        chapters,
        current.oldText,
        current.newText,
        current.matchMode,
        [...excluded],
      );

      return {
        ...current,
        excludedChapterIds: [...excluded],
        previews,
        mentionCount: previews.reduce(
          (sum, preview) => sum + preview.mentionsReplaced,
          0,
        ),
      };
    });
  }, [chapters]);

  const exportCascadeSnapshot = useCallback(() => {
    downloadManuscriptSnapshot(
      buildManuscriptSnapshot(
        story.id,
        story.title,
        chapters,
        cascadePrompt
          ? `Pre-cascade: ${cascadePrompt.fieldLabel}`
          : "Manual backup",
      ),
    );
  }, [story.id, story.title, chapters, cascadePrompt]);

  const confirmCharacterCascade = useCallback(async () => {
    if (!cascadePrompt) return;

    const { oldText, newText, matchMode, excludedChapterIds } = cascadePrompt;
    setCascadeSyncLoading(true);
    setInlineNotice(null);
    setEditorExternalSyncPaused(true);

    try {
      const res = await fetch("/api/characters/cascade-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          oldText,
          newText,
          matchMode,
          excludeChapterIds: excludedChapterIds,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          err.error ?? "Failed to cascade character update across manuscript",
        );
      }

      const data = (await res.json()) as {
        chapters: Array<{ id: string; draft_content: string }>;
      };

      const patchById = new Map(
        data.chapters.map((row) => [row.id, row.draft_content]),
      );

      setChapters((prev) =>
        prev.map((chapter) => {
          const patched = patchById.get(chapter.id);
          if (patched === undefined) return chapter;
          if (chapter.id === activeChapterId) return chapter;
          return { ...chapter, draft_content: patched };
        }),
      );

      if (activeChapterId && patchById.has(activeChapterId)) {
        editorHandleRef.current?.replaceAllText(oldText, newText, matchMode);
      }

      await syncChapterTimestamps([...patchById.keys()]);

      setSoulCheckResult(null);
      setActiveInsightIndex(null);
      clearRewriteStates();
      presentNextCascadePrompt();
    } catch (err) {
      console.error("[cascade-text]", err);
      enqueueCascadeRetry({
        storyId: story.id,
        oldText,
        newText,
        matchMode,
        excludeChapterIds: excludedChapterIds,
      });
      setInlineNotice(
        err instanceof Error
          ? `${err.message} — queued for retry when back online.`
          : "Could not sync character update. Queued for retry.",
      );
    } finally {
      setCascadeSyncLoading(false);
    }
  }, [
    cascadePrompt,
    story.id,
    activeChapterId,
    presentNextCascadePrompt,
    clearRewriteStates,
    syncChapterTimestamps,
  ]);

  const skipCharacterCascade = useCallback(() => {
    presentNextCascadePrompt();
  }, [presentNextCascadePrompt]);

  const dismissCharacterCascade = useCallback(() => {
    cascadeQueueRef.current = [];
    setCascadeQueueCount(0);
    setCascadePrompt(null);
    setEditorExternalSyncPaused(false);
  }, []);

  const requestCharacterDelete = useCallback(
    (character: Character) => {
      const mentionCount = countTextMentionsAcrossChapters(
        chapters,
        character.name,
        "word",
      );
      setDeletePrompt({ character, mentionCount });
    },
    [chapters],
  );

  const dismissCharacterDelete = useCallback(() => {
    setDeletePrompt(null);
  }, []);

  const confirmCharacterDelete = useCallback(
    async (mode: "remove" | "placeholder" | "codex") => {
      if (!deletePrompt) return;
      const { character } = deletePrompt;
      setDeleteCharacterLoading(true);

      try {
        if (mode !== "codex") {
          const res = await fetch("/api/characters/cascade-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storyId: story.id,
              characterName: character.name,
              replacement: mode === "placeholder" ? "[removed character]" : "",
            }),
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(err.error ?? "Failed to update manuscript mentions");
          }

          const data = (await res.json()) as {
            chapters: Array<{ id: string; draft_content: string }>;
          };
          const patchById = new Map(
            data.chapters.map((row) => [row.id, row.draft_content]),
          );

          setChapters((prev) =>
            prev.map((chapter) => {
              const patched = patchById.get(chapter.id);
              if (!patched || chapter.id === activeChapterId) return chapter;
              return { ...chapter, draft_content: patched };
            }),
          );

          if (activeChapterId && patchById.has(activeChapterId)) {
            editorHandleRef.current?.replaceAllText(
              character.name,
              mode === "placeholder" ? "[removed character]" : "",
              "word",
            );
          }

          await syncChapterTimestamps([...patchById.keys()]);
        }

        const supabase = (await import("@/lib/supabase/client")).createClient();
        const { error } = await supabase
          .from("characters")
          .delete()
          .eq("id", character.id);
        if (error) throw new Error(error.message);

        setCharacters((prev) => prev.filter((item) => item.id !== character.id));
        setDeletePrompt(null);
        setSoulCheckResult(null);
      } catch (error) {
        setInlineNotice(
          error instanceof Error ? error.message : "Character deletion failed",
        );
      } finally {
        setDeleteCharacterLoading(false);
      }
    },
    [deletePrompt, story.id, activeChapterId, syncChapterTimestamps],
  );

  const syncRewriteStatesFromDocument = useCallback(() => {
    const editor = editorHandleRef.current;
    if (!editor) return;

    const prev = rewriteStatesRef.current;
    const entries = Object.entries(prev);
    if (!entries.length) return;

    let changed = false;
    const next: Record<number, InsightRewriteState> = { ...prev };

    for (const [key, state] of entries) {
      const index = Number(key);
      const hasApplied = editor.documentContainsText(state.appliedText);
      const hasOriginal = editor.documentContainsText(state.originalText);
      let showingApplied = state.showingApplied;

      if (hasApplied && !hasOriginal) showingApplied = true;
      else if (hasOriginal && !hasApplied) showingApplied = false;

      if (showingApplied !== state.showingApplied) {
        next[index] = { ...state, showingApplied };
        changed = true;
      }
    }

    if (changed) setRewriteStates(next);
  }, []);

  const applyPresetRewrite = useCallback(
    (
      insightIndex: number,
      targetText: string,
      replacement: string,
      label: string,
    ) => {
      const editor = editorHandleRef.current;
      const trimmed = replacement.trim();
      if (!editor || !trimmed) return;

      const prev = rewriteStatesRef.current;
      const existing = prev[insightIndex];
      const originalText = existing?.originalText ?? targetText.trim();
      const searchText =
        existing && !existing.showingApplied
          ? originalText
          : (existing?.appliedText ?? targetText.trim());

      let ok = editor.replaceTargetText(searchText, trimmed);
      if (!ok) {
        ok = editor.replaceTargetText(targetText.trim(), trimmed);
        if (!ok) return;
      }

      setRewriteStates({
        ...prev,
        [insightIndex]: {
          originalText,
          appliedText: trimmed,
          showingApplied: true,
          label,
        },
      });
      editor.clearHighlightForTarget(targetText.trim());
      setActiveInsightIndex(insightIndex);
    },
    [],
  );

  const toggleRewrite = useCallback((insightIndex: number) => {
    const editor = editorHandleRef.current;
    if (!editor) return;

    const state = rewriteStatesRef.current[insightIndex];
    if (!state) return;

    const searchText = state.showingApplied
      ? state.appliedText
      : state.originalText;
    const replacement = state.showingApplied
      ? state.originalText
      : state.appliedText;

    const ok = editor.replaceTargetText(searchText, replacement);
    if (!ok) return;

    setRewriteStates({
      ...rewriteStatesRef.current,
      [insightIndex]: {
        ...state,
        showingApplied: !state.showingApplied,
      },
    });
  }, []);

  const runCustomRewrite = useCallback(
    async (insightIndex: number, targetText: string, customPrompt: string) => {
      const trimmedPrompt = customPrompt.trim();
      if (!trimmedPrompt) return;

      setCustomRewriteLoading(insightIndex);
      setAiError(null);

      try {
        const relevantCharacters = characters.filter((character) =>
          linkedNames.includes(character.name),
        );
        const codexContext = [
          sessionContext
            ? `Chapter: ${sessionContext.act}\nTitle: ${sessionContext.chapterTitle}\nPlot objectives: ${sessionContext.plotObjectives || "None"}\nScene beat: ${sessionContext.sceneBeat || "None"}`
            : "",
          settingNotes.trim()
            ? `Setting & lore:\n${settingNotes.trim()}`
            : "",
          relevantCharacters.length
            ? `Characters:\n${relevantCharacters
                .map(
                  (c) =>
                    `${c.name} (${c.role}) — flaw: ${c.core_flaw ?? "n/a"}; motivation: ${c.primary_motivation ?? "n/a"}`,
                )
                .join("\n")}`
            : linkedNames.length
              ? `Characters in draft: ${linkedNames.join(", ")}`
              : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        const response = await fetch("/api/custom-rewrite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetText,
            customPrompt: trimmedPrompt,
            characterContext: codexContext,
            sceneBeat: beat,
            plotObjectives: activeChapter?.plot_objectives ?? "",
            chapterAct: activeChapter?.act ?? "",
            chapterTitle: activeChapter?.title ?? "",
            settingNotes,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Custom rewrite failed");
        }

        applyPresetRewrite(
          insightIndex,
          targetText,
          data.rewrite as string,
          trimmedPrompt.length > 40
            ? `${trimmedPrompt.slice(0, 40)}…`
            : trimmedPrompt,
        );
      } catch (error) {
        setAiError(
          error instanceof Error ? error.message : "Custom rewrite failed",
        );
      } finally {
        setCustomRewriteLoading(null);
      }
    },
    [linkedNames, applyPresetRewrite, characters, sessionContext, settingNotes, beat, activeChapter],
  );

  const onHighlightInsight = useCallback((index: number) => {
    setActiveInsightIndex(index);
    setAiTab("soul-check");
    setAiHubCollapsed(false);
  }, []);

  const runSelectionSoulCheck = useCallback(
    async (selectedText: string) => {
      if (!selectedText.trim()) {
        setInlineNotice(
          "Write or draft a paragraph first before running a Soul Check!",
        );
        setAiTab("soul-check");
        setAiHubCollapsed(false);
        return;
      }

      setSelectionLoading(true);
      setAiError(null);
      setInlineNotice(null);
      setAiTab("soul-check");
      setAiHubCollapsed(false);
      setActiveInsightIndex(null);
      clearRewriteStates();

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
    [story.id, sliderValue, activeChapterId, clearRewriteStates],
  );

  const runSoulCheck = useCallback(async () => {
    if (!plainDraft.trim()) {
      setInlineNotice(
        "Write or draft a paragraph first before running a Soul Check!",
      );
      setAiTab("soul-check");
      setAiHubCollapsed(false);
      return;
    }

    setAiLoading("soul-check");
    setAiError(null);
    setInlineNotice(null);
    setAiTab("soul-check");
    setAiHubCollapsed(false);
    setActiveInsightIndex(null);
    clearRewriteStates();

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
          plotObjectives: activeChapter?.plot_objectives ?? "",
          activePlotBeatTitle: sessionContext?.activePlotBeatTitle ?? "",
          settingNotes,
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
  }, [
    story.id,
    plainDraft,
    sliderValue,
    beat,
    activeChapterId,
    activeChapter,
    sessionContext,
    settingNotes,
    clearRewriteStates,
  ]);

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
      } else if (tier === "ghostwriter" && result.prose) {
        editorHandleRef.current?.appendParagraph(result.prose);
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
  ]);

  const value: StoryEngineContextValue = {
    story,
    characters,
    chapters,
    activeChapter,
    activeChapterId,
    sessionContext,
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
    chaptersLoaded,
    cascadePrompt,
    cascadeQueueCount,
    cascadeSyncLoading,
    deletePrompt,
    deleteCharacterLoading,
    editorExternalSyncPaused,
    toneAlignmentCharacterId,
    setToneAlignmentCharacterId,
    rewriteStates,
    customRewriteLoading,
    registerEditor,
    syncRewriteStatesFromDocument,
    setNavigatorCollapsed,
    setAiHubCollapsed,
    setAiTab,
    switchChapter,
    selectPlotBeat,
    updateDraft,
    setBeat,
    setSliderValue,
    setSettingNotes,
    updateChapterMeta,
    setCharacters,
    handleCharacterSaved,
    confirmCharacterCascade,
    skipCharacterCascade,
    dismissCharacterCascade,
    toggleCascadeChapterExclusion,
    exportCascadeSnapshot,
    requestCharacterDelete,
    confirmCharacterDelete,
    dismissCharacterDelete,
    runSelectionSoulCheck,
    runSoulCheck,
    runGhostwrite,
    applyPresetRewrite,
    runCustomRewrite,
    toggleRewrite,
    resolveInsight,
    setActiveInsightIndex,
    onHighlightInsight,
    addChapter,
    addingChapter,
    chapterTitleFocusToken,
    setChapterTitle,
    moveChapter,
    reorderingChapter,
    addPlotBeat,
    renamePlotBeat,
    removePlotBeat,
    movePlotBeat,
    requestChapterDelete,
    confirmChapterDelete,
    dismissChapterDelete,
    chapterDeletePrompt,
    deleteChapterLoading,
    reloadChapters: loadChapters,
    codexOpen,
    setCodexOpen,
    toneAlignmentLoading,
    toneAlignmentReport,
    runToneAlignmentCheck,
    inlineNotice,
    clearInlineNotice,
    isProcessingLargeContent,
  };

  return (
    <StoryEngineContext.Provider value={value}>
      {children}
    </StoryEngineContext.Provider>
  );
}
