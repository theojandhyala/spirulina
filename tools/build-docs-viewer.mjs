/**
 * Builds a single self-contained HTML reader for the BB-DBR-002 design
 * criteria manual set.
 *
 *   node tools/build-docs-viewer.mjs [outfile]
 *
 * Reads every volume listed in VOLUMES below, renders it to HTML, and
 * emits one file with the stylesheet and script inlined — no build step,
 * no dependencies at runtime, opens from the filesystem.
 *
 * Requires `marked` at build time only:  npm i marked
 *
 * Add a volume by appending to VOLUMES. Nothing else needs changing.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || join(ROOT, "docs-viewer.html");

const VOLUMES = [
  {
    id: "v1",
    tab: "Vol 1",
    number: "BB-DBR-002-V1",
    title: "General Design Criteria",
    file: "docs/BB-DBR-002-V1_Design-Criteria-Manual_Vol1_General-Design-Criteria.md",
  },
  {
    id: "v2",
    tab: "Vol 2",
    number: "BB-DBR-002-V2",
    title: "Process Engineering",
    file: "docs/BB-DBR-002-V2_Design-Criteria-Manual_Vol2_Process-Engineering.md",
  },
  {
    id: "v3",
    tab: "Vol 3",
    number: "BB-DBR-002-V3",
    title: "Civil, Structural and Layout",
    file: "docs/BB-DBR-002-V3_Design-Criteria-Manual_Vol3_Civil-Structural-Layout.md",
  },
];

// Front-matter headings that are part of the title block, not real sections.
const TOC_SKIP = new Set(["design criteria manual"]);
const TOC_SKIP_RE = /^volume\s+\d/i;

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;");

const slug = (s) =>
  s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);

/** Render one volume, collecting a table of contents as we go. */
function renderVolume(vol) {
  const md = readFileSync(join(ROOT, vol.file), "utf8");
  const toc = [];
  const seen = new Map();

  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const plain = text.replace(/<[^>]+>/g, "");
    let id = `${vol.id}-${slug(plain)}`;
    // Guarantee uniqueness; duplicate headings exist across volumes.
    const n = (seen.get(id) || 0) + 1;
    seen.set(id, n);
    if (n > 1) id += `-${n}`;
    if (
      (depth === 2 || depth === 3) &&
      !TOC_SKIP.has(plain.toLowerCase()) &&
      !TOC_SKIP_RE.test(plain)
    ) {
      toc.push({ depth, id, text: plain });
    }
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };

  let html = marked.parse(md, { renderer, gfm: true, breaks: false });
  // Every table gets its own horizontal scroll container so the page body
  // never scrolls sideways.
  html = html.replace(/<table>/g, '<div class="tw"><table>')
             .replace(/<\/table>/g, "</table></div>");

  return { ...vol, html, toc };
}

const vols = VOLUMES.map(renderVolume);

/**
 * Resolve a heading id by volume and section number, so cross-links in the
 * register cannot drift when a heading is reworded. Fails the build rather
 * than emitting a dead link.
 */
function anchor(volId, startsWith) {
  const v = vols.find((x) => x.id === volId);
  const hit = v && v.toc.find((t) => t.text.startsWith(startsWith));
  if (!hit) {
    throw new Error(
      `build-docs-viewer: no heading in ${volId} starting "${startsWith}" — ` +
        `the register cross-link would be dead. Update the reference.`
    );
  }
  return hit.id;
}

const FINDING = anchor("v3", "6.5");

const tocHtml = (v) =>
  v.toc
    .map(
      (t) =>
        `<a class="t${t.depth}" href="#${t.id}" data-id="${t.id}">${esc(t.text)}</a>`
    )
    .join("\n");

const page = `<title>BB-DBR-002 — Design Criteria Manual</title>
<style>
:root {
  --ground:#ECEFEA; --paper:#F7F9F5; --panel:#10322C; --ink:#06201E;
  --ink-soft:#22423C; --muted:#5D6F69; --phyco:#1160C4; --phyco-lt:#57A0F0;
  --biomass:#1C4A3E; --line:rgba(6,32,30,.14); --line-soft:rgba(6,32,30,.07);
  --warn-bg:rgba(17,96,196,.07);
  --serif:"Iowan Old Style","Palatino Linotype",Palatino,Charter,Georgia,serif;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --mono:ui-monospace,SFMono-Regular,"SF Mono","Cascadia Mono",Menlo,Consolas,monospace;
}
@media (prefers-color-scheme:dark){
  :root{--ground:#071110;--paper:#0C1A18;--panel:#0B211E;--ink:#E4EDE8;
    --ink-soft:#C2D2CC;--muted:#91A69E;--phyco:#5CA3F5;--phyco-lt:#8CC2FF;
    --biomass:#3E8C73;--line:rgba(228,237,232,.15);--line-soft:rgba(228,237,232,.07);
    --warn-bg:rgba(92,163,245,.09);}
}
:root[data-theme="dark"]{--ground:#071110;--paper:#0C1A18;--panel:#0B211E;--ink:#E4EDE8;
  --ink-soft:#C2D2CC;--muted:#91A69E;--phyco:#5CA3F5;--phyco-lt:#8CC2FF;
  --biomass:#3E8C73;--line:rgba(228,237,232,.15);--line-soft:rgba(228,237,232,.07);
  --warn-bg:rgba(92,163,245,.09);}
:root[data-theme="light"]{--ground:#ECEFEA;--paper:#F7F9F5;--panel:#10322C;--ink:#06201E;
  --ink-soft:#22423C;--muted:#5D6F69;--phyco:#1160C4;--phyco-lt:#57A0F0;
  --biomass:#1C4A3E;--line:rgba(6,32,30,.14);--line-soft:rgba(6,32,30,.07);
  --warn-bg:rgba(17,96,196,.07);}

*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);
  font-size:1rem;line-height:1.62;-webkit-font-smoothing:antialiased}
::selection{background:var(--phyco);color:#fff}
:focus-visible{outline:2px solid var(--phyco);outline-offset:2px;border-radius:2px}

/* ---------- masthead ---------- */
.bar{position:sticky;top:0;z-index:60;background:color-mix(in srgb,var(--ground) 90%,transparent);
  backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.bar-in{display:flex;align-items:center;gap:1.25rem;height:3.6rem;
  padding-inline:1.25rem;max-width:96rem;margin-inline:auto}
.brand{display:flex;align-items:center;gap:.5rem;font-family:var(--serif);
  font-size:1.05rem;white-space:nowrap;letter-spacing:-.01em}
.brand::before{content:"";width:.55rem;height:.55rem;border-radius:50%;
  background:var(--phyco);flex:none}
.brand b{font-weight:600}
.brand span{color:var(--muted)}
.tabs{display:flex;gap:.25rem;margin-left:auto;overflow-x:auto;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tabs button{font-family:var(--mono);font-size:.78rem;letter-spacing:.04em;
  background:none;border:1px solid transparent;color:var(--muted);cursor:pointer;
  padding:.4rem .7rem;border-radius:2px;white-space:nowrap;transition:.15s}
.tabs button:hover{color:var(--ink)}
.tabs button[aria-current="true"]{color:#fff;background:var(--phyco);border-color:var(--phyco)}
.menu{display:none;background:none;border:1px solid var(--line);color:var(--ink);
  border-radius:2px;padding:.35rem .55rem;cursor:pointer;font-family:var(--mono);font-size:.78rem}

/* ---------- shell ---------- */
.shell{display:grid;grid-template-columns:17rem minmax(0,1fr);gap:2.5rem;
  max-width:96rem;margin-inline:auto;padding:0 1.25rem 5rem}
.side{position:sticky;top:3.6rem;align-self:start;height:calc(100dvh - 3.6rem);
  overflow-y:auto;padding:1.25rem .5rem 2rem 0;border-right:1px solid var(--line-soft)}
.find{width:100%;font-family:var(--mono);font-size:.78rem;padding:.5rem .6rem;
  border:1px solid var(--line);border-radius:2px;background:var(--paper);
  color:var(--ink);margin-bottom:.9rem}
.find::placeholder{color:var(--muted)}
.toc{display:flex;flex-direction:column}
.toc a{text-decoration:none;color:var(--muted);font-size:.83rem;line-height:1.35;
  padding:.32rem .5rem;border-left:2px solid transparent;transition:.15s}
.toc a:hover{color:var(--ink);background:var(--paper)}
.toc a.t3{padding-left:1.4rem;font-size:.79rem;opacity:.85}
.toc a.on{color:var(--phyco);border-left-color:var(--phyco);background:var(--paper)}
.toc a.hide{display:none}
.toc-empty{color:var(--muted);font-family:var(--mono);font-size:.76rem;padding:.5rem}

/* ---------- document ---------- */
main{min-width:0;padding-top:2.25rem}
.doc{display:none}
.doc.on{display:block}
.doc>*{max-width:52rem}
.doc .tw{max-width:100%}
h1,h2,h3,h4{font-family:var(--serif);font-weight:600;text-wrap:balance;
  letter-spacing:-.012em;scroll-margin-top:4.5rem}
.doc h1{font-size:1.5rem;color:var(--muted);font-weight:400;margin:0 0 .25rem;
  font-family:var(--mono);letter-spacing:.06em}
.doc h2{font-size:1.65rem;line-height:1.2;margin:3rem 0 1rem;padding-top:1.5rem;
  border-top:1px solid var(--line)}
.doc h2:first-of-type{border-top:0;padding-top:0;margin-top:1rem}
.doc h3{font-size:1.15rem;margin:2rem 0 .6rem}
.doc p{margin:0 0 1rem}
.doc strong{font-weight:600}
.doc em{font-style:italic}
.doc ul,.doc ol{margin:0 0 1.15rem;padding-left:1.35rem}
.doc li{margin-bottom:.3rem}
.doc hr{border:0;border-top:1px solid var(--line-soft);margin:2.25rem 0}
.doc a{color:var(--phyco)}
.doc code{font-family:var(--mono);font-size:.87em;background:var(--paper);
  padding:.1rem .3rem;border-radius:2px}
.doc pre{background:var(--paper);border:1px solid var(--line-soft);border-radius:2px;
  padding:.9rem 1rem;overflow-x:auto}
.doc pre code{background:none;padding:0}

/* a paragraph that is entirely bold is an emphasis callout in these documents */
.doc p:has(> strong:only-child){background:var(--warn-bg);border-left:2px solid var(--phyco);
  padding:.85rem 1rem;margin-bottom:1.25rem}
.doc p:has(> strong:only-child) strong{font-weight:600}

.tw{overflow-x:auto;margin:0 0 1.5rem;border:1px solid var(--line);border-radius:2px}
/* min-width so narrow screens scroll the table sideways inside .tw rather
   than crushing every cell to one word per line */
table{border-collapse:collapse;width:100%;min-width:30rem;font-size:.86rem;
  font-variant-numeric:tabular-nums;font-family:var(--sans)}
th,td{text-align:left;padding:.55rem .8rem;border-bottom:1px solid var(--line-soft);
  vertical-align:top}
thead th{background:var(--paper);font-family:var(--mono);font-size:.7rem;
  letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:400;
  border-bottom:1px solid var(--line);position:sticky;top:0}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover{background:var(--paper)}
td strong{font-weight:600}

/* ---------- register (home) ---------- */
.reg h2{font-size:1.3rem;margin:2.5rem 0 1rem;padding-top:1.5rem;border-top:1px solid var(--line)}
.reg h2:first-of-type{border-top:0;padding-top:0;margin-top:2rem}
.hero-t{font-size:2.1rem;line-height:1.1;margin:0 0 .75rem;max-width:22ch}
.hero-s{color:var(--ink-soft);max-width:44em;margin:0 0 .5rem}
.kicker{font-family:var(--mono);font-size:.72rem;letter-spacing:.13em;
  text-transform:uppercase;color:var(--muted);margin-bottom:.9rem}
.figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));
  gap:1px;background:var(--line);border:1px solid var(--line);margin:1.5rem 0 0}
.fig{background:var(--ground);padding:.9rem 1rem}
.fig dt{font-family:var(--mono);font-size:.68rem;letter-spacing:.1em;
  text-transform:uppercase;color:var(--muted);margin-bottom:.3rem}
.fig dd{margin:0;font-family:var(--serif);font-size:1.25rem;font-variant-numeric:tabular-nums}
.fig small{display:block;font-family:var(--mono);font-size:.68rem;color:var(--muted);
  margin-top:.15rem;letter-spacing:.03em}
.note{background:var(--warn-bg);border-left:2px solid var(--phyco);
  padding:1rem 1.15rem;margin:1.25rem 0;max-width:52rem}
.note b{display:block;font-family:var(--mono);font-size:.72rem;letter-spacing:.1em;
  text-transform:uppercase;color:var(--phyco);margin-bottom:.5rem}
.note p{margin:0 0 .7rem}
.note p:last-child{margin-bottom:0}
.open{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:1rem;
  margin:1.25rem 0;max-width:52rem}
.open div{border:1px solid var(--line);padding:.9rem 1rem;border-radius:2px}
.open dt{font-family:var(--mono);font-size:.68rem;letter-spacing:.1em;
  text-transform:uppercase;color:var(--muted);margin-bottom:.35rem}
.open dd{margin:0;font-family:var(--serif);font-size:1.35rem;font-variant-numeric:tabular-nums}
.open .lead{border-color:var(--phyco)}
.open .lead dd{color:var(--phyco)}
.jump{display:inline-flex;align-items:center;gap:.45rem;font-family:var(--mono);
  font-size:.78rem;text-decoration:none;color:#fff;background:var(--phyco);
  border:1px solid var(--phyco);padding:.5rem .85rem;border-radius:2px;transition:.15s}
.jump:hover{background:transparent;color:var(--phyco)}
.foot{margin-top:3.5rem;padding-top:1.5rem;border-top:1px solid var(--line);
  font-family:var(--mono);font-size:.76rem;color:var(--muted);line-height:1.8;max-width:52rem}

/* ---------- responsive ---------- */
@media (max-width:960px){
  .shell{grid-template-columns:minmax(0,1fr);gap:0}
  .side{position:fixed;inset:3.6rem 0 0 auto;width:min(21rem,86vw);z-index:55;
    background:var(--ground);border-right:0;border-left:1px solid var(--line);
    padding:1.25rem 1rem 2rem;transform:translateX(100%);transition:transform .2s;
    box-shadow:-10px 0 30px rgba(0,0,0,.14)}
  .side.open{transform:translateX(0)}
  .menu{display:block}
  main{padding-top:1.5rem}
}
@media (max-width:560px){
  .bar-in{gap:.6rem;padding-inline:.9rem}
  .brand span{display:none}
  .shell{padding-inline:.9rem}
  .hero-t{font-size:1.65rem}
  .doc h2{font-size:1.35rem}
}
@media (prefers-reduced-motion:reduce){
  *{transition:none!important;scroll-behavior:auto!important}
}
html{scroll-behavior:smooth}

@media print{
  .bar,.side,.menu,.jump{display:none!important}
  .shell{display:block;padding:0;max-width:none}
  main{padding:0}
  .doc>*{max-width:none}
  .doc h2{break-after:avoid;page-break-after:avoid}
  .tw,table,tr{break-inside:avoid;page-break-inside:avoid}
  thead th{position:static}
  body{background:#fff;color:#000;font-size:10.5pt}
}
</style>

<header class="bar">
  <div class="bar-in">
    <div class="brand"><b>BB-DBR-002</b> <span>Design Criteria Manual</span></div>
    <nav class="tabs" id="tabs" aria-label="Volumes">
      <button data-v="reg" aria-current="true">Register</button>
      ${vols.map((v) => `<button data-v="${v.id}">${esc(v.tab)}</button>`).join("\n      ")}
    </nav>
    <button class="menu" id="menu" aria-expanded="false">Contents</button>
  </div>
</header>

<div class="shell">
  <aside class="side" id="side">
    <input class="find" id="find" type="search" placeholder="Filter sections…" aria-label="Filter sections">
    <nav class="toc" id="toc" aria-label="Table of contents"></nav>
  </aside>

  <main>
    <article class="doc reg on" id="doc-reg">
      <p class="kicker">BlueBloom Spirulina Private Limited · Hyderabad Region, Telangana</p>
      <h1 class="hero-t" style="font-family:var(--serif);letter-spacing:-.02em;color:var(--ink);font-weight:600">Design Criteria Manual</h1>
      <p class="hero-s">Master engineering standard for the BlueBloom Spirulina
      Production Facility — a 1-acre commercial cultivation, harvesting, drying and
      packaging facility designed to expand to five acres.</p>
      <p class="hero-s" style="color:var(--muted);font-size:.9rem">Three volumes issued at Rev. 0.
      Pick a volume above, or filter sections from the contents list.</p>

      <dl class="figs">
        <div class="fig"><dt>Stage 1 site</dt><dd>1 acre</dd><small>4,047 m²</small></div>
        <div class="fig"><dt>Net pond area</dt><dd>1,750 m²</dd><small>Vol 3 § 6.4</small></div>
        <div class="fig"><dt>Annual output</dt><dd>≈ 3.9 t</dd><small>dry biomass</small></div>
        <div class="fig"><dt>Master plan</dt><dd>5 acres</dd><small>≈ 26.9 t/yr</small></div>
      </dl>

      <h2>Document register</h2>
      <div class="tw"><table>
        <thead><tr><th>Number</th><th>Volume</th><th>Rev.</th><th>Status</th></tr></thead>
        <tbody>
        ${vols
          .map(
            (v) =>
              `<tr><td><code>${esc(v.number)}</code></td><td>${esc(v.title)}</td><td>Rev. 0</td><td>${
                v.id === "v2"
                  ? "Initial basis — <strong>open finding</strong>"
                  : "Initial design basis"
              }</td></tr>`
          )
          .join("\n        ")}
        <tr><td><code>BB-DBR-002-V4</code></td><td>Mechanical, Electrical, Instrumentation and Control</td><td>—</td><td>Not yet issued</td></tr>
        </tbody>
      </table></div>

      <h2>Open finding — net pond area</h2>
      <p>Volumes 2 and 3 disagree on Stage 1 net pond area. The disagreement is
      recorded deliberately rather than resolved by editing one volume.</p>
      <p>Volume 2 assumed 2,000 m² (assumption A-01) in order to derive process
      capacity. The Volume 3 layout study supports 1,750 m² once buildings, roads,
      setbacks and inter-pond access are budgeted against the acre.</p>

      <dl class="open">
        <div><dt>Volume 2, A-01</dt><dd>2,000 m²</dd></div>
        <div class="lead"><dt>Volume 3, § 6.4</dt><dd>1,750 m²</dd></div>
        <div><dt>Capacity difference</dt><dd>12.5 %</dd></div>
        <div><dt>Annual output</dt><dd>4.48 → 3.92 t</dd></div>
      </dl>

      <div class="note">
        <b>Action required</b>
        <p>Volume 3 § 6.5 sets out three resolutions and recommends accepting
        1,750 m². Closing the finding requires revising Volume 2 to Rev. 1 — not
        editing the figure in one volume alone.</p>
        <p>Until it is closed, quote Stage 1 capacity as approximately
        <strong>3.9 t/year</strong>, the more developed position.</p>
      </div>
      <p><a class="jump" href="#" data-goto="v3" data-anchor="${FINDING}">Read Volume 3 § 6.5 →</a></p>

      <h2>How to read this set</h2>
      <p>Volume 1 is qualitative and governs everything below it. Volume 2 turns it
      into numbers. Volume 3 fixes the geometry Volume 2 assumed — which is how the
      open finding above surfaced.</p>
      <p>Every assumed value in Volumes 2 and 3 carries a register reference
      (A-01 to A-22) naming the trial, survey or analysis that confirms it and the
      commitment it must precede. See Volume 2 § 24 and Volume 3 § 16.</p>

      <div class="note">
        <b>Status of the figures</b>
        <p>These are a preliminary design basis: internally consistent and suitable
        for sizing, budgeting and procurement enquiry, but derived from assumed
        values for pond area, areal productivity and operating days.</p>
        <p>The two highest-value early expenditures identified across the set are a
        <strong>cultivation trial</strong> and a <strong>source water analysis</strong>.
        Both should precede any major equipment commitment.</p>
      </div>

      <p class="foot">
        BB-DBR-002 · Rev. 0 · Proprietary project document<br>
        Prepared for BlueBloom Spirulina Private Limited<br>
        Use your browser's print function to save any volume as a PDF.
      </p>
    </article>

    ${vols.map((v) => `<article class="doc" id="doc-${v.id}">\n${v.html}\n</article>`).join("\n\n")}
  </main>
</div>

<script>
(function () {
  var TOC = ${JSON.stringify(
    Object.fromEntries([
      // The register has no sections of its own; offer the volumes instead,
      // so the contents panel is never an empty box.
      [
        "reg",
        vols
          .map(
            (v) =>
              `<a class="t2" href="#" data-goto="${v.id}">${esc(v.tab)} — ${esc(v.title)}</a>`
          )
          .join("\n"),
      ],
      ...vols.map((v) => [v.id, tocHtml(v)]),
    ])
  )};
  var tabs = document.getElementById('tabs');
  var toc = document.getElementById('toc');
  var find = document.getElementById('find');
  var side = document.getElementById('side');
  var menu = document.getElementById('menu');
  var current = 'reg';
  var spy = null;

  function closeSide() {
    side.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
  }

  function watchHeadings() {
    if (spy) { spy.disconnect(); spy = null; }
    if (current === 'reg' || !('IntersectionObserver' in window)) return;
    var links = {};
    toc.querySelectorAll('a').forEach(function (a) { links[a.dataset.id] = a; });
    var visible = new Set();
    spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id);
      });
      var order = Object.keys(links);
      var top = order.find(function (id) { return visible.has(id); });
      order.forEach(function (id) { links[id].classList.toggle('on', id === top); });
    }, { rootMargin: '-70px 0px -75% 0px' });
    document.querySelectorAll('#doc-' + current + ' h2, #doc-' + current + ' h3')
      .forEach(function (h) { if (links[h.id]) spy.observe(h); });
  }

  function show(v, anchor) {
    current = v;
    document.querySelectorAll('.doc').forEach(function (d) {
      d.classList.toggle('on', d.id === 'doc-' + v);
    });
    tabs.querySelectorAll('button').forEach(function (b) {
      var on = b.dataset.v === v;
      b.setAttribute('aria-current', String(on));
      // The tab strip scrolls on narrow screens; keep the current volume visible.
      if (on && b.scrollIntoView) {
        b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
    toc.innerHTML = TOC[v] || '';
    find.value = '';
    // Nothing to filter on the register's four-item volume list.
    find.style.display = v === 'reg' ? 'none' : '';
    closeSide();
    watchHeadings();
    if (anchor) {
      var el = document.getElementById(anchor);
      if (el) {
        // The article was display:none until a moment ago; wait for layout
        // or the scroll target is computed against a stale box.
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { el.scrollIntoView(); });
        });
        return;
      }
    }
    window.scrollTo(0, 0);
  }

  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-v]');
    if (b) show(b.dataset.v);
  });

  toc.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeSide();
  });

  document.addEventListener('click', function (e) {
    var j = e.target.closest('[data-goto]');
    if (!j) return;
    e.preventDefault();
    show(j.dataset.goto, j.dataset.anchor);
  });

  menu.addEventListener('click', function () {
    var open = side.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });

  find.addEventListener('input', function () {
    var q = find.value.trim().toLowerCase();
    var hits = 0;
    toc.querySelectorAll('a').forEach(function (a) {
      var hit = !q || a.textContent.toLowerCase().indexOf(q) > -1;
      a.classList.toggle('hide', !hit);
      if (hit) hits++;
    });
    var empty = toc.querySelector('.toc-empty');
    if (!hits && !empty) {
      var p = document.createElement('p');
      p.className = 'toc-empty';
      p.textContent = 'No section matches "' + find.value + '".';
      toc.appendChild(p);
    } else if (hits && empty) {
      empty.remove();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSide();
    if (e.key === '/' && document.activeElement !== find) {
      e.preventDefault();
      side.classList.add('open');
      find.focus();
    }
  });

  show('reg');
})();
</script>
`;

writeFileSync(OUT, page);
const kb = (page.length / 1024).toFixed(0);
console.log(`wrote ${OUT}  (${kb} kB)`);
for (const v of vols) console.log(`  ${v.number}  ${v.toc.length} sections indexed`);
