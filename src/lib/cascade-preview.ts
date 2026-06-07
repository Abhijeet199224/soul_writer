import type { StoryChapter } from "@/lib/types";
import { htmlToPlainText } from "@/lib/draft-content";
import {
  type CascadeMatchMode,
  countTextMentions,
  replaceTextInHtmlDraft,
} from "@/lib/character-attribute-sync";
import { buildChapterTextCascadePatches } from "@/lib/manuscript-cascade";

export interface CascadeChapterPreview {
  chapterId: string;
  act: string;
  title: string;
  mentionsReplaced: number;
  snippet: string;
  beforeExcerpt: string;
  afterExcerpt: string;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function excerptAroundMatch(plain: string, needle: string, radius = 60): string {
  const pattern = new RegExp(escapeRegex(needle.trim()), "i");
  const match = pattern.exec(plain);
  if (!match || match.index == null) {
    return plain.slice(0, Math.min(plain.length, radius * 2)).trim();
  }
  const start = Math.max(0, match.index - radius);
  const end = Math.min(plain.length, match.index + needle.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < plain.length ? "…" : "";
  return `${prefix}${plain.slice(start, end).trim()}${suffix}`;
}

export function buildCascadeChapterPreviews(
  chapters: StoryChapter[],
  oldText: string,
  newText: string,
  mode: CascadeMatchMode,
  excludeChapterIds: string[] = [],
): CascadeChapterPreview[] {
  const excluded = new Set(excludeChapterIds);
  const patches = buildChapterTextCascadePatches(chapters, oldText, newText, mode);

  return patches
    .filter((patch) => !excluded.has(patch.id))
    .map((patch) => {
      const chapter = chapters.find((item) => item.id === patch.id);
      const beforePlain = htmlToPlainText(chapter?.draft_content ?? "");
      const afterPlain = htmlToPlainText(patch.draft_content);
      return {
        chapterId: patch.id,
        act: chapter?.act ?? "Chapter",
        title: chapter?.title ?? "Untitled",
        mentionsReplaced: patch.mentionsReplaced,
        snippet: excerptAroundMatch(beforePlain, oldText),
        beforeExcerpt: excerptAroundMatch(beforePlain, oldText, 120),
        afterExcerpt: excerptAroundMatch(afterPlain, newText, 120),
      };
    });
}

export function countCascadeMentions(
  chapters: StoryChapter[],
  oldText: string,
  mode: CascadeMatchMode,
  excludeChapterIds: string[] = [],
): number {
  const excluded = new Set(excludeChapterIds);
  return chapters.reduce((total, chapter) => {
    if (excluded.has(chapter.id)) return total;
    return total + countTextMentions(chapter.draft_content, oldText, mode);
  }, 0);
}

const COMMON_PRONOUNS = new Set([
  "he",
  "him",
  "his",
  "she",
  "her",
  "hers",
  "they",
  "them",
  "their",
  "theirs",
]);

export function getPronounCascadeWarnings(
  chapters: StoryChapter[],
  pronoun: string,
  characterName: string,
): string[] {
  const token = pronoun.trim().toLowerCase();
  if (!COMMON_PRONOUNS.has(token)) return [];

  const warnings: string[] = [];
  const sentencePattern = new RegExp(`[^.!?]*\\b${escapeRegex(pronoun)}\\b[^.!?]*[.!?]?`, "gi");

  for (const chapter of chapters) {
    const plain = htmlToPlainText(chapter.draft_content);
    if (!plain) continue;

    let match: RegExpExecArray | null;
    sentencePattern.lastIndex = 0;
    while ((match = sentencePattern.exec(plain)) !== null) {
      const sentence = match[0];
      if (!new RegExp(`\\b${escapeRegex(characterName)}\\b`, "i").test(sentence)) {
        warnings.push(
          `${chapter.act} · ${chapter.title}: "${sentence.trim().slice(0, 90)}${sentence.length > 90 ? "…" : ""}"`,
        );
        if (warnings.length >= 5) return warnings;
      }
    }
  }

  return warnings;
}

export interface ManuscriptSnapshot {
  exportedAt: string;
  storyId: string;
  storyTitle: string;
  reason: string;
  chapters: Array<{
    id: string;
    act: string;
    title: string;
    draft_content: string;
  }>;
}

export function buildManuscriptSnapshot(
  storyId: string,
  storyTitle: string,
  chapters: StoryChapter[],
  reason: string,
): ManuscriptSnapshot {
  return {
    exportedAt: new Date().toISOString(),
    storyId,
    storyTitle,
    reason,
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      act: chapter.act,
      title: chapter.title,
      draft_content: chapter.draft_content,
    })),
  };
}

export function downloadManuscriptSnapshot(snapshot: ManuscriptSnapshot): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `soul-writer-backup-${snapshot.storyId.slice(0, 8)}-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function previewActiveChapterDiff(
  activeChapter: StoryChapter | null,
  oldText: string,
  newText: string,
  mode: CascadeMatchMode,
): { before: string; after: string } | null {
  if (!activeChapter) return null;
  const before = htmlToPlainText(activeChapter.draft_content);
  const after = htmlToPlainText(
    replaceTextInHtmlDraft(activeChapter.draft_content, oldText, newText, mode),
  );
  if (before === after) return null;
  return { before, after };
}
