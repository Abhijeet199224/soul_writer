import { createDocument } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { normalizeDraftContent } from "@/lib/draft-content";

export function getCursorPrefixFromEditor(editor: Editor | null): string {
  if (!editor) return "";
  const { from } = editor.state.selection;
  return editor.state.doc.textBetween(0, from, "\n");
}

export function findTextRangesInDoc(
  doc: Editor["state"]["doc"],
  searchText: string,
): { from: number; to: number }[] {
  const needle = searchText.trim();
  if (!needle) return [];

  const ranges: { from: number; to: number }[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    let offset = 0;
    while (offset < node.text.length) {
      const idx = node.text.indexOf(needle, offset);
      if (idx === -1) break;
      ranges.push({ from: pos + idx, to: pos + idx + needle.length });
      offset = idx + 1;
    }
  });

  return ranges;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive whole-word matches in the document. */
export function findWordRangesInDoc(
  doc: Editor["state"]["doc"],
  word: string,
): { from: number; to: number }[] {
  const needle = word.trim();
  if (!needle) return [];

  const pattern = new RegExp(`\\b${escapeRegex(needle)}\\b`, "gi");
  const ranges: { from: number; to: number }[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(node.text)) !== null) {
      ranges.push({
        from: pos + match.index,
        to: pos + match.index + match[0].length,
      });
    }
  });

  return ranges;
}

export function documentContainsText(
  editor: Editor,
  searchText: string,
): boolean {
  return findTextRangesInDoc(editor.state.doc, searchText.trim()).length > 0;
}

/**
 * Swap the entire document without polluting the undo/redo stack.
 * Use for chapter navigation and other workspace-level document loads.
 */
export function loadDocumentWithoutHistory(
  editor: Editor,
  html: string,
): boolean {
  const content = normalizeDraftContent(html);
  const document = createDocument(content, editor.schema, {}, {
    errorOnInvalidContent: false,
  });

  const { state, view } = editor;
  if (view.isDestroyed) return false;

  const transaction = state.tr
    .replaceWith(0, state.doc.content.size, document)
    .setMeta("addToHistory", false);

  view.dispatch(transaction);
  return true;
}

/** Replace verbatim text via TipTap transaction (preserves undo/redo history). */
export function replaceTextInEditor(
  editor: Editor,
  searchText: string,
  replacement: string,
): boolean {
  const needle = searchText.trim();
  if (!needle || !replacement.trim()) return false;

  const ranges = findTextRangesInDoc(editor.state.doc, needle);
  if (!ranges.length) return false;

  const { from, to } = ranges[0];
  return editor
    .chain()
    .focus()
    .insertContentAt({ from, to }, replacement.trim())
    .run();
}

/** Replace every whole-word match in one undoable transaction via insertContentAt semantics. */
export function replaceAllWordsInEditor(
  editor: Editor,
  searchWord: string,
  replacement: string,
): boolean {
  const trimmed = replacement.trim();
  if (!searchWord.trim() || !trimmed) return false;

  const ranges = findWordRangesInDoc(editor.state.doc, searchWord);
  if (!ranges.length) return false;

  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      const sorted = [...ranges].sort((a, b) => b.from - a.from);
      for (const { from, to } of sorted) {
        const slice = editor.schema.text(trimmed);
        tr.replaceWith(from, to, slice);
      }
      if (dispatch) dispatch(tr);
      return true;
    })
    .run();
}

/** Insert at the current selection/cursor via insertContentAt. */
export function insertTextAtCursor(editor: Editor, text: string): boolean {
  if (!text.trim()) return false;
  const { from, to } = editor.state.selection;
  return editor
    .chain()
    .focus()
    .insertContentAt({ from, to }, text)
    .run();
}

/** Append plain prose as a new paragraph at document end (undo-safe). */
export function appendParagraphInEditor(
  editor: Editor,
  prose: string,
): boolean {
  if (!prose.trim()) return false;
  const end = editor.state.doc.content.size;
  const paragraph = prose.trim().split(/\n\n+/).map((block) => ({
    type: "paragraph",
    content: [{ type: "text", text: block.replace(/\n/g, " ") }],
  }));
  return editor.chain().focus().insertContentAt(end, paragraph).run();
}
