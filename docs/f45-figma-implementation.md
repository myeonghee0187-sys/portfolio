# F45 KOREA — Figma implementation / Preview review

## Confirmed scope

Base: `codex/f45-bold-vivid`, `00df0a732a3eb7d5c9de34d408cd4ba847de22f8`. New branch: `codex/f45-figma-implementation`.

Source of truth: [portfolio Figma / 79:970](https://www.figma.com/design/9kXZ17uZOK7WinbmInLvUH/portfolio?node-id=79-970&m=dev). The previous Codex design is replaced on F45 only. No new design proposal, marquee, responsive-web introduction, Ending/Result, Evolution or scroll effect is included.

The initial brief described five sections and a separate DESIGN POINT. Fresh MCP inspection found exactly four frames in `79:970`; `2134:440 point` is an empty 1920×1080 gray frame. The Design page and reference/storyboard pages were also inspected for another completed F45 solution frame. The user then identified the final frame named `concept`; a fresh MCP selection/context confirmed `2134:404`, containing the two COMMUNITY / PLAYFUL circles. That exact final frame is implemented once. **The delivered page has four confirmed design sections; a separate fifth UI solution section is not claimed complete or fabricated.**

| Implemented section | Figma node | Desktop Y | Desktop height |
| --- | --- | ---: | ---: |
| HERO | 79:987 | 0 | 1080 |
| OVERVIEW | 79:988 | 1080 | 604 |
| AS-IS / TO-BE | 79:989 | 1684 | 1664 |
| DESIGN CONCEPT / final concept | 79:991 / 2134:404 | 3348 | 922 |

The four-section main is exactly 4270px high at 1920×1080. Existing NextFace remains separate navigation below it, without an invented ending.

## Implementation and actual assets

- HERO: exact Figma gym photo and three-device PNG, original crop/overlay, copy at x40/y321, 160px Inter Bold title with distinct line tracking; `100dvh`. Metadata is 기간 `2026.7`, the full approved role and `100% (PERSONAL PROJECT)`.
- OVERVIEW: original photograph, 70% Carbon overlay, original vertical gradient, centered label/title/four-line description. No UNDERSTAND / EXPLORE / START layout.
- AS-IS / TO-BE: 80% Purple panel over the original background gradient, 160px corner radius, paired 442×220 cards, 60px column gaps, six exact 312×104 illustration slots and three original connector images on aligned centers.
- CONCEPT: original background at x−423/y−105, 80% light overlay and top fade; original headings; 330px circles with 80px overlap. English/numerals use Inter as explicitly requested.
- All 11 Figma PNGs were downloaded unmodified with `curl -f -L`. No temporary asset URL appears in runtime code. No whole-section screenshot is used to render the webpage. Source slots and dimensions are recorded in `public/projects/f45/figma-assets.json`.
- Wanted Sans supplies Korean; existing Inter supplies English and numerals. The existing local Inter Regular asset is reused through an F45-only family alias for genuine 400-weight metadata/labels. No new font binary/provider and no TCHAIKIM/JADUYA font-rule changes.

## Differences discovered and corrections

1. CSS premultiplied-alpha gradient interpolation initially made HERO and OVERVIEW darker than Figma. Sampled Figma gradient colors/alpha were reproduced at intermediate stops; mean absolute RGB channel differences fell from approximately 9–11 to 2–3.5 (0–255 scale). These intermediate colors implement the original gradient, not a new brand palette.
2. Fractional line boxes initially increased two section heights by about 1px. Original headline line box and concept header geometry now give exact section boundaries at 1080 / 1684 / 3348 / 4270.
3. The 768×1024 portrait device composition initially intersected metadata. Its responsive width/bottom placement now separates the visible device pixels from both copy and metadata.
4. Desktop retains the original three columns. Mobile reflows each corresponding As-is / To-be pair together, preserves the real icons/connectors and repeats the existing row labels for clarity. No mobile prototype exists in this Figma subtree, so this is a responsive adaptation of its existing elements.

Final 1920 mean absolute RGB differences (per channel), including text rasterization and image resampling: HERO 2.19/2.20/2.12; OVERVIEW 3.09/3.41/3.47; AS-IS/TO-BE 1.08/1.16/0.72; CONCEPT 0.73/0.56/0.35. These are raw image differences, not a perceptual similarity score or a claim of pixel identity. Minor browser/Figma antialiasing and requested Inter substitution for numerals/English remain.

## Browser QA

Chrome: 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 430×932, 390×844, 375×667. WebKit: 390×844 and 375×667 with touch / reduced motion. This is browser emulation, not physical-device testing.

All ten cases passed: no horizontal overflow, clipped text, title/device/metadata overlap, broken images, request errors or console/page errors; four sections, six cards, aligned before/after centers, two circles and zero pin spacers. Thirteen rendered images reuse 11 unique assets. Every static image was checked for a non-empty local file, correct callsite/design slot and effective geometry.

WebKit's lazy loading required scrolling individual images into view before decoding them in the QA harness; this was corrected in the harness, not by removing lazy loading from the page.

Function checks passed: FACES active entry, Crown/ALL FACES, infinite pointer traversal, direct route with/without trailing slash, Header FACES/HERO/CONTACT navigation, Dock link/hover/external semantics, NextFace cycle, back/forward reading restoration, refresh and reduced-motion mobile rail entry. `/`, `/projects/f45`, `/projects/tchaikim` and `/projects/jaduya` load correctly.

TCHAIKIM/JADUYA at 1920/1440/390: six cases compared with the previous baseline, zero recorded layout/style/link differences. Their source, fonts and assets are unchanged; JADUYA ENDING remains static. F45 copy contains no program-selection claim: users understand the fixed workout programs, rather than choosing a custom program.

## Validation

- `npm run build`: passed, including TypeScript. Existing homepage 723.16kB chunk warning remains; its implementation is unchanged.
- `npm run lint`: passed.
- `node --test tests/*.test.mjs`: 52 passed, 0 failed.
- `git diff --check`: passed.

## Changed files

- `src/components/Projects/F45CaseStudy.tsx`
- `src/components/Projects/F45CaseStudy.css`
- `public/projects/f45/ASSETS.md`
- `public/projects/f45/figma-assets.json`
- `public/projects/f45/figma-hero-background.png`
- `public/projects/f45/figma-hero-devices.png`
- `public/projects/f45/figma-overview-background.png`
- `public/projects/f45/figma-asis-01.png`, `figma-asis-02.png`, `figma-asis-03.png`
- `public/projects/f45/figma-tobe-01.png`, `figma-tobe-02.png`, `figma-tobe-03.png`
- `public/projects/f45/figma-connector.png`
- `public/projects/f45/figma-concept-background.png`
- `docs/f45-figma-implementation.md`

No old source image, prior device helper, shared component or other project file was deleted.

## Review artifacts and next work

The task's `f45-figma-implementation` artifact directory includes full desktop/mobile PNGs, every requested viewport's section captures, four Figma/React section comparisons and a full comparison. `visual-qa.json`, `figma-pixel-comparison.json`, `font-route-qa.json`, `local-functional-qa.json` and `existing-page-comparison.json` record verification evidence.

Preview design review is pending. Main/Production must remain unchanged until approval. A separate actual UI solution section, RESPONSIVE WEB introduction and ENDING require their finalized Figma designs; no placeholder or fabricated section was inserted. MARQUEE remains excluded.
