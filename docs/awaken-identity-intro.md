# AWAKEN YOUR IDENTITY — interactive intro

Scope: replace only the initial homepage video. Start from main `4ab42050547a96b0c0dba08c4660f6edb9503ba8`; branch `codex/awaken-identity-intro`. Deliver for Preview review, without merging or promoting to Production.

## Implementation

- `WatchIntro.tsx` / `WatchIntro.css`: Carbon Black (#08090A), the existing WatchAssembly/case/crown assets, a black display, subtle blue ambient, and the exact Wanted Sans prompt `시계를 클릭해주세요`.
- A native button starts one GSAP timeline: wake 0.42s, HELLO fade at 0.34s, travel/reveal from 1.05 to 1.95s. No autoplay, loading animation, extra identity copy or new dependency.
- At handoff, release the scroll lock while the background is still opaque, then measure `.hero__watch-anchor`. Translate/scale the same intro assembly to that actual rectangle. Fade HELLO/display into the existing Hero face during the final 0.26s. Only the original Hero/Stage Watch is hidden until the React completion commit swaps visibility. No overlapping visible Watches.
- Resize and visual-viewport changes remeasure the travel endpoint. The fixed intro overlay blocks wheel/touch/scroll keys throughout handoff. Every listener, GSAP timeline and root lock class is cleaned up on completion or interrupted unmount.
- Enter/Space, trapped Tab focus, keyboard-only focus indication, an inert background and a live HELLO announcement are supported. Keyboard completion restores focus to the Hero heading without scrolling.
- Reduced motion uses a 0.54s sequence without travelling/scaling. A newly enabled reduced-motion preference completes an active timeline.
- `HomePage.tsx`: existing `onFinish`, `skipIntro` and route-restoration rules retained. On a completed fresh intro only, paint the matched Hero before initializing the existing GPU/pin scenes two animation frames later. Direct destinations and return visits keep immediate initialization. This avoids blocking the final handoff frame with FACES WebGL compilation.
- `WatchAssembly.tsx`: additive `intro` variant and display only; all original variants, assets, dimensions, materials, face markup and Crown behavior retained.
- `index.css`: scroll-lock ownership comment updated; existing lock rules unchanged.
- Removed obsolete `IntroVideo.tsx`, `IntroVideo.css` and their unused 8 MB `opening-watch-final.mp4` source asset. The old video is absent from the build and all tested network requests.

## Validation

Validated the minified production build using Chrome and WebKit, not only the development server.

- `npm run build`: pass (TypeScript included). The existing >500 kB homepage chunk notice remains; no new dependency.
- `npm run lint`: pass.
- `node --test tests/*.test.mjs`: 52 pass, 0 fail.
- `git diff --check`: pass.
- Nine interaction cases: Chrome 1920×1080 click, 1440×900 Enter, 1024×768 Space, 768×1024 touch, 390×844 touch, 375×667 reduced touch, 1440×900 reduced Enter; WebKit 390×844 touch and 375×667 reduced touch.
- Measured click-to-first-Hero-frame: normal 1.97–1.99s; reduced approximately 0.57–0.59s. Idle waits for input. Exact prompt/font/base, black display, HELLO, duplicate activation guard, keyboard focus, input scroll lock and final unlock/inert cleanup pass.
- Every sampled frame has exactly one visible main Watch; normal handoff endpoint matches the first Hero rectangle within 2px. No clipping, horizontal overflow, page or console errors in tested cases.
- Compared 1920, 1440, 1024 and 390 Hero/Watch/headline/anchor rectangles, document height and generated pin-spacer dimensions against the unchanged operating site: identical. Hero → About → reverse restores coordinates exactly.
- Reload after intro skips it and restores reading position. Explicit Hero/Contact/FACES destinations and all three direct project URLs skip it as before.
- Mid-transition resize/orientation, dynamic reduced-motion preference, interrupted route unmount, and classic stable scrollbar gutter: pass, no residual lock or endpoint error.
- Existing integrated browser flow: FACES drag across all 3 projects in both directions; Crown/ALL FACES → F45; project CTA and Dock links; Header; project reload/back/forward/reading position; TCHAIKIM → JADUYA → F45 navigation cycle; direct routes/trailing slash; mobile reduced-motion FACES rail: pass.

Screenshots and JSON traces are task artifacts in `awaken-intro/`. Mobile Safari coverage uses WebKit/touch emulation; physical iPhone hardware was not available.

## Review

Review the Preview homepage at a fresh `/` visit. A reload/back visit intentionally preserves the existing intro-skip rule. Use a new private window to replay the intro. Keep this branch unmerged until the user approves Preview.
