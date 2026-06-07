import type { StoryChapter } from "@/lib/types";
import { htmlToPlainText } from "@/lib/draft-content";
import { countTextMentions, type CascadeMatchMode } from "@/lib/character-attribute-sync";

export interface ManuscriptSearchHit {
  chapterId: string;
  act: string;
  title: string;
  mentionCount: number;
  snippet: string;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function excerptAroundMatch(plain: string, query: string): string {
  const pattern = new RegExp(escapeRegex(query.trim()), "i");
  const match = pattern.exec(plain);
  if (!match || match.index == null) return plain.slice(0, 100);
  const start = Math.max(0, match.index - 50);
  const end = Math.min(plain.length, match.index + query.length + 50);
  return `${start > 0 ? "…" : ""}${plain.slice(start, end).trim()}${end < plain.length ? "…" : ""}`;
}

export function searchManuscriptMentions(
  chapters: StoryChapter[],
  query: string,
  mode: CascadeMatchMode = "phrase",
): ManuscriptSearchHit[] {
  const needle = query.trim();
  if (!needle) return [];

  return chapters
    .map((chapter) => {
      const mentionCount = countTextMentions(chapter.draft_content, needle, mode);
      if (mentionCount === 0) return null;
      const plain = htmlToPlainText(chapter.draft_content);
      return {
        chapterId: chapter.id,
        act: chapter.act,
        title: chapter.title,
        mentionCount,
        snippet: excerptAroundMatch(plain, needle),
      };
    })
    .filter((hit): hit is ManuscriptSearchHit => hit !== null)
    .sort((a, b) => b.mentionCount - a.mentionCount);
}
