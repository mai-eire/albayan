import { generateHTML, generateJSON } from "@tiptap/html";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";

// What the school rules may contain: paragraphs, headings, bold, italic, lists and links.
// The editor and the server share this list, so what is stored is exactly what the editor
// could have produced — pasted text from Google Docs keeps its structure and nothing else.
export const rulesExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    link: false,
  }),
  Link.configure({ openOnClick: false, protocols: ["https", "http", "mailto"] }),
];

// Runs HTML through the schema and back: unknown tags, attributes, styles and scripts fall
// away. Also the read path for rules saved as plain text before the editor existed.
export function cleanRulesHtml(stored: string | null): string {
  if (!stored?.trim()) return "";
  const html = stored.trimStart().startsWith("<")
    ? stored
    : stored
        .split(/\n\s*\n/)
        .map((p) => `<p>${escape(p.trim()).replace(/\n/g, "<br>")}</p>`)
        .join("");
  const json = generateJSON(html, rulesExtensions);
  const out = generateHTML(json, rulesExtensions);
  return out === "<p></p>" ? "" : out;
}

function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
