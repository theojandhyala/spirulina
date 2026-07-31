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
| BB-DBR-002-V2 | Design Criteria Manual – Volume 2, Process Engineering | Rev. 0 | Initial Design Basis | [docs/BB-DBR-002-V2_Design-Criteria-Manual_Vol2_Process-Engineering.md](docs/BB-DBR-002-V2_Design-Criteria-Manual_Vol2_Process-Engineering.md) |

### Planned

| Document number | Title | Status |
| --- | --- | --- |
| BB-DBR-002-V3 | Design Criteria Manual – Volume 3, Civil, Structural and Layout | Not yet issued |

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
