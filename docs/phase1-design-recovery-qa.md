# PHASE 1 — TCHAIKIM / JADUYA design recovery

2026-10-20. Review branch: `codex/phase1-design-recovery`, created from the freshly fetched `origin/codex/jaduya-final-integration` at `5ad8e32`. The working tree was clean. Historical reference: `6113666218bd28e100eb0033cc54adde4b5aa094`.

## Verified regression and repair

`5ad8e32` added `useEndingPathReveal` to `JaduyaEnding`. The hook animated the entire rotated road frame with `clip-path: inset(0% 0% 100% 0%)` → `inset(0%)`. This is a rectangular image crop rather than a reveal following the illustrated path. At entry the road disappeared; halfway through the image acquired a straight cut edge. Forward and reverse scrolling reproduced the problem on the actual branch deployment.

Removed only the hook import, its two refs and its invocation from `src/components/Projects/JaduyaBrandSections.tsx`. A source / test reference search found no other consumers, so `src/hooks/useEndingPathReveal.ts` was deleted. No replacement effect was introduced. Road, character and copy now remain in their complete static state, including during reverse scrolling and reduced motion.

All Ending layout CSS, original images, dimensions, positions, rotations, typography and responsive rules are unchanged. At 1920px the road retains the 2345.755 × 1516.044 stage at (-279, -208.08), 173.83° rotation and Y reflection; the character retains its 841.823 × 680.794 stage at (-52.91, 199.1) and 8.41° rotation. Figma Ending `2100:150` was freshly read and its render compared with the repaired browser capture.

## CSS history audit — differences are not automatically errors

The four requested stylesheets have **zero diff** between `6113666` and `5ad8e32`, and this recovery changes none of them. No whole-file checkout / reversion was used.

| Commit / area | Actual change and screen effect | Decision |
| --- | --- | --- |
| `5ad8e32`, Ending TSX / hook | Road is hidden / rectangularly cropped according to scroll progress, although its geometry is unchanged | Remove the reveal; restore complete static artwork |
| `5ad8e32`, BrandExperienceVideo | Actual video bounds determine offscreen pause; playback position is restored before resuming | Keep the verified playback fixes; no design change |
| `51bd058`, JaduyaCaseStudy.css | Common responsive typography tokens, aligned Hero metadata, one shared red / green DESIGN underlay | Keep: requested in the preceding Figma alignment brief; source image phase / dimensions verified |
| `51bd058`, JaduyaBrandSections.css | Source font sizes / weights, 214px former bubble height and 140% Ending leading | Keep approved alignment; later bubble overrides are preserved |
| `51bd058`, JaduyaExperienceSections.css | Source connector render coordinates, Home Care text width / weight and former soft-edge dimensions | Keep approved corrections; later Home Care masking supersedes the former cover layers |
| `1fc764b` | Bubble text becomes 24px; three Main 02 phone-facing connector legs shortened by 16 native px | Keep: explicit user overrides to Figma, with original SVGs retained |
| `6113666` | Content-fitted bubble frames / balanced placements; alpha masks replace three Home Care rectangular blur covers | Keep: explicit approved fixes; raw phone / timeline PNG unchanged |
| `722d9be`, TchaikimCaseStudy.css | Main stage 1200 → 1080px and Shop 1542 → 1388px cap, plus reduced surrounding spacing | Keep: the earlier TCHAIKIM refinement brief explicitly requested approximately 10% smaller Main / Shop visuals and tighter spacing |
| `5bc87de`, TchaikimCaseStudy.css | Hero fits the actual device bounds and available viewport; mobile copy / visual / metadata use separate rows | Keep: requested Hero viewport fit; Main / Shop body layout not changed by this commit |

The earlier experimental `codex/project-scroll-interactions` branch was not copied into this phase. Its bottom-sheet / point-focus implementation remains separate. No new scroll interaction, pin, wrapper or dependency was added here.

## Visual comparison and measurements

Fresh Figma context / renders: JADUYA root `2068:363`, TCHAIKIM root `98:24`, Ending `2100:150`, Main `271:719` and Shop `272:822`. Local original asset callsites and their effective browser geometry were inspected. Existing approved Figma exceptions remain: 24px compact bubbles, Main 02 connector spacing, Home Care edge masks, Hero metadata, TCHAIKIM period / blue kicker / punctuation, and the previously requested TCHAIKIM scale adjustments. No image, mockup, text or background graphic was replaced.

Compared three independently served revisions: archived `6113666`, current parent `5ad8e32` before editing, and the repaired branch. Both supplied parent deployment URLs were also opened and captured at all three requested viewport dimensions, with all visible image assets loaded and no horizontal overflow. Native Chrome reserves a 15px scrollbar; local headless Chrome uses overlay scrollbars, so comparisons within each browser retain identical viewport settings.

| Viewport | TCHAIKIM | JADUYA | Result |
| --- | --- | --- | --- |
| 1920 × 1080 | 10 sections including NextFace | 9 design sections, then NextFace | Pass |
| 1440 × 900 | Same existing responsive layout | Same existing responsive layout | Pass |
| 390 × 844, touch emulation | Existing mobile reflow retained | Existing mobile reflow retained; complete static Ending | Pass |
| 390 × 844, WebKit / touch / reduced motion | Original video controls / static fallback retained | Complete static Ending, no clipping | Pass |

At every Chromium size, all measured section / image / text / connector / stage bounds, font sizes, weights, line heights, colors, transforms, links and document heights after repair match `6113666` exactly. Before repair, the only measured design-state difference from that reference is the Ending road frame's clip-path. The listed CSS files and all original assets remain byte-for-byte unchanged.

Before / after static section pixels also match, apart from the intended road restoration and 9 one-channel, one-level rasterization differences in the 1920px NextFace title (maximum channel delta 1; identical geometry). The playing Brand Experience video is excluded from static pixel equality because its frame advances. DESIGN background continuity, Home Care long-scroll joins, phone / card proportions, Ending composition, TCHAIKIM Main / Shop captures and connectors were visually checked. Mobile Shop retains its existing overlapping capture / callout layout; it was not redesigned in this phase. No new text overlap, clipping, horizontal overflow, pin spacer or scroll-length change was introduced.

At 1920px JADUYA Brand / Main 01 / Main 02 / Home Care / Ending remain 1092 / 1715 / 1828 / 2639 / 1080px high. At 390px Ending remains 720px high. No document jump or empty pin space is introduced.

Ending clip-path samples at 10%, 50%, 100%, then reverse to 50%:

- Before: `inset(0% 0% 90%)`, `inset(0% 0% 50%)`, `inset(0%)`, `inset(0% 0% 50%)`.
- After: `none`, `none`, `none`, `none`; no inline clip-path and section scrollTop remains 0.

## Regression and commands

- `npm run build`: pass, including TypeScript. Existing homepage chunk-size warning remains; no dependency was added.
- `npm run lint`: pass.
- `node --test tests/*.test.mjs`: 50 pass, 0 fail.
- `git diff --check`: pass.
- No browser page exceptions, console errors, missing / zero-size visible images or horizontal overflow in the local matrix.
- Existing TCHAIKIM actual video source / poster, normal-speed autoplay, actual-video exit pause, playback-position resume, manual pause across three return cycles, manual retry after rejected autoplay, mobile touch controls and route-unmount pause pass in Chromium and mobile WebKit. Reduced motion remains paused until explicitly played.
- Header / Dock / NextFace hrefs and route data are unchanged. Existing routing, gesture and screen-projection regression tests pass. No homepage implementation was changed.
- Physical phones and device-specific safe areas were not tested; mobile checks use real browser engines with emulated viewport / touch settings.

## Screenshot evidence

Task artifacts are in the local `phase1-design-recovery` visualization folder. They are not runtime assets or committed screenshots.

- `baseline-layout.json`, `before-layout.json`, `after-layout.json`, `layout-comparison.json`: all measured comparisons.
- `deployed-before-layout.json` and `deployed-before-{project}-full-{width}.png`: supplied branch deployment audit.
- `{baseline|before|after}-{project}-full-{width}-chrome.png`: identical-view comparisons for 1920 / 1440 / 390; WebKit reduced-motion captures are also saved.
- `compare-ending-{1920|1440|390}.jpg`: full Ending before / after, using the scroll-entry state for the before render.
- `compare-ending-mid-{width}.jpg`: same middle-progress viewport before / after.
- `compare-{jaduya|tchaikim}-{width}.jpg`: all sections, before left / after right.
- `{before|after}-{section-class}-{width}.png`: original-resolution section crops; `qa-{section-class}-{width}.jpg`: readable Brand / Home Care / Main / Shop review crops.
- `figma-ending.png`, `figma-tchai-main.png`, `figma-tchai-shop.png`: fresh Figma reference renders only.
- `video-qa.json`: playback regression evidence.

## Review boundary

This completes PHASE 1 design recovery for review. Commit / push stays on the separate recovery branch. No main merge, Production release or PHASE 2 implementation is performed. JADUYA MAIN PAGE 02 bottom-sheet interaction must wait for the user's approval of this result.
