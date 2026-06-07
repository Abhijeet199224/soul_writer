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

function readInsightIndexFromMarks(
  marks: ReadonlyArray<{ type: { name: string }; attrs: Record<string, unknown> }>,
): number | null {
  const mark = marks.find(
    (m) => m.type.name === "highlight" && m.attrs.insightIndex != null,
  );
  if (!mark) return null;
  const index = Number(mark.attrs.insightIndex);
  return Number.isNaN(index) ? null : index;
}

/** Resolve insight index when cursor is inside or adjacent to a soul-check mark. */
export function getInsightIndexAtPos(
  editor: Editor,
  pos: number,
): number | null {
  const doc = editor.state.doc;
  const positions = [pos, pos - 1, pos + 1].filter(
    (p) => p >= 0 && p <= doc.content.size,
  );

  for (const p of positions) {
    const index = readInsightIndexFromMarks(doc.resolve(p).marks());
    if (index != null) return index;
  }

  return null;
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

/** Remove soul-check highlight marks for one insight index. */
export function clearInsightHighlight(
  editor: Editor,
  insightIndex: number,
): void {
  const highlightMark = editor.schema.marks.highlight;
  if (!highlightMark) return;

  let { tr } = editor.state;
  const indexKey = String(insightIndex);

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (const mark of node.marks) {
      if (
        mark.type.name === "highlight" &&
        String(mark.attrs.insightIndex) === indexKey
      ) {
        tr = tr.removeMark(pos, pos + node.text.length, highlightMark);
      }
    }
  });

  tr.setMeta("addToHistory", false);
  editor.view.dispatch(tr);
}

/** Remove soul-check highlights covering a target sentence (any insight index). */
export function clearHighlightForTargetText(
  editor: Editor,
  targetText: string,
): void {
  const highlightMark = editor.schema.marks.highlight;
  if (!highlightMark) return;

  const needle = targetText.trim();
  if (!needle) return;

  const ranges = findTextRangesInDoc(editor.state.doc, needle);
  if (!ranges.length) return;

  let { tr } = editor.state;

  for (const { from, to } of ranges) {
    tr = tr.removeMark(from, to, highlightMark);
  }

  tr.setMeta("addToHistory", false);
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

/** Sync glowing active state on editor marks to match the focused AI Hub card. */
export function syncActiveInsightHighlight(
  editor: Editor,
  activeIndex: number | null,
): void {
  const root = editor.view?.dom;
  if (!root) return;

  root.querySelectorAll<HTMLElement>("mark[data-insight-index]").forEach((el) => {
    const idx = Number(el.dataset.insightIndex);
    const isActive = activeIndex != null && idx === activeIndex;
    el.classList.toggle("soul-highlight-active", isActive);
  });
}
