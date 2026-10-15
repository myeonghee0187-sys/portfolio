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

## October 14 final details and award

This pass follows the earlier refinement above and supersedes its thin Main boundary and per-link Dock hover. Started from clean main `555653e5de4e7680d096f031310a30ff20338462` on `codex/tchaikim-final-details`.

- Dock keeps its two destinations, new-tab behavior, position and mobile safe areas. The entire capsule now uses layered translucent Frost Blue glass, a Metallic Gray border, top highlight and restrained shadow. Individual links stay transparent during hover and press; only the text receives a readable steel/silver highlight. Fine-pointer hover, separate 2px keyboard focus and reduced-motion handling are verified.
- Hero adds `수상 / 글로벌 브랜드, 커머스 경험 디자인 부문 최우수상` above period, role and the unchanged two contribution lines. No badge, icon or separate card. The label/value grid and compact spacing retain the existing placement; mobile values wrap inside the viewport.
- Metadata uses Wanted Sans Variable at weight 450 throughout. Chrome CDP `CSS.getPlatformFontsForNode` confirmed the actual custom Wanted Sans Variable renderer for Korean award text, labels, role and contribution, with no Korean fallback (glyph counts 2/27/36/25). This is rendered-font verification in addition to computed styles and screenshots.
- Checked all nine handoffs. Problem's prior 132% gradient endpoint did not equal Insight's starting color; both now share `--tchai-sage-handoff: #a0b6b2`. Main's native image fades only at its outer top/bottom edges; its content, photograph and callouts keep their sharpness. Brand ends at paper and Result's native background starts through a short paper mask. No additional blur is applied to section imagery. Sampled left/center/right pixels immediately above/below the eight continuous boundaries differ by 0–1 RGB level. Result → Next Face deliberately retains the approved black footer separation.
- Main capture has zero border, no inset/spread shadow, and only `0 18px 60px rgb(8 9 10 / .055)`. MacBook, long capture, scene dimensions, connector SVGs and callout positions are unchanged.

### Genuine screen captures and preserved frames

Figma Hero `255:681` and Result `272:927` share the flattened `image340.png` (1672×941, 892,706 bytes), not an editable set of screen layers. That original asset remains byte-for-byte unchanged. `ResponsiveDevices` reuses it in both sections and projects real browser captures onto the measured display corners; clipped foreground outlines preserve the original tablet/phone occlusion, rounded display corners, notch and home indicator. ResizeObserver updates scale only on resize and disconnects on unmount. There is no new scroll listener or animation loop.

The site was captured in its genuine desktop/mobile responsive states, at portrait proportions matching the existing tablet and phone displays. No invented UI, generated imagery, sharpening filter or enlargement of the old screen pixels is used. Tablet capture starts at DPR 4 to select the site's higher-resolution source photograph, then is downsampled to final DPR 2; the other two are captured directly at DPR 2.

| Shared capture | Browser viewport | Output pixels | Bytes |
| --- | --- | --- | --- |
| Desktop / Bespoke | 1440×900, DPR 2 | 2850×1972 | 3,380,692 |
| Portrait / Shop | 460×1000, DPR 4 → 2 | 890×1400 | 844,138 |
| Mobile / Bespoke | 320×1000, DPR 2 | 610×1400 | 723,152 |

All three are lossless WebP, cached and reused by Hero/Result rather than duplicated. Measured effective pixel resolution exceeds 2× the projected display width at all five requested page viewports. Original frame/control pixels were compared with a browser render of `image340.png` at the identical scale: phone notch, phone bezel over desktop, tablet bezel and desktop chin match exactly, while the display interiors change to the genuine captures. Original site photograph quality still bounds its photo detail; no artificial detail is claimed.

### Final local checks

- Chrome: 1920×1080, 1440×900, 1024×768, 402×874 and 375×812. Compared Figma and prior-production screenshots with the updated Hero, Main, Result, nine boundaries and Dock hover/focus. No horizontal overflow, clipped metadata, title overlap, image failures or Dock off-screen placement.
- Header direction/focus, direct detail refresh, FACES return, Back/Forward, Crown/All Faces selections, Contact modal and video center-entry/pause/resume/manual pause pass. WebKit 402/375 mobile and reduced-motion manual playback pass. No application console or page errors in those checks.
- Pure projection tests cover every display corner at all five responsive scales and an interior grid with no perspective poles or orientation reversals. Full suite: 48 tests.
- No dependencies, source video, homepage shaders, FACES data/order, Crown behavior or Next Face destination changed. JADUYA remains the existing unavailable detail; this task adds no JADUYA page. Physical-device and FPS/heap benchmark claims are not made.

Final lint, TypeScript/build and live verification are recorded with the release identities in the completion report.

## October 16 UI detail pass 3

Started from clean merged main `5a508e5c2da798d751fccf7c08c6ce151b6d1d16` on `codex/tchaikim-ui-polish-3`. Re-read the current source and production build, and requested fresh Figma context/screenshot for `98:24` and Brand heading `2014:8` before implementation.

- Dock removes the previous clipped metallic text gradient. Hover and keyboard focus use exact Primary Blue `#186DE5`, a restrained 5–6px low-opacity glow and 240ms transitions. The capsule uses a more neutral translucent backing, layered reflection, fine border, inset highlights and a softened/lifted backdrop so Carbon text remains readable on light and dark sections. No per-link fill, blend mode or new menu state. Dimensions, two destinations, new tabs, mobile safe areas and 44px touch targets are unchanged; WebKit backdrop styling is explicit.
- The Overview photograph ended inside its section: desktop 504/514px, 1440 width 420/514px, 1024 width 358/514px, mobile 383/440px. The overlay alone left a visible image edge, especially at intermediate/mobile sizes. An image-only lower mask now reaches transparency 20px before that edge; the next section holds paper for its initial 32–80px before entering Sage. Hero/Overview upper handoff, copy geometry, typography and section heights are unchanged at all five viewports. Comparison pixels around the old 1024 image edge change from up to 69 RGB levels to zero; no whole-section opacity or extra blur is added.
- Brand heading now has exactly two semantic items: `Brand Experience` and `전통의 결을 따라 흐르는 브랜드 경험`. The shared section label/title hierarchy is reused, uppercase transform is disabled only here, and the old slogan/third description are removed. The approved iMac photograph, live screen geometry and source video remain unchanged.
- Video controls are centered against the actual 16:9 screen, not the iMac frame, with 48–60px Dark Glass buttons and simple SVG Play/Pause icons. While playing, opacity/pointer events hide the control until a fine-pointer hover, a touch reveal or keyboard focus. Paused video always exposes Play. Touching the screen reveals controls for 2.4 seconds without changing playback; tapping the separate button changes intent. Keyboard focus is preserved and Enter/Space operate the real button. Reduced motion removes the UI transition and continues to require manual playback.
- Existing playback reconciliation, center-entry/exit hysteresis, muted/loop/playsInline attributes, manual intent, visibility handling, blocked-autoplay recovery and previous-time resume are retained. Touch UI uses a separate state and one cleared timeout; it adds no scroll listener, media element or rendering loop.

Compared before/after screenshots at 1920×1080, 1440×900, 1024×768, 402×874 and 375×812, including light/dark Dock, Overview handoff, Brand hierarchy and visible/hidden controls. Chrome tests use actual Tab traversal; WebKit mobile emulation validates explicit keyboard focus plus Space/Enter because native Tab traversal is not exposed by that emulation. Physical iPhone testing is not claimed.

Detailed UI checks cover first-visible paused, automatic center play, hover show/hide, touch reveal/timeout, ≥44px targets, exact control centering, manual pause across scroll reentry, automatic pause/resume from the prior time, hidden-control keyboard access, live aria-labels and reduced motion. Existing functional/edge/home regression covers Header, navigation/history, route cleanup, visibility simulation, poster on media failure, autoplay rejection/manual recovery, three Crown/All Faces selections and Contact. Release identities and final command/live outcomes are recorded in the completion report.
