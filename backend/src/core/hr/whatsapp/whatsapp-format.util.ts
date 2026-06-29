/**
 * Normalize LLM markdown for WhatsApp Cloud API text formatting.
 * WA supports: *bold* _italic_ ~strikethrough~ — NOT **bold** or markdown tables.
 */
export function formatForWhatsApp(text: string): string {
  if (!text) return text;

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const processed: string[] = [];

  for (const line of lines) {
    const tableLine = convertTableRow(line);
    if (tableLine === null) continue;
    processed.push(tableLine);
  }

  let out = processed.join('\n');

  // **bold** → *bold*
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '*$1*');
  // __italic__ → _italic_
  out = out.replace(/__([^_\n]+)__/g, '_$1_');
  // ~~strike~~ → ~strike~
  out = out.replace(/~~([^~\n]+)~~/g, '~$1~');

  // Remove markdown headings (# ## ###) — keep text
  out = out.replace(/^#{1,6}\s+/gm, '');

  // Remove horizontal rules
  out = out.replace(/^-{3,}\s*$/gm, '');

  // Clean zero-width / odd spacing after bullets (•⁠  ⁠)
  out = out.replace(/•[\s\u200B-\u200D\uFEFF\u2060]+/g, '• ');

  // Collapse excessive blank lines
  out = out.replace(/\n{3,}/g, '\n\n').trim();

  return out;
}

/** Convert a markdown table row to plain text; return null to skip separator rows. */
function convertTableRow(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return '';

  if (/^\|?[-:\s|]+\|?$/.test(trimmed)) {
    return null;
  }

  if (trimmed.includes('|')) {
    const cells = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cells.length >= 2) {
      return `• ${cells[0]}: ${cells.slice(1).join(' — ')}`;
    }
    if (cells.length === 1) {
      return `• ${cells[0]}`;
    }
  }

  return line;
}
