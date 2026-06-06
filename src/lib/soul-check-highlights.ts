import type { Editor } from "@tiptap/react";
import type { ColdZone } from "@/lib/gemini/generate";
import { ZONE_COLORS } from "@/lib/tiptap/soul-highlight";

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

export function applySoulCheckHighlights(
  editor: Editor,
  zones: ColdZone[],
): void {
  if (!zones.length) return;

  const highlightMark = editor.schema.marks.highlight;
  if (!highlightMark) return;

  let { tr } = editor.state;
  const used = new Set<string>();

  for (const zone of zones) {
    const excerpt = zone.excerpt?.trim();
    if (!excerpt || used.has(excerpt)) continue;
    used.add(excerpt);

    const color = ZONE_COLORS[zone.type] ?? ZONE_COLORS.cold;
    const ranges = findTextRangesInDoc(editor.state.doc, excerpt);

    for (const { from, to } of ranges) {
      tr = tr.addMark(
        from,
        to,
        highlightMark.create({
          color,
          insightIndex: String(zone.insightIndex),
          zoneType: zone.type,
        }),
      );
    }
  }

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
