import type { StoryChapter } from "@/lib/types";
import {
  type CascadeMatchMode,
  countTextMentions,
  replaceTextInHtmlDraft,
} from "@/lib/character-attribute-sync";

export interface ChapterDraftPatch {
  id: string;
  draft_content: string;
  mentionsReplaced: number;
}

export function countTextMentionsAcrossChapters(
  chapters: StoryChapter[],
  text: string,
  mode: CascadeMatchMode,
): number {
  return chapters.reduce(
    (total, chapter) =>
      total + countTextMentions(chapter.draft_content, text, mode),
    0,
  );
}

/** @deprecated Use countTextMentionsAcrossChapters with mode "word". */
export function countNameMentionsAcrossChapters(
  chapters: StoryChapter[],
  name: string,
): number {
  return countTextMentionsAcrossChapters(chapters, name, "word");
}

/** @deprecated Use countTextMentionsAcrossChapters with mode "word". */
export function storyContainsCharacterName(
  chapters: StoryChapter[],
  name: string,
): boolean {
  return countNameMentionsAcrossChapters(chapters, name) > 0;
}

export function buildChapterTextCascadePatches(
  chapters: Array<{ id: string; draft_content: string }>,
  oldText: string,
  newText: string,
  mode: CascadeMatchMode,
): ChapterDraftPatch[] {
  const patches: ChapterDraftPatch[] = [];

  for (const chapter of chapters) {
    const before = countTextMentions(chapter.draft_content, oldText, mode);
    if (before === 0) continue;

    const draft_content = replaceTextInHtmlDraft(
      chapter.draft_content,
      oldText,
      newText,
      mode,
    );

    patches.push({
      id: chapter.id,
      draft_content,
      mentionsReplaced: before,
    });
  }

  return patches;
}

/** @deprecated Use buildChapterTextCascadePatches with mode "word". */
export function buildChapterNameCascadePatches(
  chapters: Array<{ id: string; draft_content: string }>,
  oldName: string,
  newName: string,
): ChapterDraftPatch[] {
  return buildChapterTextCascadePatches(chapters, oldName, newName, "word");
}
