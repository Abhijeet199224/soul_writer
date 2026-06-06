import { htmlToPlainText } from "@/lib/draft-content";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function countNameMentions(content: string, name: string): number {
  if (!name.trim() || !content.trim()) return 0;
  const plain = htmlToPlainText(content);
  const matches = plain.match(
    new RegExp(`\\b${escapeRegex(name.trim())}\\b`, "gi"),
  );
  return matches?.length ?? 0;
}

export function replaceNameInHtmlDraft(
  html: string,
  oldName: string,
  newName: string,
): string {
  if (!oldName.trim() || !newName.trim() || oldName === newName) return html;
  const pattern = new RegExp(`\\b${escapeRegex(oldName.trim())}\\b`, "gi");
  return html.replace(pattern, newName.trim());
}

export function draftContainsName(content: string, name: string): boolean {
  return countNameMentions(content, name) > 0;
}
