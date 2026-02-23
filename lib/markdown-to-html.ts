/**
 * Converts a Markdown string to an HTML document body suitable for upload
 * to Google Drive as a Google Doc (mimeType: text/html).
 *
 * Supports: headings (h1–h3), unordered lists, bold, italic, paragraphs.
 */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const blocks: string[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length > 0) {
      blocks.push(`<ul>${listItems.join("")}</ul>`);
      listItems = [];
    }
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3}) (.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${escapeHtml(headingMatch[2])}</h${level}>`);
      continue;
    }

    const listMatch = line.match(/^[-*] (.+)/);
    if (listMatch) {
      listItems.push(`<li>${inlineFormat(escapeHtml(listMatch[1]))}</li>`);
      continue;
    }

    flushList();

    if (line.trim() !== "") {
      blocks.push(`<p>${inlineFormat(escapeHtml(line))}</p>`);
    }
  }

  flushList();

  return `<html><body>${blocks.join("")}</body></html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}
