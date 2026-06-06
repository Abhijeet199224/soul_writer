import type { Editor } from "@tiptap/react";
import type { SoulCheckInsight } from "@/lib/gemini/generate";

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

export function clearSoulCheckHighlights(editor: Editor): void {
  const highlightMark = editor.schema.marks.highlight;
  if (!highlightMark) return;

  let { tr } = editor.state;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (const mark of node.marks) {
      if (mark.type.name === "highlight" && mark.attrs.insightIndex != null) {
        tr = tr.removeMark(pos, pos + node.text.length, highlightMark);
      }
    }
  });

  editor.view.dispatch(tr);
}

export function applySoulCheckHighlights(
  editor: Editor,
  insights: SoulCheckInsight[],
): void {
  if (!insights.length) return;

  const highlightMark = editor.schema.marks.highlight;
  if (!highlightMark) return;

  clearSoulCheckHighlights(editor);

  let { tr } = editor.state;
  const used = new Set<string>();

  insights.forEach((insight, insightIndex) => {
    const targetText = insight.targetText?.trim();
    if (!targetText || used.has(targetText)) return;
    used.add(targetText);

    const ranges = findTextRangesInDoc(editor.state.doc, targetText);

    for (const { from, to } of ranges) {
      tr = tr.addMark(
        from,
        to,
        highlightMark.create({
          insightIndex: String(insightIndex),
          severity: insight.severity,
        }),
      );
    }
  });

  editor.view.dispatch(tr);
}

export function getInsightIndexAtPos(
  editor: Editor,
  pos: number,
): number | null {
  const $pos = editor.state.doc.resolve(pos);
  const mark = $pos.marks().find((m) => m.type.name === "highlight");
  if (!mark?.attrs.insightIndex) return null;
  const index = Number(mark.attrs.insightIndex);
  return Number.isNaN(index) ? null : index;
}
