# BlueBloom Spirulina Production Facility — Engineering Documentation

Controlled engineering documentation for the BlueBloom Spirulina Production
Facility, Hyderabad Region, Telangana, India.

- **Company:** BlueBloom Spirulina Private Limited
- **Initial development:** 1-acre commercial facility
- **Planned expansion:** 2-acre, 3-acre and 5-acre modules

## Document Register

| Document number | Title | Revision | Status | File |
| --- | --- | --- | --- | --- |
| BB-DBR-002-V1 | Design Criteria Manual – Volume 1, General Design Criteria | Rev. 0 | Initial Design Basis | [docs/BB-DBR-002-V1_Design-Criteria-Manual_Vol1_General-Design-Criteria.md](docs/BB-DBR-002-V1_Design-Criteria-Manual_Vol1_General-Design-Criteria.md) |
| BB-DBR-002-V2 | Design Criteria Manual – Volume 2, Process Engineering | Rev. 1 | Design Basis — finding closed | [docs/BB-DBR-002-V2_Design-Criteria-Manual_Vol2_Process-Engineering.md](docs/BB-DBR-002-V2_Design-Criteria-Manual_Vol2_Process-Engineering.md) |
| BB-DBR-002-V3 | Design Criteria Manual – Volume 3, Civil, Structural and Layout | Rev. 0 | Initial Design Basis | [docs/BB-DBR-002-V3_Design-Criteria-Manual_Vol3_Civil-Structural-Layout.md](docs/BB-DBR-002-V3_Design-Criteria-Manual_Vol3_Civil-Structural-Layout.md) |

### Planned

| Document number | Title | Status |
| --- | --- | --- |
| BB-DBR-002-V4 | Design Criteria Manual – Volume 4, Mechanical, Electrical, Instrumentation and Control | Not yet issued |

### Closed finding — net pond area

Volumes 2 and 3 disagreed on Stage 1 net pond area. **This is now closed.**

Volume 2 Rev. 0 assumed 2,000 m² (A-01). The Volume 3 layout study (§ 6.4)
supports 1,750 m² once buildings, roads, setbacks and inter-pond access are
budgeted against the 4,047 m² acre.

**Volume 2 was revised to Rev. 1 against 1,750 m²**, with every derived capacity,
balance and equipment duty recalculated — capacity, harvest volume, nutrient and
water balances, CO₂ demand, dryer duty, energy and the mass balance. Stage 1
output is **≈ 3.9 t/year**.

One deliberate divergence remains and is recorded at Volume 2 § 4.5: process
equipment is enquired and purchased against **24 kg/day**, the superseded
2,000 m² peak, as roughly 14% margin against the still-unconfirmed productivity
assumptions A-03 and A-04. Consumables, water and effluent are planned against
the Rev. 1 figures, because those are recurring costs.

### Note on the Volume 2 figures

The capacities, balances and equipment duties in Volume 2 are a **preliminary
design basis**. They are internally consistent and suitable for sizing,
budgeting and procurement enquiry, but they are derived from assumed values for
pond area, areal productivity and operating days.

Every assumed value is listed in the Volume 2 Assumptions Register (§ 24) with
the trial, survey or analysis that confirms it and the commitment it must
precede. The two highest-value early expenditures identified there are a
**cultivation trial** (confirming productivity, which sets every capacity figure
in the volume) and a **source water analysis** (which propagates into treatment
selection, medium formulation, blowdown rate and effluent volume).

## Website

The public-facing site lives in `site/index.html` — a single self-contained
static page with no build step or dependencies. Open the file directly, or
serve the folder with any static server.

It deploys to GitHub Pages via `.github/workflows/pages.yml` on every push to
the default branch. **Pages must be enabled once by hand** before the first
deploy succeeds: Settings → Pages → Build and deployment → Source →
*GitHub Actions*. The workflow token is not permitted to create the Pages site
itself. Once enabled, the site is served at
`https://theojandhyala.github.io/spirulina/`.

The site carries a Suppliers section listing the BB-RFQ packages open for
enquiry. It lists package titles and status only — the enquiry letters
themselves are issued on request, because BB-RFQ-000 section 9 issues them in
confidence and they contain the full technical design basis.

Site copy deliberately claims only what is true today: the facility is
described as in engineering, no certifications are asserted, and no capacity
or health claims are made. Update it as Stage 1 is commissioned.

## Document Numbering

Documents follow the format defined in BB-DBR-002-V1, Section 18:

```
BB-[Document Type]-[Sequence]-[Discipline]-[Revision]
```

Discipline codes: PR (Process), CV (Civil), ST (Structural), AR (Architectural),
ME (Mechanical), PI (Piping), EL (Electrical), IC (Instrumentation and control),
QA (Quality assurance), HS (Health and safety), OP (Operations),
PM (Project management).

## Conventions

- Units are SI, with Indian commercial units (acre, lakh, crore) permitted in
  financial and land-development documents where SI equivalents are also stated.
- Currency is Indian rupees.
- Each document carries its own document-control block and revision history.
- Superseded revisions are retained in git history; the working copy in this
  repository is the current revision.

## Confidentiality

Proprietary project documentation of BlueBloom Spirulina Private Limited.

## Reading the manual

`tools/build-docs-viewer.mjs` builds a single self-contained HTML reader for
every volume — contents sidebar, section filter, light and dark themes, and
print styles for saving a volume as PDF.

```
npm install        # marked, build-time only
npm run docs       # writes docs-viewer.html
```

Open `docs-viewer.html` in a browser. It is generated output and is gitignored;
rebuild it after editing any volume. Adding a volume means appending one entry
to the `VOLUMES` array in the script — nothing else changes.

The build fails rather than emitting a dead cross-link if a referenced section
heading is reworded.

## Supplier enquiries

`docs/rfq/` holds the request-for-quotation letters, one per supply package,
built from the duty data in Volumes 2 and 3.

`BB-RFQ-000` carries the commercial terms common to every enquiry and is sent
as an attachment with each letter. Each package letter is marked **firm** or
**budgetary**: only BB-RFQ-001, site investigation, is firm, because everything
else depends on assumptions that the site investigation and cultivation trial
have yet to confirm.

Process equipment enquiries (BB-RFQ-004 onward) are sized against a peak of
24 kg/day dry biomass — the 2,000 m² pond basis — rather than the 1,750 m²
figure recommended in Volume 3 § 6.5. This is deliberate: it carries roughly
14% headroom against the unconfirmed productivity assumptions and avoids
re-tendering if the cultivation trial comes in strong.

```
npm install        # marked and html-to-docx, build-time only
npm run rfq        # writes editable .docx letters to dist/rfq/
```

The Word files are generated output and are gitignored. Edit them before
sending: add the letterhead, and fill the supplier name, date, quotation due
date and contact details, which are marked as placeholders throughout.

Company registration details (CIN, GSTIN, registered address) are placeholders
in `BB-RFQ-000` and must be filled in before the letters go out.
