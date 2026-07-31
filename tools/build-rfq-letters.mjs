/**
 * Converts the BB-RFQ enquiry letters from markdown to editable Word files.
 *
 *   node tools/build-rfq-letters.mjs [outdir]
 *
 * Writes one .docx per letter to dist/rfq/ (default). The Word files are
 * meant to be edited before sending: drop in the letterhead, fill the
 * supplier name, date and due date, then print or attach to an email.
 *
 * Requires `marked` and `html-to-docx` (npm install).
 *
 * Note: LibreOffice was tried first and cannot load any source file in this
 * environment, so conversion is done in pure JS instead.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import htmlToDocx from "html-to-docx";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "docs", "rfq");
const OUT = process.argv[2] || join(ROOT, "dist", "rfq");

mkdirSync(OUT, { recursive: true });

const CSS = `
body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.4; }
h1 { font-family: Arial, sans-serif; font-size: 15pt; margin: 0 0 4pt 0; }
h2 { font-family: Arial, sans-serif; font-size: 12pt; margin: 14pt 0 4pt 0; }
h3 { font-family: Arial, sans-serif; font-size: 11pt; margin: 12pt 0 3pt 0; }
p  { margin: 0 0 8pt 0; }
li { margin-bottom: 2pt; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt 0; font-size: 10pt; }
th, td { border: 1px solid #999999; padding: 4pt 6pt; text-align: left; vertical-align: top; }
th { background-color: #eeeeee; font-family: Arial, sans-serif; font-size: 9pt; }
code { font-family: Courier New, monospace; font-size: 10pt; }
`;

const DOCX_OPTIONS = {
  orientation: "portrait",
  margins: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // 20 mm
  title: "BlueBloom Spirulina — Request for Quotation",
  creator: "BlueBloom Spirulina Private Limited",
  table: { row: { cantSplit: true } },
  footer: true,
  pageNumber: true,
};

const files = readdirSync(SRC).filter((f) => f.endsWith(".md")).sort();
if (!files.length) {
  console.error(`No markdown letters found in ${SRC}`);
  process.exit(1);
}

console.log(`Converting ${files.length} enquiry letters…`);

for (const f of files) {
  const md = readFileSync(join(SRC, f), "utf8");
  const body = marked.parse(md, { gfm: true });
  const html =
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<title>${basename(f, ".md")}</title><style>${CSS}</style></head>` +
    `<body>${body}</body></html>`;

  const buf = await htmlToDocx(html, null, DOCX_OPTIONS);
  writeFileSync(join(OUT, basename(f, ".md") + ".docx"), buf);
}

const made = readdirSync(OUT).filter((f) => f.endsWith(".docx")).sort();
console.log(`\nWrote ${made.length} Word files to ${OUT}`);
for (const f of made) console.log(`  ${f}`);

if (made.length !== files.length) {
  console.error(
    `\nWARNING: ${files.length} letters in but only ${made.length} Word files out.`
  );
  process.exit(1);
}
