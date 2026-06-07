import type { StoryChapter } from "@/lib/types";
import { replaceNameInHtmlDraft, countNameMentions } from "@/lib/character-name-sync";

export interface ChapterDraftPatch {
  id: string;
  draft_content: string;
  mentionsReplaced: number;
}

export function countNameMentionsAcrossChapters(
  chapters: StoryChapter[],
  name: string,
): number {
  return chapters.reduce(
    (total, chapter) => total + countNameMentions(chapter.draft_content, name),
    0,
  );
}

export function storyContainsCharacterName(
  chapters: StoryChapter[],
  name: string,
): boolean {
  return countNameMentionsAcrossChapters(chapters, name) > 0;
}

/** Build draft patches for every chapter that mentions `oldName`. */
export function buildChapterNameCascadePatches(
  chapters: Array<{ id: string; draft_content: string }>,
  oldName: string,
  newName: string,
): ChapterDraftPatch[] {
  const patches: ChapterDraftPatch[] = [];

  for (const chapter of chapters) {
    const before = countNameMentions(chapter.draft_content, oldName);
    if (before === 0) continue;

    const draft_content = replaceNameInHtmlDraft(
      chapter.draft_content,
      oldName,
      newName,
    );

    patches.push({
      id: chapter.id,
      draft_content,
      mentionsReplaced: before,
    });
  }

  return patches;
}
