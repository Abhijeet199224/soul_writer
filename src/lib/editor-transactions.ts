import type { Editor } from "@tiptap/react";

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
