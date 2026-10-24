# F45 KOREA — final detail implementation

## Scope and source

Source: [final Figma, 79:970](https://www.figma.com/design/9kXZ17uZOK7WinbmInLvUH/portfolio?node-id=79-970&m=dev). Fresh root/child design contexts, metadata and section screenshots were inspected. The main is exactly **12,945px** high at 1920×1080, before the existing NextFace navigation.

| Section | Figma node | Desktop Y / height |
| --- | --- | --- |
| HERO | 79:987 | 0 / 1080 |
| OVERVIEW | 79:988 | 1080 / 604 |
| AS-IS / TO-BE | 79:989 | 1684 / 1664 |
| DESIGN CONCEPT | 2134:404 | 3348 / 922 |
| MAIN PAGE 01 | 2144:523 | 4270 / 3237 |
| MAIN PAGE 02 | 2144:549 | 7507 / 3294 |
| RESPONSIVE EXPERIENCE | 2147:640 | 10801 / 1064 |
| ENDING | 2134:482 | 11865 / 1080 |

The existing four sections match the latest design and retain their visual implementation. Only the concept's node annotation was corrected because `79:991` now contains additional sections. The older four-section scope in `f45-figma-implementation.md` is historical and is superseded by this eight-section delivery.

## Added implementation

- `F45MainPages.tsx` / `.css`: original notebook + longscroll image, separate PHASE image/crop/blur, complete five annotations, original connectors and circle decorations. Desktop coordinates follow Figma. Tablet/mobile reflow the complete annotations below the images at readable sizes; all six beginner-care steps, app guide and footer remain in the original capture.
- `F45ResponsiveExperience.tsx` / `.css`: Figma's 1100×660 device composition. The PC display is x99 / y59 / 663×373 inside that frame. Its existing transparent hole exposes the video; opaque monitor bezels/tablet/iPhone naturally occlude it. No device asset was edited and no perspective correction is required for this front-facing monitor.
- `F45Ending.tsx` / `.css`: actual bright battle-rope photograph and both Figma gradients, original 64px copy/line breaks on desktop. Mobile adapts the crop and readable copy width so the face remains visible.
- `F45CaseStudy.tsx`: imports the added sections in the required order, retaining shared Header, Dock, NextFace and route entry animation.
- `public/projects/f45/figma-assets.json` and `ASSETS.md`: asset provenance and dimensions. Sixteen new unmodified Figma assets, the original MP4 and its first-frame poster were added. The previous eleven Figma assets and older source assets are preserved.

All runtime media is local. No temporary Figma URL, complete-section screenshot, placeholder, alternative video, new dependency or new shared style is used. Korean uses the existing Wanted Sans; English headings use Inter. The existing F45 Inter Regular resource alias is preserved.

## Video behavior

The exact `f45_korea_scroll_1080p60_v2.mp4` was found in Downloads and copied byte-for-byte. H.264, 1920×1080, 60fps, 34.5 seconds, 7,048,885 bytes; SHA-256 `385bd10066a998e19e27c466258ba005b119c645adcb35c7b4a1c4cea0f46622`.

An IntersectionObserver arms the source within 600px, with metadata preload. Another observes the screen itself: muted inline playback starts when at least 25% is visible and pauses on exit. It preserves playback position, loops, respects manual pause, pauses on hidden-tab notification and on route unmount, and cleans up both observers/listeners. Pending playback requests are guarded. WebKit's offscreen suspension required explicitly restoring the remembered currentTime before play, following the existing TCHAIKIM approach.

Reduced motion keeps the poster and avoids loading the MP4 until the user chooses Play. The keyboard-accessible play/pause control has visible focus and a 44px touch target. Autoplay rejection exposes manual playback; a failed request hides the video and retains the original-video poster, with an accessible status. Only PC is animated; tablet/iPhone remain the untouched PNG.

## Visual and responsive QA

Chrome: **1920×1080, 1440×900, 1280×800, 1024×768, 768×1024, 430×932, 390×844, 375×667**. WebKit touch/reduced-motion: 390×844 and 375×667. Actual desktop Chrome was also checked at 1920×1080. No horizontal overflow, clipped text, broken image, unexpected pin spacer, missing section or console/page error was found.

The Figma/React desktop comparison preserves all section heights, positions, colors, five connector directions and the seven-program overlay. An invalid length used as a CSS scale was caught during integration; SVG assets now render through scaled wrappers without changing their source root attributes. Mobile line-boundary spaces and Ending crop/copy were corrected during visual review.

Raw mean absolute RGB channel differences (0–255), including font antialiasing/resampling: MAIN 01 approximately 1.28 / 1.13 / 1.19; MAIN 02 0.52 / 0.63 / 1.00; ENDING 2.37 / 2.33 / 2.27. Video frames differ naturally over time. These are image differences, not a perceptual similarity score or a claim of pixel identity.

Actual browser video checks passed in desktop Chrome, mobile Chrome/reduced motion, mobile WebKit and WebKit/reduced motion: deferred source, autoplay/manual start, stable manual pause, exit pause, position-preserving reentry, loop boundary, display geometry, hidden-tab event response and route unmount. Autoplay rejection and network failure were deliberately injected to verify both fallbacks. Hidden-tab notification was simulated in the automated harness. **Physical iPhone/iPad Safari was unavailable; WebKit emulation is not physical-device certification.**

## Protected behavior and validation

HOME, FACES active entry/infinite drag, Crown/ALL FACES, F45 direct/trailing-slash route, Header hide/reveal and HERO/CONTACT/FACES navigation, browser back/forward and reload reading restoration, and TCHAIKIM → JADUYA → F45 → TCHAIKIM NextFace all passed. F45 retains only the real LIVE SITE link, including existing external-link semantics and hover; no fictitious CASE STUDY was added.

TCHAIKIM/JADUYA at 1920/1440/390 were compared with the previous branch's six-case baseline: **zero recorded layout/style/link differences**. JADUYA's Ending remains static. No App, route, FACES/Watch, shared component, other-project file or asset was modified.

- `npm run build`: passed, including TypeScript.
- `npm run lint`: passed.
- `node --test tests/*.test.mjs`: 52 passed, zero failed.
- `git diff --check`: passed.

The existing 723.16kB homepage chunk warning remains. F45 adds no scroll listener, animation loop or dependency; the single 7.05MB video is not requested at HERO. Original long screenshots stay lazily loaded. No physical-device FPS claim is made.

## Git and review

Base: `codex/f45-figma-implementation`, `539fbb2d8c5f541422ddb5b4e0049f688f3e7954`. Work branch: `codex/f45-detail-final-implementation`. The base implementation is not in `main` (`51dc4bf` at verification), so the review PR targets **codex/f45-figma-implementation** to isolate this final expansion. Preview review precedes any main/Production change.

Task QA artifacts under `f45-detail-final-implementation` include every requested viewport, section comparisons, full-page captures, video fallback/playback screenshots, `visual-qa.json`, `video-qa.json`, `font-route-qa.json`, `local-functional-qa.json`, and `existing-page-comparison.json`. No required implementation asset is missing.
