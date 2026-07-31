/**
 * Builds a self-contained, browsable HTML reader for the project documents.
 *
 *   node tools/build-docs-viewer.mjs [outfile] [id ...]
 *
 * With no ids, every document is included (the internal reader).
 * With ids, only those are built. The public website build carries the
 * production manual WITHOUT the design criteria volumes:
 *
 *   node tools/build-docs-viewer.mjs site/manual/index.html ops
 *
 * Reading model: the document is split into sections at each `##` heading.
 * One section is shown at a time, with previous/next, so nobody has to scroll
 * a 1,400-line document to find anything. Sections are grouped under their
 * `# PART` heading where the source has them.
 *
 * Requires `marked` at build time only:  npm i marked
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || join(ROOT, "docs-viewer.html");
const ONLY = process.argv.slice(3);

const ALL_DOCS = [
  {
    id: "ops",
    tab: "Production Manual",
    number: "BB-OPS-001",
    title: "Spirulina Production Manual",
    blurb:
      "What spirulina is, how to grow it, how to harvest and process it, and what to do when something goes wrong.",
    file: "docs/BB-OPS-001_Spirulina-Production-Manual.md",
  },
  {
    id: "v1",
    tab: "Design Vol 1",
    number: "BB-DBR-002-V1",
    title: "General Design Criteria",
    blurb: "The overarching engineering standard for the facility.",
    file: "docs/BB-DBR-002-V1_Design-Criteria-Manual_Vol1_General-Design-Criteria.md",
  },
  {
    id: "v2",
    tab: "Design Vol 2",
    number: "BB-DBR-002-V2",
    title: "Process Engineering",
    blurb: "Capacities, balances and equipment duties.",
    file: "docs/BB-DBR-002-V2_Design-Criteria-Manual_Vol2_Process-Engineering.md",
  },
  {
    id: "v3",
    tab: "Design Vol 3",
    number: "BB-DBR-002-V3",
    title: "Civil, Structural and Layout",
    blurb: "Site, ponds, lining, structures and buildings.",
    file: "docs/BB-DBR-002-V3_Design-Criteria-Manual_Vol3_Civil-Structural-Layout.md",
  },
];

const DOCS = ONLY.length ? ALL_DOCS.filter((d) => ONLY.includes(d.id)) : ALL_DOCS;
if (ONLY.length && DOCS.length !== ONLY.length) {
  const missing = ONLY.filter((id) => !ALL_DOCS.some((d) => d.id === id));
  throw new Error("build-docs-viewer: unknown document id(s): " + missing.join(", "));
}
const PUBLIC = ONLY.length > 0;

/**
 * Enquiry contact. Set ENQUIRY_EMAIL to the real address and every enquiry
 * button across the reader becomes live. Left empty, the panel states that
 * details are being finalised rather than linking somewhere that bounces.
 */
const ENQUIRY_EMAIL = "jandhyalaspirulina@outlook.com";
const ENQUIRY_LINES = [
  "BlueBloom Spirulina Private Limited",
  "Hyderabad Region, Telangana, India",
];

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const slug = (s) =>
  s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 50);

/**
 * Split one document into parts and sections.
 * A `# PART …` heading opens a part; every `##` heading opens a section.
 * Content before the first `##` becomes an "About this document" section so
 * nothing is silently dropped.
 */
function parseDoc(doc) {
  const md = readFileSync(join(ROOT, doc.file), "utf8");
  const tokens = marked.lexer(md);

  const parts = [];
  let part = null;
  let section = null;
  let front = [];
  let seenTitle = false;

  const openPart = (title) => {
    part = { title, sections: [], intro: [] };
    parts.push(part);
  };
  const openSection = (title) => {
    if (!part) openPart(null);
    section = { title, tokens: [] };
    part.sections.push(section);
  };

  for (const t of tokens) {
    if (t.type === "heading" && t.depth === 1) {
      if (!seenTitle) { seenTitle = true; front.push(t); continue; }
      openPart(t.text.trim());
      section = null;
      continue;
    }
    if (t.type === "heading" && t.depth === 2) {
      openSection(t.text);
      continue;
    }
    if (section) section.tokens.push(t);
    else if (part) part.intro.push(t);
    else front.push(t);
  }

  // Front matter becomes the first section of the first part. Where that part
  // is the implicit one (no `# PART` heading), give it a name so it does not
  // render as an untitled card.
  if (front.length) {
    const intro = { title: "About this document", tokens: front };
    if (!parts.length) openPart(null);
    parts[0].sections.unshift(intro);
  }
  if (parts.length && !parts[0].title) {
    parts[0].title = parts.length > 1 ? "Start here" : "Contents";
    parts[0].lead =
      parts.length > 1
        ? "What this manual covers, how it differs from the design criteria, and where to look for what."
        : "";
  }
  // Chapter description: the prose between the chapter heading and its first
  // section, flattened to plain text for the home card.
  for (const p of parts) {
    p.blurb =
      (p.intro || [])
        .filter((x) => x.type === "paragraph")
        .map((x) => x.text.replace(/[*_`]/g, "").replace(/\s+/g, " ").trim())
        .join(" ") || p.lead || "";
  }

  // Render, assign ids, flatten
  const flat = [];
  const seen = new Map();
  for (const p of parts) {
    for (const s of p.sections) {
      let id = doc.id + "-" + slug(s.title);
      const n = (seen.get(id) || 0) + 1;
      seen.set(id, n);
      if (n > 1) id += "-" + n;
      s.id = id;
      s.part = p.title;
      let html = marked.parser(s.tokens);
      html = html.replace(/<table>/g, '<div class="tw"><table>')
                 .replace(/<\/table>/g, "</table></div>");
      // Sub-headings inside a section get ids so the section outline can link
      html = html.replace(/<h3>(.*?)<\/h3>/g, (m, txt) => {
        const plain = txt.replace(/<[^>]+>/g, "");
        return '<h3 id="' + id + "-" + slug(plain) + '">' + txt + "</h3>";
      });
      s.html = html;
      s.subs = [...html.matchAll(/<h3 id="([^"]+)">(.*?)<\/h3>/g)].map((m) => ({
        id: m[1],
        text: m[2].replace(/<[^>]+>/g, ""),
      }));
      flat.push(s);
    }
  }

  return { ...doc, parts, flat };
}

const docs = DOCS.map(parseDoc);

/* ---------- HTML fragments ---------- */

const navFor = (d) => {
  const out = [];
  for (const p of d.parts) {
    if (p.title) out.push('<div class="navpart">' + esc(p.title) + "</div>");
    for (const s of p.sections) {
      out.push(
        '<a class="navsec" href="#' + s.id + '" data-sec="' + s.id + '">' +
        esc(s.title) + "</a>"
      );
    }
  }
  return out.join("\n");
};

const homeFor = (d) => {
  const cards = [];
  for (const p of d.parts) {
    const first = p.sections[0];
    cards.push(
      '<button class="card" data-sec="' + first.id + '">' +
        (p.title ? '<span class="card-part">' + esc(p.title) + "</span>" : "") +
        (p.blurb ? '<span class="card-blurb">' + esc(p.blurb) + "</span>" : "") +
        '<span class="card-list">' +
          p.sections.map((s) => esc(s.title)).join(" · ") +
        "</span>" +
        '<span class="card-go">' + p.sections.length + " section" +
          (p.sections.length === 1 ? "" : "s") + " →</span>" +
      "</button>"
    );
  }
  return (
    '<div class="home" id="home-' + d.id + '">' +
      '<p class="kicker">' + esc(d.number) + "</p>" +
      "<h1>" + esc(d.title) + "</h1>" +
      '<p class="blurb">' + esc(d.blurb) + "</p>" +
      '<p class="hint">Pick a chapter below, use the contents list, or press ' +
        "<kbd>/</kbd> to search the whole document.</p>" +
      '<div class="cards">' + cards.join("\n") + "</div>" +
      (PUBLIC ? enquiryPanel() : "") +
    "</div>"
  );
};

const mailto = (subject) =>
  ENQUIRY_EMAIL
    ? 'mailto:' + ENQUIRY_EMAIL + '?subject=' + encodeURIComponent(subject)
    : "";

const enquiryRow = (title, body, subject) =>
  '<div class="enq-item">' +
    "<h3>" + esc(title) + "</h3>" +
    "<p>" + esc(body) + "</p>" +
    (ENQUIRY_EMAIL
      ? '<a class="enq-btn" href="' + mailto(subject) + '">Enquire →</a>'
      : "") +
  "</div>";

const enquiryPanel = () =>
  '<section class="enq" id="enquiries">' +
    '<p class="kicker">Enquiries</p>' +
    "<h2>Talk to us</h2>" +
    '<p class="enq-lede">We are in engineering on our first acre near Hyderabad, ' +
      "and we are having early conversations now — with buyers, with suppliers, " +
      "and with people who simply want to grow spirulina themselves.</p>" +
    '<div class="enq-grid">' +
      enquiryRow(
        "Buying spirulina",
        "Bulk food-grade powder, retail and private-label packing, tablets, or material for your own formulation. Tell us volume, form, specification and when you would want first delivery.",
        "Purchase enquiry — BlueBloom Spirulina") +
      enquiryRow(
        "Samples",
        "Once Stage 1 is producing we will send samples with a certificate of analysis against the specification in this manual. Register your interest now and we will come to you.",
        "Sample request — BlueBloom Spirulina") +
      enquiryRow(
        "Supplying us",
        "Equipment, materials, nutrients, laboratory services and construction. Thirteen packages are out to enquiry; tell us which you supply and we will send the documents.",
        "Supplier enquiry — BlueBloom Spirulina") +
      enquiryRow(
        "Growing it yourself",
        "This manual is published openly because the knowledge is worth sharing. If you are setting up your own cultivation and something here is unclear or wrong, we would genuinely like to hear.",
        "Question about the production manual") +
    "</div>" +
    '<div class="enq-foot">' +
      (ENQUIRY_EMAIL
        ? '<a class="enq-mail" href="' + mailto("Enquiry — BlueBloom Spirulina") + '">' +
          esc(ENQUIRY_EMAIL) + "</a>"
        : '<b>Contact details are being finalised.</b>' +
          "<span>Our enquiry address will be published here shortly.</span>") +
      ENQUIRY_LINES.map((l) => "<span>" + esc(l) + "</span>").join("") +
    "</div>" +
  "</section>";

const sectionsFor = (d) =>
  d.flat
    .map((s, i) => {
      const prev = d.flat[i - 1];
      const next = d.flat[i + 1];
      const outline = s.subs.length
        ? '<nav class="outline"><span>In this section</span>' +
          s.subs.map((x) => '<a href="#' + x.id + '">' + esc(x.text) + "</a>").join("") +
          "</nav>"
        : "";
      const nav =
        '<nav class="pager">' +
        (prev
          ? '<button class="pg" data-sec="' + prev.id + '"><span>← Previous</span><b>' +
            esc(prev.title) + "</b></button>"
          : '<span class="pg empty"></span>') +
        (next
          ? '<button class="pg next" data-sec="' + next.id + '"><span>Next →</span><b>' +
            esc(next.title) + "</b></button>"
          : '<span class="pg empty"></span>') +
        "</nav>";
      return (
        '<article class="sec" id="sec-' + s.id + '">' +
          '<p class="crumb">' +
            '<button class="crumb-home" data-home="' + d.id + '">' + esc(d.title) + "</button>" +
            (s.part ? '<span class="crumb-sep">›</span><span>' + esc(s.part) + "</span>" : "") +
            '<span class="crumb-pos">' + (i + 1) + " of " + d.flat.length + "</span>" +
          "</p>" +
          "<h1>" + esc(s.title) + "</h1>" +
          outline +
          '<div class="body">' + s.html + "</div>" +
          nav +
        "</article>"
      );
    })
    .join("\n");

const CSS = `
:root{
  --ground:#ECEFEA;--paper:#F7F9F5;--ink:#06201E;--ink-soft:#22423C;
  --muted:#5D6F69;--phyco:#1160C4;--phyco-lt:#57A0F0;
  --line:rgba(6,32,30,.14);--line-soft:rgba(6,32,30,.07);--warn:rgba(17,96,196,.07);
  --serif:"Iowan Old Style","Palatino Linotype",Palatino,Charter,Georgia,serif;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --mono:ui-monospace,SFMono-Regular,"SF Mono","Cascadia Mono",Menlo,Consolas,monospace;
}
@media (prefers-color-scheme:dark){:root{
  --ground:#071110;--paper:#0C1A18;--ink:#E4EDE8;--ink-soft:#C2D2CC;--muted:#91A69E;
  --phyco:#5CA3F5;--phyco-lt:#8CC2FF;--line:rgba(228,237,232,.15);
  --line-soft:rgba(228,237,232,.07);--warn:rgba(92,163,245,.09);}}
:root[data-theme=dark]{--ground:#071110;--paper:#0C1A18;--ink:#E4EDE8;--ink-soft:#C2D2CC;
  --muted:#91A69E;--phyco:#5CA3F5;--phyco-lt:#8CC2FF;--line:rgba(228,237,232,.15);
  --line-soft:rgba(228,237,232,.07);--warn:rgba(92,163,245,.09);}
:root[data-theme=light]{--ground:#ECEFEA;--paper:#F7F9F5;--ink:#06201E;--ink-soft:#22423C;
  --muted:#5D6F69;--phyco:#1160C4;--phyco-lt:#57A0F0;--line:rgba(6,32,30,.14);
  --line-soft:rgba(6,32,30,.07);--warn:rgba(17,96,196,.07);}

*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);
  font-size:1.02rem;line-height:1.65;-webkit-font-smoothing:antialiased}
::selection{background:var(--phyco);color:#fff}
:focus-visible{outline:2px solid var(--phyco);outline-offset:2px;border-radius:3px}
kbd{font-family:var(--mono);font-size:.8em;border:1px solid var(--line);border-radius:3px;
  padding:.05em .35em;background:var(--paper)}

/* ---- top bar ---- */
.bar{position:sticky;top:0;z-index:60;background:var(--ground);
  border-bottom:1px solid var(--line)}
.bar-in{display:flex;align-items:center;gap:.75rem;height:3.5rem;
  padding-inline:1rem;max-width:90rem;margin-inline:auto}
.brand{display:flex;align-items:center;gap:.5rem;font-family:var(--serif);
  font-size:1.02rem;white-space:nowrap;cursor:pointer;background:none;border:0;
  color:inherit;padding:0}
.brand::before{content:"";width:.5rem;height:.5rem;border-radius:50%;
  background:var(--phyco);flex:none}
.brand b{font-weight:600}
.spacer{margin-left:auto}
.docsel{font-family:var(--mono);font-size:.78rem;padding:.4rem .5rem;
  border:1px solid var(--line);border-radius:3px;background:var(--paper);color:var(--ink)}
.iconbtn{display:inline-flex;align-items:center;gap:.4rem;font-family:var(--mono);
  font-size:.78rem;background:var(--paper);border:1px solid var(--line);color:var(--ink);
  border-radius:3px;padding:.45rem .7rem;cursor:pointer;white-space:nowrap}
.iconbtn:hover{border-color:var(--phyco);color:var(--phyco)}

/* ---- shell ---- */
.shell{display:grid;grid-template-columns:18rem minmax(0,1fr);gap:3rem;
  max-width:90rem;margin-inline:auto;padding:0 1.25rem 6rem}
.side{position:sticky;top:3.5rem;align-self:start;height:calc(100dvh - 3.5rem);
  overflow-y:auto;padding:1.25rem .75rem 3rem 0;border-right:1px solid var(--line-soft)}
.navpart{font-family:var(--serif);font-size:.95rem;font-weight:600;color:var(--phyco);
  margin:1.5rem 0 .45rem;padding-left:.6rem;line-height:1.3}
.navpart:first-child{margin-top:0}
.navsec{display:block;text-decoration:none;color:var(--ink-soft);font-size:.87rem;
  line-height:1.35;padding:.5rem .6rem;border-left:2px solid transparent;border-radius:0 3px 3px 0}
.navsec:hover{background:var(--paper);color:var(--ink)}
.navsec.on{color:var(--phyco);border-left-color:var(--phyco);background:var(--paper);font-weight:500}

main{min-width:0;padding-top:2rem}

/* ---- home ---- */
.home{display:none}
.home.on{display:block}
.kicker{font-family:var(--mono);font-size:.72rem;letter-spacing:.14em;
  text-transform:uppercase;color:var(--muted);margin:0 0 .5rem}
.home h1{font-family:var(--serif);font-size:2.3rem;line-height:1.1;margin:0 0 .75rem;
  letter-spacing:-.02em;max-width:20ch}
.blurb{font-size:1.15rem;color:var(--ink-soft);max-width:40em;margin:0 0 .75rem}
.hint{font-size:.9rem;color:var(--muted);margin:0 0 2rem}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(20rem,1fr));gap:1px;
  background:var(--line);border:1px solid var(--line);border-radius:3px;overflow:hidden}
.card{display:flex;flex-direction:column;gap:.6rem;align-items:flex-start;text-align:left;
  background:var(--ground);border:0;padding:1.5rem 1.4rem;cursor:pointer;
  color:inherit;font:inherit;transition:background .15s}
.card:hover{background:var(--paper)}
.card-part{font-family:var(--serif);font-size:1.35rem;font-weight:600;line-height:1.25;
  letter-spacing:-.01em}
.card-blurb{font-size:.94rem;color:var(--ink-soft);line-height:1.55}
.card-list{font-size:.8rem;color:var(--muted);line-height:1.5;padding-top:.35rem;
  border-top:1px solid var(--line-soft);width:100%}
.card-go{font-family:var(--mono);font-size:.72rem;letter-spacing:.06em;color:var(--phyco);
  margin-top:auto;padding-top:.5rem}

/* ---- live diagrams ---- */
figure.diagram{margin:1.75rem 0;padding:0;border:1px solid var(--line);border-radius:3px;
  overflow:hidden;background:var(--paper)}
.diagram-canvas{display:block;width:100%;height:clamp(210px,26vw,300px)}
figure.diagram figcaption{padding:.8rem 1rem;font-size:.86rem;line-height:1.5;
  color:var(--ink-soft);border-top:1px solid var(--line-soft);background:var(--ground)}

/* ---- enquiries ---- */
.enq{margin-top:4rem;padding-top:2.5rem;border-top:1px solid var(--line)}
.enq h2{font-family:var(--serif);font-size:1.9rem;line-height:1.15;margin:0 0 .6rem;
  letter-spacing:-.018em}
.enq-lede{font-size:1.05rem;color:var(--ink-soft);max-width:42em;margin:0 0 2rem}
/* fixed two columns: auto-fit leaves an empty cell when the item count is
   not a multiple of the column count, and the grid gap shows through it */
.enq-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;
  background:var(--line);border:1px solid var(--line);border-radius:3px;overflow:hidden}
@media (max-width:640px){.enq-grid{grid-template-columns:minmax(0,1fr)}}
.enq-item{background:var(--ground);padding:1.4rem 1.3rem;display:flex;flex-direction:column;
  gap:.55rem}
.enq-item h3{font-family:var(--serif);font-size:1.18rem;font-weight:600;margin:0;line-height:1.25}
.enq-item p{margin:0;font-size:.92rem;color:var(--ink-soft);line-height:1.55}
.enq-btn{margin-top:auto;padding-top:.5rem;font-family:var(--mono);font-size:.75rem;
  letter-spacing:.06em;color:var(--phyco);text-decoration:none}
.enq-btn:hover{text-decoration:underline}
.enq-foot{margin-top:1.75rem;font-family:var(--mono);font-size:.8rem;color:var(--muted);
  line-height:1.9;display:flex;flex-direction:column}
.enq-foot b{color:var(--ink);font-weight:500}
.enq-mail{color:var(--phyco);text-decoration:none;font-size:.9rem}
.enq-mail:hover{text-decoration:underline}

/* ---- section ---- */
.sec{display:none}
.sec.on{display:block}
.sec>*{max-width:46rem}
.sec .tw{max-width:100%}
.crumb{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;font-family:var(--mono);
  font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);
  margin:0 0 .75rem}
.crumb-home{background:none;border:0;padding:0;font:inherit;color:var(--phyco);cursor:pointer}
.crumb-home:hover{text-decoration:underline}
.crumb-sep{opacity:.5}
.crumb-pos{margin-left:auto;opacity:.8}
.sec h1{font-family:var(--serif);font-size:2rem;line-height:1.15;margin:0 0 1.25rem;
  letter-spacing:-.018em;text-wrap:balance}
.outline{display:flex;flex-wrap:wrap;gap:.4rem .9rem;padding:.85rem 1rem;margin:0 0 1.75rem;
  background:var(--paper);border:1px solid var(--line-soft);border-radius:3px}
.outline span{font-family:var(--mono);font-size:.68rem;letter-spacing:.12em;
  text-transform:uppercase;color:var(--muted);width:100%}
.outline a{font-size:.85rem;color:var(--phyco);text-decoration:none}
.outline a:hover{text-decoration:underline}

.body h3{font-family:var(--serif);font-size:1.25rem;margin:2.2rem 0 .6rem;
  scroll-margin-top:4.5rem;letter-spacing:-.01em}
.body h4{font-family:var(--serif);font-size:1.05rem;margin:1.5rem 0 .4rem}
.body p{margin:0 0 1.05rem}
.body ul,.body ol{margin:0 0 1.15rem;padding-left:1.4rem}
.body li{margin-bottom:.35rem}
.body hr{border:0;border-top:1px solid var(--line-soft);margin:2rem 0}
.body a{color:var(--phyco)}
.body code{font-family:var(--mono);font-size:.87em;background:var(--paper);
  padding:.1rem .32rem;border-radius:3px}
.body pre{background:var(--paper);border:1px solid var(--line-soft);border-radius:3px;
  padding:.9rem 1rem;overflow-x:auto}
.body pre code{background:none;padding:0}
.body blockquote{margin:0 0 1rem;padding-left:1rem;border-left:2px solid var(--line);
  color:var(--ink-soft)}
/* a paragraph that is entirely bold is a callout in these documents */
.body p:has(>strong:only-child){background:var(--warn);border-left:3px solid var(--phyco);
  padding:.9rem 1.1rem;margin-bottom:1.3rem;border-radius:0 3px 3px 0}

.tw{overflow-x:auto;margin:0 0 1.5rem;border:1px solid var(--line);border-radius:3px}
table{border-collapse:collapse;width:100%;min-width:28rem;font-size:.88rem;
  font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:.6rem .85rem;border-bottom:1px solid var(--line-soft);
  vertical-align:top}
thead th{background:var(--paper);font-family:var(--mono);font-size:.68rem;
  letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:400}
tbody tr:last-child td{border-bottom:0}

.pager{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:3.5rem;
  padding-top:1.5rem;border-top:1px solid var(--line)}
.pg{display:flex;flex-direction:column;gap:.25rem;align-items:flex-start;text-align:left;
  background:var(--paper);border:1px solid var(--line);border-radius:3px;padding:.9rem 1rem;
  cursor:pointer;color:inherit;font:inherit;transition:border-color .15s}
.pg:hover{border-color:var(--phyco)}
.pg.next{align-items:flex-end;text-align:right}
.pg span{font-family:var(--mono);font-size:.7rem;letter-spacing:.08em;color:var(--phyco)}
.pg b{font-weight:500;font-size:.92rem;line-height:1.3}
.pg.empty{background:none;border:0}

/* ---- search ---- */
.searchwrap{display:none;position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.4);
  padding:4rem 1rem 1rem;overflow-y:auto}
.searchwrap.on{display:block}
.searchbox{max-width:44rem;margin-inline:auto;background:var(--ground);
  border:1px solid var(--line);border-radius:5px;overflow:hidden;
  box-shadow:0 20px 60px rgba(0,0,0,.3)}
.searchbox input{width:100%;font-family:var(--sans);font-size:1.05rem;padding:1.1rem 1.2rem;
  border:0;border-bottom:1px solid var(--line);background:var(--ground);color:var(--ink)}
.searchbox input:focus{outline:0}
.results{max-height:60vh;overflow-y:auto}
.result{display:block;width:100%;text-align:left;background:none;border:0;
  border-bottom:1px solid var(--line-soft);padding:.85rem 1.2rem;cursor:pointer;
  color:inherit;font:inherit}
.result:hover,.result.sel{background:var(--paper)}
.result b{display:block;font-weight:600;font-size:.95rem;margin-bottom:.2rem}
.result i{font-style:normal;font-family:var(--mono);font-size:.68rem;letter-spacing:.08em;
  text-transform:uppercase;color:var(--muted);display:block;margin-bottom:.3rem}
.result small{display:block;font-size:.85rem;color:var(--ink-soft);line-height:1.45}
.result mark{background:var(--phyco);color:#fff;border-radius:2px;padding:0 .15em}
.searchfoot{padding:.6rem 1.2rem;font-family:var(--mono);font-size:.7rem;color:var(--muted);
  border-top:1px solid var(--line-soft)}

/* ---- responsive ---- */
@media (max-width:940px){
  .shell{grid-template-columns:minmax(0,1fr);gap:0}
  .side{position:fixed;inset:3.5rem 0 0 auto;width:min(22rem,88vw);z-index:70;
    background:var(--ground);border-left:1px solid var(--line);border-right:0;
    padding:1.25rem 1rem 3rem;transform:translateX(101%);transition:transform .22s;
    box-shadow:-10px 0 40px rgba(0,0,0,.18)}
  .side.open{transform:translateX(0)}
  .navsec{padding:.7rem .6rem;font-size:.92rem}
  main{padding-top:1.5rem}
  .pager{grid-template-columns:1fr}
  .home h1{font-size:1.8rem}
  .sec h1{font-size:1.55rem}
}
@media (max-width:560px){
  .bar-in{padding-inline:.85rem;gap:.5rem}
  .shell{padding-inline:.85rem}
  .brand span{display:none}
  .iconbtn{padding:.45rem .6rem}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
html{scroll-behavior:smooth}

@media print{
  .bar,.side,.pager,.outline,.crumb,.searchwrap{display:none!important}
  .shell{display:block;padding:0;max-width:none}
  main{padding:0}
  .sec,.home{display:block!important}
  .sec>*{max-width:none}
  body{background:#fff;color:#000;font-size:10.5pt}
  .tw,table,tr{break-inside:avoid}
}
`;

const page =
  "<title>" +
  (PUBLIC ? esc(docs[0].title) + " — BlueBloom" : "BlueBloom — Project Documents") +
  "</title>\n<style>" + CSS + "</style>\n" +
  '<header class="bar"><div class="bar-in">' +
    '<button class="brand" id="brandBtn"><b>' +
      (PUBLIC ? "BlueBloom" : "BlueBloom") + "</b> <span>" +
      (PUBLIC ? esc(docs[0].title) : "Project Documents") + "</span></button>" +
    '<span class="spacer"></span>' +
    (docs.length > 1
      ? '<select class="docsel" id="docsel" aria-label="Document">' +
        docs.map((d) => '<option value="' + d.id + '">' + esc(d.tab) + "</option>").join("") +
        "</select>"
      : "") +
    '<button class="iconbtn" id="searchBtn">Search <kbd>/</kbd></button>' +
    '<button class="iconbtn" id="menuBtn" aria-expanded="false">Contents</button>' +
  "</div></header>\n" +
  '<div class="shell">' +
    '<aside class="side" id="side"><nav id="nav"></nav></aside>' +
    "<main>" +
      docs.map(homeFor).join("\n") +
      docs.map(sectionsFor).join("\n") +
    "</main>" +
  "</div>\n" +
  '<div class="searchwrap" id="searchWrap"><div class="searchbox">' +
    '<input id="searchInput" type="search" placeholder="Search the whole document…" autocomplete="off">' +
    '<div class="results" id="results"></div>' +
    '<div class="searchfoot">↑ ↓ to move · Enter to open · Esc to close</div>' +
  "</div></div>\n" +
  "<script>\n" + SCRIPT() + "\n</script>\n" +
  "<script>\n" + readFileSync(join(ROOT, "tools/diagrams.js"), "utf8") + "\n</script>\n";

function SCRIPT() {
  const NAV = {};
  const ORDER = {};
  for (const d of docs) {
    NAV[d.id] = navFor(d);
    ORDER[d.id] = d.flat.map((s) => ({ id: s.id, title: s.title, part: s.part || "" }));
  }
  return `
(function(){
  var NAV = ${JSON.stringify(NAV)};
  var ORDER = ${JSON.stringify(ORDER)};
  var DOCS = ${JSON.stringify(docs.map((d) => d.id))};
  var doc = DOCS[0], cur = null;

  var nav = document.getElementById('nav');
  var side = document.getElementById('side');
  var menuBtn = document.getElementById('menuBtn');
  var searchBtn = document.getElementById('searchBtn');
  var searchWrap = document.getElementById('searchWrap');
  var searchInput = document.getElementById('searchInput');
  var results = document.getElementById('results');
  var docsel = document.getElementById('docsel');

  function closeSide(){ side.classList.remove('open'); menuBtn.setAttribute('aria-expanded','false'); }

  function showHome(id){
    doc = id; cur = null;
    document.querySelectorAll('.home').forEach(function(h){ h.classList.toggle('on', h.id === 'home-'+id); });
    document.querySelectorAll('.sec').forEach(function(s){ s.classList.remove('on'); });
    nav.innerHTML = NAV[id];
    closeSide(); window.scrollTo(0,0);
    if (window.refreshDiagrams) window.refreshDiagrams();
    if (history.replaceState) history.replaceState(null,'','#'+id);
  }

  function showSec(secId, anchor){
    var owner = null;
    for (var k in ORDER) if (ORDER[k].some(function(s){ return s.id === secId; })) owner = k;
    if (!owner) return;
    if (owner !== doc) { doc = owner; nav.innerHTML = NAV[doc]; if (docsel) docsel.value = doc; }
    cur = secId;
    document.querySelectorAll('.home').forEach(function(h){ h.classList.remove('on'); });
    document.querySelectorAll('.sec').forEach(function(s){ s.classList.toggle('on', s.id === 'sec-'+secId); });
    nav.querySelectorAll('.navsec').forEach(function(a){ a.classList.toggle('on', a.dataset.sec === secId); });
    var on = nav.querySelector('.navsec.on');
    if (on && on.scrollIntoView) on.scrollIntoView({block:'nearest'});
    closeSide();
    if (window.refreshDiagrams) window.refreshDiagrams();
    if (anchor) {
      requestAnimationFrame(function(){ requestAnimationFrame(function(){
        var el = document.getElementById(anchor); if (el) el.scrollIntoView();
      });});
    } else window.scrollTo(0,0);
    if (history.replaceState) history.replaceState(null,'','#'+secId);
  }

  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-sec]');
    if (t) { e.preventDefault(); showSec(t.dataset.sec); return; }
    var h = e.target.closest('[data-home]');
    if (h) { e.preventDefault(); showHome(h.dataset.home); return; }
  });

  document.getElementById('brandBtn').addEventListener('click', function(){ showHome(doc); });
  menuBtn.addEventListener('click', function(){
    var open = side.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  if (docsel) docsel.addEventListener('change', function(){ showHome(docsel.value); });

  /* ---- search over the rendered sections ---- */
  var sel = 0, hits = [];

  function openSearch(){
    searchWrap.classList.add('on'); searchInput.focus(); searchInput.select();
  }
  function closeSearch(){ searchWrap.classList.remove('on'); }

  searchBtn.addEventListener('click', openSearch);
  searchWrap.addEventListener('click', function(e){ if (e.target === searchWrap) closeSearch(); });

  function snippet(text, q){
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return text.slice(0,140) + '…';
    var s = Math.max(0, i - 60), e = Math.min(text.length, i + q.length + 90);
    var pre = text.slice(s, i), hit = text.slice(i, i+q.length), post = text.slice(i+q.length, e);
    var esc = function(x){ return x.replace(/&/g,'&amp;').replace(/</g,'&lt;'); };
    return (s>0?'…':'') + esc(pre) + '<mark>' + esc(hit) + '</mark>' + esc(post) + (e<text.length?'…':'');
  }

  function runSearch(){
    var q = searchInput.value.trim().toLowerCase();
    hits = []; sel = 0;
    if (q.length < 2) {
      results.innerHTML = '<div class="searchfoot">Type at least two characters.</div>';
      return;
    }
    DOCS.forEach(function(d){
      ORDER[d].forEach(function(s){
        var el = document.getElementById('sec-' + s.id);
        if (!el) return;
        var text = el.querySelector('.body') ? el.querySelector('.body').innerText : '';
        var inTitle = s.title.toLowerCase().indexOf(q) > -1;
        var inText = text.toLowerCase().indexOf(q) > -1;
        if (inTitle || inText) hits.push({ s:s, text:text, title:inTitle });
      });
    });
    hits.sort(function(a,b){ return (b.title?1:0) - (a.title?1:0); });
    if (!hits.length) {
      results.innerHTML = '<div class="searchfoot">No match for &ldquo;' +
        searchInput.value.replace(/</g,'&lt;') + '&rdquo;.</div>';
      return;
    }
    results.innerHTML = hits.slice(0,40).map(function(h,i){
      return '<button class="result' + (i===0?' sel':'') + '" data-i="'+i+'">' +
        (h.s.part ? '<i>' + h.s.part + '</i>' : '') +
        '<b>' + h.s.title.replace(/</g,'&lt;') + '</b>' +
        '<small>' + snippet(h.text, q) + '</small></button>';
    }).join('');
  }

  searchInput.addEventListener('input', runSearch);
  results.addEventListener('click', function(e){
    var b = e.target.closest('.result');
    if (b) { closeSearch(); showSec(hits[+b.dataset.i].s.id); }
  });

  function move(d){
    var nodes = results.querySelectorAll('.result');
    if (!nodes.length) return;
    nodes[sel] && nodes[sel].classList.remove('sel');
    sel = (sel + d + nodes.length) % nodes.length;
    nodes[sel].classList.add('sel');
    nodes[sel].scrollIntoView({block:'nearest'});
  }

  document.addEventListener('keydown', function(e){
    if (searchWrap.classList.contains('on')) {
      if (e.key === 'Escape') { closeSearch(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && hits.length) { e.preventDefault(); closeSearch(); showSec(hits[sel].s.id); }
      return;
    }
    if (e.key === 'Escape') { closeSide(); return; }
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (typing) return;
    if (e.key === '/') { e.preventDefault(); openSearch(); }
    else if (cur && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      var list = ORDER[doc], i = list.findIndex(function(s){ return s.id === cur; });
      var j = i + (e.key === 'ArrowRight' ? 1 : -1);
      if (j >= 0 && j < list.length) showSec(list[j].id);
    }
  });

  // Deep link support, including in-page hash changes and browser back/forward.
  // Without a hashchange listener a link to #another-section does nothing,
  // because changing only the hash is a same-document navigation.
  function fromHash(){
    var h = location.hash.replace(/^#/,'');
    var known = false;
    for (var k in ORDER) if (ORDER[k].some(function(s){ return s.id === h; })) known = true;
    if (known) { if (h !== cur) showSec(h); }
    else if (DOCS.indexOf(h) > -1) { if (cur !== null || doc !== h) showHome(h); }
    else if (!h) showHome(DOCS[0]);
  }
  window.addEventListener('hashchange', fromHash);

  var h = location.hash.replace(/^#/,'');
  var known = false;
  for (var k in ORDER) if (ORDER[k].some(function(s){ return s.id === h; })) known = true;
  if (known) showSec(h);
  else if (DOCS.indexOf(h) > -1) showHome(h);
  else showHome(DOCS[0]);
})();
`;
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log("wrote " + OUT + "  (" + (page.length / 1024).toFixed(0) + " kB)");
for (const d of docs) {
  console.log(
    "  " + d.number.padEnd(16) +
    d.parts.length + " parts, " + d.flat.length + " sections"
  );
}
