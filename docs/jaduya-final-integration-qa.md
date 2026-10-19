# JADUYA final implementation and integrated detail-page QA

Date: 2026-10-19. Branch: `codex/jaduya-final-integration`.

## Implementation and design evidence

Source: [final Figma project_jaduya, 2068:363](https://www.figma.com/design/9kXZ17uZOK7WinbmInLvUH/portfolio?node-id=2068-363&m=dev). Fresh high-fidelity context and original image layers were inspected before implementation.

The nine design sections are Hero, Overview, AS-IS / TO-BE, Result, Brand Concept, Main Page 01, Main Page 02, Life Page / Home Care, and Ending. Only the shared NextFace navigation follows Ending. There is no additional JADU AI or Interaction Video section.

- Existing first sections were retained; Result's trailing space now matches the final frame.
- Brand Concept and Ending use original separate character, plum, and road layers.
- Main Page 02 represents the same home with its bottom sheet raised. Its original phone, raised sheet and halo remain separate layers; the app UI was not recreated.
- Home Care uses the unchanged original long phone image. Connectors, text, and point cards are separate SVG / HTML / CSS elements.
- At 1920px, the nine sections total 11949.55px, against the source's 11950px. The new sections measure 1092 / 1715 / 1828 / 2639 / 1080px respectively.
- Below the section breakpoints, cards, copy, characters and phones are rearranged into readable flows rather than uniformly shrinking the entire desktop layout.
- Original assets and layer IDs are documented in `public/projects/jaduya/brand/ASSETS.md` and `public/projects/jaduya/experience/ASSETS.md`. No generated images or full-section screenshot runtime assets were introduced.

## Main files

| Area | Files |
| --- | --- |
| JADUYA integration and existing sections | `JaduyaCaseStudy.tsx`, `JaduyaCaseStudy.css` |
| Brand / Ending | `JaduyaBrandSections.tsx`, `JaduyaBrandSections.css` |
| Main Page 01 / 02 and Home Care | `JaduyaExperienceSections.tsx`, `JaduyaExperienceSections.css` |
| Shared viewport and fixed-UI allowances | `ProjectViewport.css`, `ProjectHeader.tsx` |
| TCHAIKIM Hero fit | `TchaikimCaseStudy.tsx`, `TchaikimCaseStudy.css`, `ResponsiveDevices.tsx`, `ResponsiveDevices.css`, `deviceScreenProjection.ts` |
| FACES CTA | `Faces.css`, `FacesRail.tsx`, `useFacesInteraction.ts` |
| Shared next-project routing | `App.tsx`, `NextFace.tsx` |
| Semantic link regression | `tests/facesProjectLinks.test.mjs` |

Component file names above are under `src/components/Projects` unless another directory is specified.

## Hero viewport and device fit

Both detail roots share `--project-hero-height: 100vh; 100dvh`, header and dock allowances, and safe-area insets. Windows shorter than 540px use a scrollable 620px Hero fallback.

The TCHAIKIM frame image is still the original 1672×941 asset. Its nontransparent bounds are x=672, y=101, width=966, height=713. Hero fitting measures these actual device bounds, sizes them within the available width AND height, and translates the full unchanged composition to exclude transparent padding. The three original screen projections and their proportions are retained. The mobile grid explicitly places copy, visual, and metadata in rows 1, 2, and 3; QA rejects zero-size visual bounds as well as clipping and overlap.

JADUYA retains the source's diagonal five-phone composition and rotation, including intentional desktop edge crops. On mobile the copy, metadata and complete phone group occupy separate rows; the rotated phone group's width and height both constrain its scale.

## FACES CTA and shared navigation

The old CTA opacity followed `data-ready`; this made it disappear while dragging or between projects. Project-specific CTA geometry and opacity also changed its appearance.

The measured display position now controls initial placement only. Thereafter the CTA stays visible with identical geometry, font, alignment and contrast across all projects. Existing readiness, gesture cancellation, velocity/settling checks, exit locking, href and keyboard gating still control activation. F45 stays visible but has no href and is not keyboard actionable.

The native rail puts each CTA over its video in a separate sibling anchor, avoiding nested links. Swipe cancellation and project routing are preserved. Shared ProjectHeader, FloatingDock, NextFace and page transitions are reused. NextFace moves TCHAIKIM → JADUYA → F45 in FACES, with no invented F45 detail route.

## Browser QA

| Viewport | TCHAIKIM Hero | JADUYA Hero and 9 sections | Overflow / missing images / clipped text |
| --- | --- | --- | --- |
| 1920×1080 | Pass | Pass | None |
| 1440×900 | Pass | Pass | None |
| 1366×768 | Pass | Pass | None |
| 1024×768 | Pass | Pass | None |
| 768×1024 | Pass | Pass | None |
| 430×932 | Pass | Pass | None |
| 390×844 | Pass | Pass | None |
| 375×667 | Pass | Pass | None |

- Chromium: all eight viewports, both detail pages; section captures at 1920 and 390px compared with the source. Device bounds are positive, inside the Hero and separate from title / metadata. JADUYA's mobile five-phone group also fits in full.
- WebKit: 390×844 and 375×667 with touch, mobile emulation and reduced motion; both details pass the same checks.
- Short 844×390 landscape: both Heroes use the 620px accessible fallback without horizontal overflow.
- Dynamic mobile viewport: resizing height from 844 to 700 and back recomputes Hero height correctly.
- Actual WebGL pointer drags in both directions traversed all three projects. Across 602 animation-frame samples, CTA opacity stayed 1 and its bounds changed by less than 1px, including unavailable states. Drag release did not navigate.
- Crown / ALL FACES selected JADUYA, TCHAIKIM and F45 in the gallery. Ready TCHAIKIM / JADUYA CTAs opened their respective details. F45 had no href, tabindex -1 and aria-disabled=true.
- Detail Header FACES return restored the selected project. Browser back / forward restored detail reading position and gallery selection. Reload preserved the reading position.
- Shared Header hide / reveal and focus reveal, Dock blue hover, real external hrefs, target/rel, and the NextFace chain pass.
- Native mobile reduced-motion rail exposes three visible overlay CTAs. A real emulated touch tap opened JADUYA; F45 remained unavailable.
- Both Dock LIVE SITE links were opened in Chrome and rendered their real sites. Both CASE STUDY links opened the expected Figma decks (JADUYA 53 slides, TCHAIKIM 30 slides).
- TCHAIKIM's existing body text, section sizes and positions relative to Hero match current Production within 1px at both 1920 and 390px. The original screen projection tests pass.
- Fresh Intro plus Hero / About / FACES / Contact scroll smoke checks pass without overflow or browser errors. Their implementations, shaders, original videos and scroll structure were not changed.
- No page exceptions or console errors occurred during integrated navigation.

Captures and measurement JSON are retained in the task's `jaduya-final` artifact directory as `local-visual-qa.json`, `local-functional-qa.json`, `local-regression-qa.json`, Hero captures, section captures and FACES captures.

## Validation and limits

- `npm run lint`: pass.
- `npm run build`: pass, including `tsc --noEmit`.
- `node --test tests/*.test.mjs`: 50 pass, 0 fail.
- `git diff --check`: pass.
- Existing Vite warning about the homepage bundle exceeding 500kB remains. No new dependency was added.
- Physical iPhone Safari and Android Chrome were not tested; the checks above use real desktop browser engines with emulated mobile sizes / touch. Nonzero device-specific safe-area values and physical browser chrome are not claimed as tested.
- Source copy `관심사에 맞는 생활 정보와 팀 추천` is retained; `팀` may be a typo for `팁`. Brand copy `‘자취'와 ‘두더지'가 만나` retains its mixed opening / closing quote styles. These have not been silently corrected.
- Main merge and Production release require the user's approval under the current brief, section 12. This branch is prepared for review; it does not change Production until approved and merged.
