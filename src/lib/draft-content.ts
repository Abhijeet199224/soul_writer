/** Helpers for TipTap HTML draft storage vs plain-text AI/character APIs */

/** SSR-safe: identical output on server and client (no DOMParser). */
export function htmlToPlainText(content: string): string {
  if (!content?.trim()) return "";
  if (!isHtmlContent(content)) return content;
  return content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeDraftContent(content: string): string {
  if (!content?.trim()) return "<p></p>";
  if (isHtmlContent(content)) return content;
  return content
    .split(/\n\n+/)
    .filter((block) => block.trim())
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function appendHtmlParagraph(html: string, prose: string): string {
  const paragraph = `<p>${escapeHtml(prose.trim()).replace(/\n/g, "<br>")}</p>`;
  const base = html?.trim() ? html : "<p></p>";
  return `${base}${paragraph}`;
}

/** Replace a verbatim plain-text substring inside HTML draft, preserving block structure. */
export function replaceTargetTextInHtml(
  html: string,
  targetText: string,
  replacement: string,
): string {
  const plain = htmlToPlainText(html);
  if (!plain.includes(targetText)) return html;

  const updatedPlain = plain.replace(targetText, replacement.trim());
  return normalizeDraftContent(updatedPlain);
}

export function insertPlainTextAtEnd(html: string, text: string): string {
  return appendHtmlParagraph(html, text);
}
