"use client";

import { useCallback, useEffect, useRef } from "react";
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
import { normalizeDraftContent } from "@/lib/draft-content";
import { SoulHighlight } from "@/lib/tiptap/soul-highlight";
import {
  applySoulCheckHighlights,
  clearSoulCheckHighlights,
  getInsightIndexAtPos,
  syncActiveInsightHighlight,
} from "@/lib/soul-check-highlights";
import {
  appendParagraphInEditor,
  replaceTextInEditor,
} from "@/lib/editor-transactions";

export interface TipTapEditorHandle {
  getCursorPrefix: () => string;
  insertAtCursor: (text: string) => void;
  replaceTargetText: (searchText: string, replacement: string) => boolean;
  appendParagraph: (prose: string) => boolean;
}

interface TipTapEditorProps {
  content: string;
  onUpdate: (html: string) => void;
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
  onUpdate,
  soulCheckInsights = [],
  activeInsightIndex = null,
  onHighlightInsight,
  onSelectionSoulCheck,
  selectionLoading = false,
  placeholder = "Write your scene…",
  onEditorReady,
}: TipTapEditorProps) {
    const highlightHandlerRef = useRef(onHighlightInsight);
    const lastSelectionInsightRef = useRef<number | null>(null);

    useEffect(() => {
      highlightHandlerRef.current = onHighlightInsight;
    }, [onHighlightInsight]);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
        }),
        SoulHighlight.configure({ multicolor: true }),
      ],
      content: normalizeDraftContent(content),
      onUpdate: ({ editor: ed }) => {
        onUpdate(ed.getHTML());
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
            "tiptap-manuscript min-h-[320px] px-8 py-6 font-serif text-lg leading-relaxed tracking-wide text-stone-800 outline-none",
          "data-placeholder": placeholder,
        },
      },
    });

    useEffect(() => {
      if (!onEditorReady) return;
      if (!editor) {
        onEditorReady(null);
        return;
      }
      onEditorReady({
        getCursorPrefix: () => {
          const { from } = editor.state.selection;
          return editor.state.doc.textBetween(0, from, "\n");
        },
        insertAtCursor: (text: string) => {
          if (!text.trim()) return;
          editor.chain().focus().insertContent(text).run();
        },
        replaceTargetText: (searchText: string, replacement: string) =>
          replaceTextInEditor(editor, searchText, replacement),
        appendParagraph: (prose: string) =>
          appendParagraphInEditor(editor, prose),
      });
      return () => onEditorReady(null);
    }, [editor, onEditorReady]);

    useEffect(() => {
      if (!editor) return;
      editor.setOptions({
        editorProps: {
          ...editor.options.editorProps,
          handleClick: (_view, pos) => {
            const index = getInsightIndexAtPos(editor, pos);
            if (index != null) {
              lastSelectionInsightRef.current = index;
              highlightHandlerRef.current?.(index);
              return true;
            }
            return false;
          },
        },
      });
    }, [editor]);

    useEffect(() => {
      if (!editor || editor.isDestroyed) return;
      const normalized = normalizeDraftContent(content);
      if (normalized !== editor.getHTML()) {
        editor.commands.setContent(normalized, { emitUpdate: false });
      }
    }, [content, editor]);

    const appliedInsightsRef = useRef("");

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
        <div className="tiptap-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="min-h-[320px] animate-pulse px-8 py-6">
            <div className="h-4 w-1/3 rounded bg-stone-100" />
            <div className="mt-4 h-4 w-full rounded bg-stone-50" />
            <div className="mt-2 h-4 w-5/6 rounded bg-stone-50" />
          </div>
        </div>
      );
    }

    return (
      <div className="tiptap-shell relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
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

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    );
}
