# TCHAI KIM case study QA

Implemented from Figma `9kXZ17uZOK7WinbmInLvUH / 98:24`, with the approved request taking precedence for Hero CTAs, Brand Experience, Result, and Next Face. The existing route is `/projects/tchaikim`; the existing Vercel project remains the deployment target.

## Source assets and design

- Figma's original image/SVG assets are saved under `public/projects/tchaikim`. The page is native React/CSS, not a flattened screenshot.
- The Lamoric title is Figma's original outlined SVG. Wanted Sans is the locally supplied variable webfont, with its OFL license.
- Brand footage is the supplied `Downloads/tchaikim_brand_scroll_1080p60_v2.mp4`, copied without transcoding: H.264, 1920×1080, 60 fps, 36.016667 seconds, 7,812,324 bytes.
- Source and committed media SHA-256: `290f28f93ddbed0bc01440cd965f0601cd744987cf2ad366777874ea3e5e24cd`. The poster is extracted from that footage.
- Hero devices, moodboard images, Main/Shop captures, callout SVGs, and Result imagery were checked for loaded pixels and effective geometry in all five viewports. The seasonal moodboard's native Figma 90° crop is retained.
- Independent Responsive section and repeated Hero/Result CTAs are absent. Main capture has a thin boundary and restrained shadow.
- JADUYA is next in the shared project sequence. Its detail page does not exist, so Next Face is visibly unavailable and has no invented URL. The reusable component wraps its entire padded area in a link when a real destination is supplied.

## October 14 visual refinement

Compared the latest Figma frame with the prior production page at 1920×1080, 1440×900, 1024×768, 402×874, and 375×812. Original React sections and navigation are retained.

- Hero removes the English subtitle and shows the approved period, role, and two-line contribution. Hero and Overview use continuous source-image geometry with paper fades.
- Overview body 24→21px; desktop circles 400→330px; concept maximum width 1740→1600px; Main scene 1200→1080px; Shop scene 1542→1388px; Next Face maximum type 220→180px with Wanted Sans.
- The desktop document height measured 15,382→13,407px. Section heights: Overview 642→514px, Problem 1700→1304px, Concept 1304→1099px, Main 3644→3235px, Shop 3030→2673px, Brand 1579→1393px, Next Face 762→610px. Values include responsive content and rounded measurement.
- Main and Result backgrounds use native **image-only** Figma layer exports (271:720 / 272:926), preserving original crop and paint. No flattened section screenshot, added blur, or CSS opacity approximation is used.
- Shop 349 and 351 share Figma's underlying source image hash. Their crop transforms differ; the rear keeps the original 349 crop/overlay, while `image351.png` is the native front-layer crop exported from 272:830. `image351-source.png` preserves provenance and is not requested by the page.
- All five moodboard photographs, their top alignment, and the native seasonal rotation/crop were checked. Main/Shop callouts and original connector SVGs are retained.
- Brand replaces the CSS bezel/chin/stand/foot with Apple's original frontal silver iMac photograph. Its 16:9 live screen retains all video controls. Width/height attributes reserve image space before lazy loading, preventing section-center movement. Generated candidates were rejected and are not shipped.
- Result restores the original architectural background, desktop/tablet/mobile composition and approved Korean three-line headline. Next Face uses loaded Wanted Sans; JADUYA remains unavailable because no real route exists.
- Shared Dock now uses Frost Blue glass, Carbon Black text, Metallic Gray border/divider and restrained per-link hover. Runtime CASE STUDY links share the approved Deck constant `8K1OMzkKzmEmkV2Kejd43q`; LIVE SITE is unchanged.
- Clicking CASE STUDY opened the exact new Deck in a new tab. After signing in with the user-specified account, its actual TCHAI KIM cover and 30-slide presentation were visible.
- The original 1920×1080/60fps video is unchanged. Chrome and WebKit decoded and played it at the section center; initial visibility stays paused, leaving the center pauses, and reentry resumes. Reduced motion requires manual playback.
- Media failure now also cleans up the failed element's ResizeObserver, event listeners, animation frame and playback reconciliation. Injected network failure and autoplay rejection/manual recovery pass.

No dependency, source-video, FACES order, Crown interaction, or homepage shader changes. Checks below were repeated locally for this refinement; prior full infinite-drag validation remains from the initial case-study release.

## Local validation

Commands: `npm run lint`, `npm run build` (includes TypeScript), `node --test tests/*.test.mjs`, and `git diff --check`.

Chrome visual/function checks: 1920×1080, 1440×900, 1024×768, 402×874, and 375×812. WebKit mobile checks: 402×874 and 375×812; reduced-motion manual playback also checked. This is engine/device emulation, not physical iPhone testing.

- No horizontal overflow; Header name centered independently of side labels; Header direction threshold, focus visibility, and Dock safe placement pass.
- Brand video remains paused on first visibility, starts when the actual section center enters the middle 20%, pauses outside a wider exit band, and resumes from the previous time. Manual pause survives scroll reentry; reduced motion requires manual playback.
- Visibility-change simulation pauses/resumes without resetting time. Injected media failure preserves the source poster; injected autoplay rejection offers manual recovery.
- Watch-video and text CTA both enter the detail route. Mobile touch, keyboard Enter, and drag-release suppression pass. Duplicate transitions are synchronously blocked.
- FACES return selects TCHAIKIM without replaying Intro. Header Hero/Contact destinations, direct refresh, reading-position Back/Forward, interrupted restoration, and all three saved Face selections pass.
- Detail navigation leaves no homepage Watch stage, canvas, pin spacer, or overlay behind. Homepage animation contexts and media are unmounted and cleaned up. Direct detail loading excludes the separate homepage Three/OGL bundle.
- Initial-release regression included three infinite drag loops in each direction. The refinement repeated all three Crown selections; project order remains TCHAIKIM → JADUYA → F45. Contact modal, Crown focus restoration, and all three All Faces compositions pass. No application console errors in the checked scenarios.

The existing large homepage chunk warning remains. No libraries or package-lock changes were introduced. No FPS/heap benchmark or physical-device claim is made.

## Release verification

Production verification is performed against the merged main deployment, separately from these local checks. Git/PR/deployment identities and final scenarios are reported in the task completion message.
