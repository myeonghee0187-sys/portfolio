# AWAKEN YOUR IDENTITY — interactive Watch intro

The homepage's opening video is replaced by an input-driven Watch wake sequence. Release branch: `codex/awaken-identity-intro`; PR #37 targets main. The release includes the original intro replacement and its visual refinement, validated together before Preview review and Production deployment.

## Behavior

- Carbon Black #08090A and the exact Wanted Sans prompt `시계를 클릭해주세요`.
- The existing WatchAssembly, case/crown images, face markup, proportions and orientation are reused. No new model, image, library or renderer.
- Idle: a very faint reflection travels within the real rounded glass clip. Blue side lighting breathes slowly and responds to hover/focus. Only light layers move; the Watch remains still.
- Click/tap/Enter/Space: set display light synchronously, then run one guarded GSAP timeline. A 0.42s internal light expansion, a short rounded case-edge sweep, one soft light wave and a restrained background response form the wake.
- HELLO alone fades in and resolves a 5px blur from 0.46s. No word splitting or extra identity keywords.
- From 1.05s to 2.20s, the Watch follows the existing translation/scale interpolation to the actual `.hero__watch-anchor`; the ambient field expands as the existing Hero typography/Magic Rings are revealed. The last 0.26s reveal the existing Hero face. React hands over at matching coordinates with exactly one visible main Watch.
- Release the root scroll lock while the background is still opaque, then measure the final scrollbar-aware layout. Continue blocking wheel/touch/scroll keys until unmount. Recompute travel geometry on viewport/visual-viewport resize.
- Reduced motion: a short 0.54s sequence without travelling, scaling, blur animation, breathing, glass drift, rim sweep or wave. Dynamic preference changes complete the active timeline safely.
- A native button, inert background, trapped Tab focus, keyboard-only focus indication and HELLO live announcement retain accessibility. Keyboard completion restores focus without scrolling.
- Every intro listener/timeline/inline style is removed on completion or interrupted unmount. The idle effects use CSS animation, with no extra JavaScript frame loop. A fixed rounded mask clips a rotating inner light texture, avoiding per-frame gradient repaint for the rim sweep.

## Integration and scope

`HomePage.tsx` retains onFinish, skipIntro and route restoration. Only after a fresh intro completion, the matched Hero frame paints before existing GPU/pin initialization starts two frames later. Direct section/project destinations and return visits retain immediate setup. Hero/About/FACES/Crown/project source designs are unchanged.

Changed files across the PR:

- Add `src/components/WatchIntro.tsx`, `WatchIntro.css`.
- Update `src/HomePage.tsx`, the additive intro variant in `src/components/Watch/WatchAssembly.tsx`, and the intro-lock comment in `src/index.css`.
- Remove obsolete `IntroVideo.tsx`, `IntroVideo.css` and unused 8 MB `assets/vid/opening-watch-final.mp4`. The video is absent from the build and all checked network requests.
- Document implementation and QA here.

## Validation

Tested the minified production build using real Chrome and WebKit browser engines.

- Build/TypeScript and lint pass. Existing Node tests: 52 pass, 0 fail. Diff whitespace check passes.
- Nine cases: Chrome 1920×1080 click; 1440×900 Enter; 1024×768 Space; 768×1024 touch; 390×844 touch; 375×667 reduced touch; 1440×900 reduced Enter; WebKit 390×844 touch and 375×667 reduced touch. Touch cases include DPR 3 on Chrome and DPR 2 on WebKit.
- Measured normal click-to-first-Hero-frame about 2.26s; reduced about 0.59–0.61s. The idle screen waits for input. Synchronous light response, exact prompt/font/base, HELLO readability, single activation, focus, lock/inert cleanup and no horizontal overflow pass.
- Every sampled transition frame has one visible main Watch. Normal handoff rectangle matches the first Hero frame within 2px. No blank Watch frame or console/page errors.
- The intro contains zero canvas/video elements. Only three idle CSS animations run; none run with reduced motion. No new assets/dependencies; refinement adds approximately 0.35 kB JS + 0.50 kB CSS gzipped over the initial interactive intro. The existing >500 kB homepage bundle notice remains.
- 1920/1440/1024/390 comparisons against the original Production: Hero/Watch/anchor/headline rectangles, document height and pin-spacer dimensions match. Hero → About → reverse returns to the same coordinates.
- Fresh intro, reload skip/scroll restoration, explicit Hero/Contact/FACES destinations, and all direct project routes retain their original behavior.
- Mid-transition resize/orientation, dynamic reduced motion, interrupted route unmount and classic scrollbar gutter pass.
- FACES infinite drag, Crown/ALL FACES, project CTAs/Dock, detail navigation cycle, browser back/forward, reload/reading position and mobile rail are covered by integrated browser QA.

Screenshots, motion recordings and JSON traces are task artifacts in `awaken-refinement/`. Physical iPhone hardware was not available; Safari coverage uses WebKit/touch emulation. Preview retains its existing Vercel authentication and is checked in the authenticated browser before merging. Production is verified separately after deployment.

## Replay

Open a fresh `/` visit to start the intro. Reload/back intentionally retain the original skip rule. Use a new tab/window to replay the sequence.
