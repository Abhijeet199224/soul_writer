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
