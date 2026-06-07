"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  Sparkles,
  Strikethrough,
} from "lucide-react";
import type { SoulCheckInsight } from "@/lib/gemini/generate";
import type { Character } from "@/lib/types";
import { normalizeDraftContent } from "@/lib/draft-content";
import { SoulHighlight } from "@/lib/tiptap/soul-highlight";
import { CharacterCodex } from "@/lib/tiptap/character-mark";
import {
  applyCharacterCodexMarks,
  getCharacterAtPos,
} from "@/lib/character-codex-highlights";
import {
  applySoulCheckHighlights,
  clearSoulCheckHighlights,
  getInsightIndexAtPos,
  syncActiveInsightHighlight,
} from "@/lib/soul-check-highlights";
import {
  appendParagraphInEditor,
  documentContainsText,
  insertTextAtCursor,
  loadDocumentWithoutHistory,
  replaceTextInEditor,
  replaceAllWordsInEditor,
} from "@/lib/editor-transactions";
import { CharacterHoverCard } from "@/components/editor/CharacterHoverCard";

export interface TipTapEditorHandle {
  getCursorPrefix: () => string;
  insertAtCursor: (text: string) => boolean;
  replaceTargetText: (searchText: string, replacement: string) => boolean;
  replaceAllWords: (searchWord: string, replacement: string) => boolean;
  appendParagraph: (prose: string) => boolean;
  loadDocument: (html: string) => boolean;
  documentContainsText: (text: string) => boolean;
}

interface TipTapEditorProps {
  content: string;
  documentKey?: string | null;
  characters?: Character[];
  onUpdate: (html: string) => void;
  onAfterUpdate?: () => void;
  soulCheckInsights?: SoulCheckInsight[];
  activeInsightIndex?: number | null;
  onHighlightInsight?: (insightIndex: number) => void;
  onSelectionSoulCheck?: (selectedText: string) => void;
  selectionLoading?: boolean;
  placeholder?: string;
  onEditorReady?: (handle: TipTapEditorHandle | null) => void;
}

function MenuButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-md p-1.5 transition ${
        active
          ? "bg-stone-700 text-amber-200"
          : "text-stone-300 hover:bg-stone-800 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export function TipTapEditor({
  content,
  documentKey = null,
  characters = [],
  onUpdate,
  onAfterUpdate,
  soulCheckInsights = [],
  activeInsightIndex = null,
  onHighlightInsight,
  onSelectionSoulCheck,
  selectionLoading = false,
  placeholder = "Write your scene…",
  onEditorReady,
}: TipTapEditorProps) {
  const highlightHandlerRef = useRef(onHighlightInsight);
  const afterUpdateRef = useRef(onAfterUpdate);
  const lastSelectionInsightRef = useRef<number | null>(null);
  const loadedDocumentKeyRef = useRef<string | null>(null);
  const appliedInsightsRef = useRef("");
  const appliedCharactersRef = useRef("");
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoverCharacter, setHoverCharacter] = useState<Character | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<DOMRect | null>(null);

  useEffect(() => {
    highlightHandlerRef.current = onHighlightInsight;
  }, [onHighlightInsight]);

  useEffect(() => {
    afterUpdateRef.current = onAfterUpdate;
  }, [onAfterUpdate]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      SoulHighlight.configure({ multicolor: true }),
      CharacterCodex,
    ],
    content: normalizeDraftContent(content),
    onUpdate: ({ editor: ed }) => {
      onUpdate(ed.getHTML());
      afterUpdateRef.current?.();
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      if (from !== to) return;
      const index = getInsightIndexAtPos(ed, from);
      if (index == null || index === lastSelectionInsightRef.current) return;
      lastSelectionInsightRef.current = index;
      highlightHandlerRef.current?.(index);
    },
    editorProps: {
      attributes: {
        class:
          "tiptap-manuscript mx-auto min-h-[360px] max-w-[42rem] px-10 py-8 font-serif text-[1.0625rem] leading-[1.85] tracking-[0.01em] text-stone-800 outline-none",
        "data-placeholder": placeholder,
      },
    },
  });

  const buildHandle = useCallback((): TipTapEditorHandle | null => {
    if (!editor) return null;
    return {
      getCursorPrefix: () => {
        const { from } = editor.state.selection;
        return editor.state.doc.textBetween(0, from, "\n");
      },
      insertAtCursor: (text: string) => insertTextAtCursor(editor, text),
      replaceTargetText: (searchText: string, replacement: string) =>
        replaceTextInEditor(editor, searchText, replacement),
      replaceAllWords: (searchWord: string, replacement: string) =>
        replaceAllWordsInEditor(editor, searchWord, replacement),
      appendParagraph: (prose: string) =>
        appendParagraphInEditor(editor, prose),
      loadDocument: (html: string) => loadDocumentWithoutHistory(editor, html),
      documentContainsText: (text: string) =>
        documentContainsText(editor, text),
    };
  }, [editor]);

  useEffect(() => {
    if (!onEditorReady) return;
    onEditorReady(buildHandle());
    return () => onEditorReady(null);
  }, [editor, onEditorReady, buildHandle]);

  useEffect(() => {
    if (!editor) return;

    const showCharacterPopover = (target: HTMLElement, pos: number) => {
      const ref = getCharacterAtPos(editor, pos);
      if (!ref) return;
      const character = characters.find((c) => c.id === ref.id);
      if (!character) return;
      setHoverCharacter(character);
      setHoverAnchor(target.getBoundingClientRect());
    };

    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        handleClick: (view, pos, event) => {
          const index = getInsightIndexAtPos(editor, pos);
          if (index != null) {
            lastSelectionInsightRef.current = index;
            highlightHandlerRef.current?.(index);
            return true;
          }

          const target = event.target as HTMLElement;
          const codexEl = target.closest("[data-character-codex]");
          if (codexEl instanceof HTMLElement) {
            showCharacterPopover(codexEl, pos);
            return true;
          }

          return false;
        },
        handleDOMEvents: {
          mouseover: (view, event) => {
            const target = event.target as HTMLElement;
            const codexEl = target.closest("[data-character-codex]");
            if (!(codexEl instanceof HTMLElement)) return false;

            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            const pos = view.posAtDOM(codexEl, 0);
            hoverTimeoutRef.current = setTimeout(() => {
              showCharacterPopover(codexEl, pos);
            }, 120);
            return false;
          },
          mouseout: (view, event) => {
            const related = event.relatedTarget as Node | null;
            const target = event.target as HTMLElement;
            if (target.closest("[data-character-codex]")) {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = setTimeout(() => {
                if (related instanceof HTMLElement && related.closest(".character-codex-popover")) {
                  return;
                }
                setHoverCharacter(null);
                setHoverAnchor(null);
              }, 160);
            }
            return false;
          },
        },
      },
    });
  }, [editor, characters]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const normalized = normalizeDraftContent(content);
    const keyChanged =
      documentKey != null && loadedDocumentKeyRef.current !== documentKey;

      if (keyChanged) {
        loadDocumentWithoutHistory(editor, normalized);
        loadedDocumentKeyRef.current = documentKey;
        lastSelectionInsightRef.current = null;
        appliedCharactersRef.current = "";
        clearSoulCheckHighlights(editor);
        return;
      }

    if (normalized !== editor.getHTML()) {
      loadDocumentWithoutHistory(editor, normalized);
    }
  }, [content, documentKey, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const key = JSON.stringify(soulCheckInsights);
    if (key === appliedInsightsRef.current) return;
    appliedInsightsRef.current = key;

    if (!soulCheckInsights.length) {
      clearSoulCheckHighlights(editor);
      return;
    }

    applySoulCheckHighlights(editor, soulCheckInsights);
    syncActiveInsightHighlight(editor, activeInsightIndex);
  }, [editor, soulCheckInsights, activeInsightIndex]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    syncActiveInsightHighlight(editor, activeInsightIndex);
  }, [editor, activeInsightIndex]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const key = `${documentKey ?? ""}|${characters.map((c) => c.id + c.name).join("|")}`;
    if (key === appliedCharactersRef.current) return;
    appliedCharactersRef.current = key;
    applyCharacterCodexMarks(editor, characters);
  }, [editor, characters, documentKey]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const runSoulCheckOnSelection = useCallback(() => {
    if (!editor || !onSelectionSoulCheck) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const selected = editor.state.doc.textBetween(from, to, "\n").trim();
    if (selected.length >= 3) {
      onSelectionSoulCheck(selected);
    }
  }, [editor, onSelectionSoulCheck]);

  if (!editor) {
    return (
      <div className="tiptap-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all duration-300 ease-in-out">
        <div className="min-h-[360px] animate-pulse px-10 py-8">
          <div className="mx-auto h-4 w-1/3 max-w-md rounded bg-stone-100" />
          <div className="mx-auto mt-4 h-4 w-full max-w-2xl rounded bg-stone-50" />
          <div className="mx-auto mt-2 h-4 w-5/6 max-w-2xl rounded bg-stone-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="tiptap-shell relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all duration-300 ease-in-out">
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-xl border border-stone-700/80 bg-stone-900/95 px-1.5 py-1 shadow-xl shadow-stone-900/30 backdrop-blur-sm"
      >
        <MenuButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </MenuButton>
        <span className="mx-1 h-5 w-px bg-stone-600" />
        <MenuButton
          title="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </MenuButton>
        {onSelectionSoulCheck && (
          <>
            <span className="mx-1 h-5 w-px bg-stone-600" />
            <MenuButton
              title="Run Soul Check on selected text — audits voice and suggests tone rewrites in the AI Hub"
              onClick={runSoulCheckOnSelection}
            >
              <Sparkles
                className={`h-4 w-4 text-amber-300 ${selectionLoading ? "animate-pulse" : ""}`}
              />
            </MenuButton>
          </>
        )}
      </BubbleMenu>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-[#fdfcfb]">
        <EditorContent editor={editor} className="h-full" />
      </div>

      {hoverCharacter && hoverAnchor && (
        <CharacterHoverCard
          character={hoverCharacter}
          anchorRect={hoverAnchor}
          onClose={() => {
            setHoverCharacter(null);
            setHoverAnchor(null);
          }}
        />
      )}
    </div>
  );
}
