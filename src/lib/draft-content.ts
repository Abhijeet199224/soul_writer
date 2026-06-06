/** Helpers for TipTap HTML draft storage vs plain-text AI/character APIs */

export function htmlToPlainText(content: string): string {
  if (!content?.trim()) return "";
  if (!isHtmlContent(content)) return content;
  if (typeof document === "undefined") {
    return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const doc = new DOMParser().parseFromString(content, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
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
