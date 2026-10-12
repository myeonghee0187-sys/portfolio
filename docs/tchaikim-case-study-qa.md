# TCHAI KIM case study QA

Implemented from Figma `9kXZ17uZOK7WinbmInLvUH / 98:24`, with the approved request taking precedence for Hero CTAs, Brand Experience, Result, and Next Face. The new route is `/projects/tchaikim`; the existing Vercel project remains the deployment target.

## Source assets and design

- Figma's original image/SVG assets are saved under `public/projects/tchaikim`. The page is native React/CSS, not a flattened screenshot.
- The Lamoric title is Figma's original outlined SVG. Wanted Sans is the locally supplied variable webfont, with its OFL license.
- Brand footage is the supplied `Downloads/tchaikim_brand_scroll_1080p60_v2.mp4`, copied without transcoding: H.264, 1920×1080, 60 fps, 36.016667 seconds, 7,812,324 bytes.
- Source and committed media SHA-256: `290f28f93ddbed0bc01440cd965f0601cd744987cf2ad366777874ea3e5e24cd`. The poster is extracted from that footage.
- Hero devices, moodboard images, Main/Shop captures, callout SVGs, and Result imagery were checked for loaded pixels and effective geometry in all five viewports. The seasonal moodboard's native Figma 90° crop is retained.
- Independent Responsive section and repeated Hero/Result CTAs are absent. Main capture has a thin boundary and restrained shadow.
- JADUYA is next in the shared project sequence. Its detail page does not exist, so Next Face is visibly unavailable and has no invented URL. The reusable component wraps its entire padded area in a link when a real destination is supplied.

## Local validation

Commands: `npm run lint`, `npm run build` (includes TypeScript), `node --test tests/*.test.mjs`, and `git diff --check`.

Chrome visual/function checks: 1920×1080, 1440×900, 1024×768, 402×874, and 375×812. WebKit mobile checks: 402×874 and 375×812; reduced-motion manual playback also checked. This is engine/device emulation, not physical iPhone testing.

- No horizontal overflow; Header name centered independently of side labels; Header direction threshold, focus visibility, and Dock safe placement pass.
- Brand video remains paused on first visibility, starts when the actual section center enters the middle 20%, pauses outside a wider exit band, and resumes from the previous time. Manual pause survives scroll reentry; reduced motion requires manual playback.
- Visibility-change simulation pauses/resumes without resetting time. Injected media failure preserves the source poster; injected autoplay rejection offers manual recovery.
- Watch-video and text CTA both enter the detail route. Mobile touch, keyboard Enter, and drag-release suppression pass. Duplicate transitions are synchronously blocked.
- FACES return selects TCHAIKIM without replaying Intro. Header Hero/Contact destinations, direct refresh, reading-position Back/Forward, interrupted restoration, and all three saved Face selections pass.
- Detail navigation leaves no homepage Watch stage, canvas, pin spacer, or overlay behind. Homepage animation contexts and media are unmounted and cleaned up. Direct detail loading excludes the separate homepage Three/OGL bundle.
- Regression: three infinite drag loops in each direction; project order and Crown selection remain TCHAIKIM → JADUYA → F45. Contact modal, Crown focus restoration, and all three All Faces compositions pass. No application console errors in the checked scenarios.

The existing large homepage chunk warning remains. No libraries or package-lock changes were introduced. No FPS/heap benchmark or physical-device claim is made.

## Release verification

Production verification is performed against the merged main deployment, separately from these local checks. Git/PR/deployment identities and final scenarios are reported in the task completion message.
