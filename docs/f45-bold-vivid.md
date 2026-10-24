# F45 KOREA — Bold & Vivid redesign

## Scope and review gate

Base: `codex/f45-tchaikim-redesign` at `752247eb863d0419a8699241d9b7482a07a9c707`.
Work branch: `codex/f45-bold-vivid`. This implementation is for Preview design review. Do not merge main or deploy Production before the user's design approval.

The earlier TCHAIKIM-based design is superseded for F45 only. Shared navigation, transitions, device projection, the homepage, TCHAIKIM and JADUYA are unchanged. No scroll effects, listeners, pins, reveals or animation libraries were added.

## Analysis and resulting design

The prior F45 page repeated TCHAIKIM's bright photographic veils, gradient handoffs, overlapping circles, five-image collage proportions and a long laptop composition. Their repetition made the brand mood too similar despite different source photography.

| Section | Final expression |
| --- | --- |
| HERO | Original battle-rope photo in color; copy-local dark contrast; bold Inter title; existing three-device projection and metadata |
| OVERVIEW | Shared Soft White; UNDERSTAND → EXPLORE → START describes brand/program understanding, discovery and trial preparation |
| PROBLEM & STRATEGY | Three paired Carbon/Teal comparison rows, large indices; stacked problem/strategy pairs on mobile |
| KEY INSIGHT | Flat Purple, white Korean message; no outline, image or extra cards |
| BRAND CONCEPT | Carbon background; large PLAYFUL COMMUNITY; four asymmetric original training/teamwork/coaching/community photos |
| MAIN EXPERIENCE | WHY in a separate screen-and-explanation layout; PHASE enlarged on a flat Teal block; no laptop frame |
| UX EXPERIENCE | Unobscured desktop/mobile locator, six beginner-care items and the real external-app guide, on Soft White |
| RESULT | Full viewport original team photo, concise conclusion and existing three-device composition; shared NextFace follows |

EVOLUTION is completely removed, including its timeline, WORKING WITH AI and development-history prose. These were not relocated. The HERO still displays the approved period `2026.07`, full role and `100% (PERSONAL PROJECT)`.

Original screenshot colors and typography are unchanged. At mobile widths, WHY uses the original mobile capture in a static, labeled upper-screen viewport crop; all five benefits remain in the adjacent semantic list. PHASE uses its original mobile capture. This is not an animated mask or reveal.

## Fonts and color

- Reuse existing `index.html` Inter loading and `ProjectFonts.css` Wanted Sans loading. No new font request/provider was added.
- F45's stack is Inter, Wanted Sans. Inter supplies Latin letters, spaces and numerals; Korean glyphs resolve to Wanted Sans. Chrome's actual rendered-font API confirmed Wanted Sans Variable for Korean, Inter ExtraBold for the title and Inter Medium for numeric metadata. Mixed text also resolved to both intended fonts.
- Carbon uses the existing `--color-carbon-black` (`#08090A`). Soft White is `#F3F4F4`. Neutral Gray `#5F6468` is reused from both existing detail pages, with `#A4A9AD` for secondary text on Carbon.
- F45 accents are exactly Teal `#008BA3` and Purple `#5B5CEB`; no shade palette. Only HERO/RESULT copy-legibility gradients remain. Shared Header/Dock effects are untouched.
- Removed the two unused F45 font binaries/licenses and obsolete laptop/Evolution frame copies after confirming no non-F45 consumer. Other projects' originals are preserved. Four removed binaries total 3,120,838 bytes.

## Actual browser QA

Chrome: all eight requested viewports. WebKit: 390×844 and 375×667 with touch and reduced motion. Browser emulation is not a physical-device test.

| Viewport | Sections | Horizontal overflow | Broken/distorted images | Final document height |
| --- | --- | --- | --- | --- |
| 1920×1080 | 8 | 0 | 0 | 12,104px |
| 1440×900 | 8 | 0 | 0 | 11,216px |
| 1366×768 | 8 | 0 | 0 | 10,838px |
| 1024×768 | 8 | 0 | 0 | 9,702px |
| 768×1024 | 8 | 0 | 0 | 9,799px |
| 430×932 | 8 | 0 | 0 | 11,599px |
| 390×844 | 8 | 0 | 0 | 11,019px |
| 375×667 | 8 | 0 | 0 | 10,613px |

Height includes the shared NextFace. Baseline 1920 height was 12,521px; baseline 390 height was 11,085px. No pin spacer exists. Automated bounds checks and parent visual inspection confirmed no HERO text/device/metadata overlap, image distortion, text overflow, console/page errors or HTTP failures.

FACES active CTA, infinite dragging through all three projects, Crown/ALL FACES selection, F45 direct URLs with/without trailing slash, Header return/hide/reveal, Dock external-link semantics and existing hover, NextFace cycle, History and reload reading-position restoration passed. Mobile reduced-motion rail tap and dynamic viewport resizing passed.

TCHAIKIM and JADUYA at 1920/1440/390 were compared against the previous verified baseline: six cases, zero recorded layout/style/link differences. JADUYA ENDING remains static. Protected source/assets have no Git diff.

## Validation

- `npm run build`: passed, including TypeScript. The existing 723.16kB homepage chunk warning remains; the homepage was not modified.
- `npm run lint`: passed.
- `node --test tests/*.test.mjs`: 52 passed, 0 failed.
- `git diff --check`: passed.

Actual section screenshots were captured at all eight widths and assembled at measured document coordinates into full-page PNGs. Comparison sheets use those captures, not recreated designs. Fixed Header/Dock are hidden only in section/full-page comparison captures; normal viewport proofs retain them.

Artifacts: `after-full-{width}.png`, `before-after-{1920,390}.jpg`, `tchaikim-f45-full-comparison.jpg`, `hero-result-comparison.jpg`, `viewport-review-{width}.jpg`, `local-visual-qa.json`, `local-functional-qa.json`, `existing-page-comparison.json`, `font-color-qa.json` in the task's `f45-bold-vivid` artifact directory.

## Changed and deleted files

Runtime changes: `src/components/Projects/F45CaseStudy.tsx`, `F45CaseStudy.css`.
Asset metadata changes: `public/projects/f45/ASSETS.md`, `asset-map.json`, `redesign-assets.json`.
Deleted F45-only copies: `Montserrat-OFL.txt`, `Pretendard-LICENSE.txt`, `montserrat-variable.ttf`, `pretendard-variable.woff2`, `main-frame.png`, `evolution-frame.jpg`.
Documentation: this report and the historical report's supersession link.

## Pending

User design review of the Preview. Production and main remain unchanged. Locator geolocation/distance ordering, pricing details, timetables, coaches and reviews remain explicitly unimplemented; this redesign makes no conversion-performance claims.
