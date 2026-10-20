# TCHAIKIM & JADUYA — revised scroll interactions

2026-10-20. Branch: `codex/project-scroll-interactions`, based on the latest `codex/jaduya-final-integration` at `5ad8e32`. This report supersedes the earlier Ending-reveal approach.

## 1. Files and scope

- Removed `src/hooks/useEndingPathReveal.ts`; removed its imports and refs from `JaduyaBrandSections.tsx`. Ending CSS, road, character and copy are unchanged.
- Added `useProjectScrollEffect.ts`: scoped GSAP / native media-query lifecycle, batched image/font/resize measurements and cleanup.
- Added `useBottomSheetScroll.ts`: one reversible Y-only sheet tween.
- Added `useScrollPointFocus.ts`: shared measurement and active-point logic for Home Care and both TCHAIKIM sections.
- Updated `JaduyaExperienceSections.tsx` / `.css`: screen-only composition and refs for Main Page 02; three existing Home Care callouts receive active-state styling.
- Updated `TchaikimCaseStudy.tsx` / `.css`: refs and point/connector associations; existing green text, underline and darker connector emphasis.
- Updated the old report with a superseded notice and added this report.

No source assets, dependencies, page routing, Header, Dock, main portfolio, watch, Crown, FACES or BrandExperienceVideo code changed.

## 2. Actual interaction behavior

### JADUYA Main Page 02

Inspection confirmed `main-two-home-phone.png` already contains the expanded sheet UI; `main-two-raised-sheet.png` contains the widget editing cards. Moving only those cards would not represent the sheet opening.

The existing phone base and frame remain stationary. Two original screen images are reused inside a precisely clipped screen window: the Main Page 01 home fills the exposed background, and a clipped copy of the existing Main Page 02 UI moves with the original editing cards and halo. No bitmap was edited or regenerated. The moving composition is hidden at completion, leaving the original expanded rendering exactly intact. Reduced motion and no-JavaScript rendering also retain the original final composition.

Only Y translation changes. At 1920×1080 the travel is 167.44px → 83.72px → 0px; at 390×844 it is 97.72px → 48.86px → 0px. Phone, point cards, connectors and all surrounding layout remain stationary in document coordinates. Reverse scroll retraces the same values; fast seeking reaches the corresponding state directly. The screen window clips UI at the phone edges without moving the outer frame or exposing an empty area.

### JADUYA Home Care

The existing three callouts represent situation selection, action / cause checks, and service connection. The point nearest the viewport reading line receives the existing brand red, an underline on its existing emphasized phrase, and a darker existing connector. Exactly one point is active. Other copy remains readable with its original styling and full opacity. The long phone image, its internal timeline, alpha masks and callout coordinates are unchanged.

### TCHAIKIM Main / Shop

Both sections reuse the same focus hook. Main activates brand-line discovery → brand visual → brand story; Shop activates new products → search / filter → fit / styling. The existing green emphasis is extended to the active paragraph; its emphasized phrase is underlined and the associated original connector is darkened. No text, screenshot or connector moves, scales or fades.

### JADUYA Ending and Brand Experience

Ending is completely static. No `jaduya-ending-path` trigger or clip-path remains. The road, character and message keep their original geometry, relative placement and full opacity. Brand Experience is unchanged; its existing autoplay, exit pause, saved-position resume, manual pause, touch controls and reduced-motion behavior were regression-tested.

## 3. Before / after and continuous evidence

The chat's `scroll-interactions-v2` artifacts contain fresh before captures from both desktop and mobile, before-layout measurements from a separate server running the exact base commit, and these four MP4 recordings:

- `jaduya-sheet.mp4`
- `jaduya-home-care.mp4`
- `tchaikim-main.mp4`
- `tchaikim-shop.mp4`

Each recording uses actual incremental wheel scrolling forward and backward. `evidence.json` records the observed active point or sheet offset after each segment. Desktop point screenshots use the same four prefixes with `-0`, `-1`, `-2`; mobile point sequences are `mobile-home-care-*`, `mobile-main-*` and `mobile-shop-*`. `sheet-states-1920.jpg` and `sheet-states-390.jpg` show the same phone at 0 / 50 / 100%. `ending-restored-mobile.png` shows the complete original Ending.

Static screenshots are supplementary; interaction acceptance is based on measured state changes and the four scroll recordings.

## 4. Scroll ranges and lifecycle

Sheet progress starts when the phone top reaches 85% of live viewport height and ends when it reaches 35%: a 50vh range with no pin. Travel is the smaller of 14% of measured phone height and 18% of viewport height. The exact original image placement is restored at progress 1.

Point activation uses actual measured document coordinates, not equal thirds of a section. The viewport center is compared with paragraph / callout centers; changes occur halfway between their measured anchors. On responsive TCHAIKIM Main, the three paragraphs share one row. Its first text top, middle paragraph center and last text bottom provide distinct, real reading anchors, so the visible row advances left-to-right without moving its text or inventing a full-section timeline.

Each detail owns two unpinned triggers. Image loads, font readiness and ResizeObserver callbacks refresh owned measurements in one queued animation frame. Native resize also refreshes live viewport anchors. There is no scroll-driven React state. Reduced motion removes owned triggers, attributes and transforms; original default styling remains. Context cleanup removes observers, listeners and pending work on route exit. Media changes are scoped rather than refreshing unrelated GSAP scenes.

## 5. Responsive and functional results

Both details pass at 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 430×932, 390×844 and 375×667. All three point states activate and reverse at every size. Sheet offsets are continuous at 0 / 25 / 50 / 75 / 100% and reverse. Exactly one point is active per group; all callout / sheet-layer opacity stays 1, with existing source alpha unchanged; no new pins or horizontal overflow.

The complete final / reduced-motion layout matches the base commit across all 16 combinations: maximum original-element coordinate error **0px**, identical text, font sizes, image dimensions, shared plum geometry and document heights. The extra screen layers are excluded from original-asset comparisons and do not change document flow. The source bitmaps remain untouched.

Live resize across mobile, tablet and desktop, rapid / arbitrary scroll seeking, dynamic reduced motion without a scroll reset, reload restoration, route cleanup and browser-back restoration pass. Mobile WebKit also passes sheet / point forward and reverse behavior and reduced-motion cleanup.

Brand Experience passes desktop Chrome and mobile WebKit checks: center autoplay, actual-video exit pause, immediate saved-position resume, manual pause through three returns, rapid scroll, touch play / pause, initial reduced motion, autoplay rejection with existing poster / control and pause on unmount. The component itself has no diff.

Integrated Crown / ALL FACES, both-direction WebGL drag, persistent CTA, Header hide / reveal, Dock links, NextFace, native mobile rail, reload and back / forward checks pass. No page or console errors were observed.

## 6. Figma differences

Final Main Page 02 placement and all original static geometry are retained. Only the in-progress sheet position and the requested active color / underline / connector emphasis differ intentionally from the static Figma state. Reduced motion restores default source styling. Figma reference nodes used: JADUYA `2098:23`, `2100:97`; TCHAIKIM `271:719`, `272:822` in `9kXZ17uZOK7WinbmInLvUH`.

Pre-existing responsive scaling is retained: at 1920px, TCHAIKIM's Main stage is 1080px wide versus the native Figma 1200px, and Shop is about 1388px versus 1542px. These existing layout adaptations were not changed by the interaction work.

## 7. Build and code checks

- `npm run build`: pass, including TypeScript.
- `npm run lint`: pass.
- `node --test tests/*.test.mjs`: 50 pass, 0 fail.
- `git diff --check`: pass.
- Existing homepage bundle-size warning remains. No dependency was added.

## 8. Remaining limits and release scope

No known unresolved issue in the four requested interactions. Physical iPhone / Android hardware and OS-specific power-saving settings were not tested; mobile checks use Chrome emulation and WebKit. Work remains on its separate review branch. Main merge and Production release require the owner's approval, as requested.
