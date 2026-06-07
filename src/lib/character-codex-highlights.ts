import type { Editor } from "@tiptap/react";
import type { Character } from "@/lib/types";
import { findWordRangesInDoc } from "@/lib/editor-transactions";

export function getCharacterAtPos(
  editor: Editor,
  pos: number,
): { id: string; name: string } | null {
  const doc = editor.state.doc;
  const positions = [pos, pos - 1, pos + 1].filter(
    (p) => p >= 0 && p <= doc.content.size,
  );

  for (const p of positions) {
    const mark = doc
      .resolve(p)
      .marks()
      .find((m) => m.type.name === "characterCodex");
    if (mark?.attrs.characterId && mark.attrs.characterName) {
      return {
        id: String(mark.attrs.characterId),
        name: String(mark.attrs.characterName),
      };
    }
  }

  return null;
}

export function clearCharacterCodexMarks(editor: Editor): void {
  const markType = editor.schema.marks.characterCodex;
  if (!markType) return;

  let { tr } = editor.state;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (const mark of node.marks) {
      if (mark.type.name === "characterCodex") {
        tr = tr.removeMark(pos, pos + node.text.length, markType);
      }
    }
  });

  tr.setMeta("addToHistory", false);
  editor.view.dispatch(tr);
}

function getCharacterSearchTerms(character: Character): string[] {
  const terms = [character.name.trim()];
  if (character.aliases) {
    terms.push(
      ...character.aliases
        .split(/[,;|]/)
        .map((alias) => alias.trim())
        .filter(Boolean),
    );
  }
  return [...new Set(terms.filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
}

export function applyCharacterCodexMarks(
  editor: Editor,
  characters: Character[],
): void {
  if (!characters.length) {
    clearCharacterCodexMarks(editor);
    return;
  }

  const markType = editor.schema.marks.characterCodex;
  if (!markType) return;

  clearCharacterCodexMarks(editor);

  const sorted = [...characters].sort(
    (a, b) => b.name.length - a.name.length,
  );
  let { tr } = editor.state;

  for (const character of sorted) {
    for (const term of getCharacterSearchTerms(character)) {
      const ranges = findWordRangesInDoc(editor.state.doc, term);
      for (const { from, to } of ranges) {
        tr = tr.addMark(
          from,
          to,
          markType.create({
            characterId: character.id,
            characterName: character.name,
          }),
        );
      }
    }
  }

  tr.setMeta("addToHistory", false);
  editor.view.dispatch(tr);
}

/** Re-apply codex underlines after cascade or profile edits. */
export function refreshCharacterCodexMarks(
  editor: Editor,
  characters: Character[],
): void {
  applyCharacterCodexMarks(editor, characters);
}
