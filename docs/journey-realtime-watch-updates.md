# Journey / realtime Watch / case-study updates

Base: `origin/main` at `a6b7fdca909bc20a4fe5b41a758f7aeac9a3c45d`.
Branch: `fix/journey-watch-project-details`. Implementation and peer review: GPT-5.6 Sol.
The requested delivery stops at a reviewed PR and Preview; this change does not merge or deploy to Production.

## Changes

- Journey cards: previous entry ramp was `[mark - 0.04, mark]`. Entry now starts at `previousMark + 0.20 * (mark - previousMark)` and retains the existing `0.04` ramp. Only entry timing changes. The previous card's exit rule, CSS, path, camera, Clock motion/smoothing, milestones and story-time interpolation are unchanged.
- At 1440×900, FRONT-END entry moves from `0.3590–0.3990` to `0.2926–0.3326` in the existing measured flow coordinate. FIGMA DESIGN moves from `0.1400–0.1800` to `0.0711–0.1111`. All six upcoming cards finish entry before their measured arrival.
- `useWatchTime` subscribes to a shared `useSyncExternalStore` store. The first subscriber starts one timeout aligned to the next minute; all Watch/Crown subscribers share it. `focus`, `pageshow` and visible `visibilitychange` resynchronize using local `new Date()`. Unchanged minutes do not notify. The final unsubscribe clears the timeout and all three event listeners. No external API, per-second polling, new library or CSS change.
- Hero/About/Contact/intro/shared-stage Watch and FACES Crown use the same zero-padded 24h `HH : mm` text. Both stage spans and their index keys remain stable so minute updates preserve GSAP-held nodes. Existing numeric typography is already tabular. Project-detail screenshot assets (including photographed phone status bars) remain unchanged; these are not portfolio Watch UI.
- Journey's analog Clock still consumes only `JOURNEY_CLOCK`: 13:40 → 14:10 → 15:00 → 16:20 → 17:00. The realtime hook is not used anywhere in Journey. Removed the unused legacy fixed-time object; `WATCH_ROLE` is unchanged.
- JADUYA Hero contribution: `16%` → `19.64%` only.
- TCHAIKIM Case Study: `https://www.figma.com/deck/8K1OMzkKzmEmkV2Kejd43q`.
- JADUYA Case Study: exact supplied encoded URL with `node-id=6003-333`, viewport, token, scaling, content-scaling and page-id retained. Both detail Docks consume `FACE_PROJECTS` and use `_blank` plus `noopener noreferrer`. All Live Site URLs and the single FACES EXPLORE PROJECT CTA remain unchanged.

## Verification

- `npm run lint`, `npm run build` (includes TypeScript), `node --test tests/*.test.mjs`: 58 passing tests, no failures. Existing homepage bundle-size notice remains.
- Production baseline vs minified local build at 1920×1080, 1440×900, 1024×768: identical SVG path, card base dimensions, pin extent and document height. At twelve identical forward scroll samples, Clock translation and both hand transforms match exactly; node-out values also match. Reverse samples restore the same clarity and story time after the existing smoothing settles.
- Example at 1440 master progress 0.36: FRONT-END node-in is now 1.000 instead of 0.510, while Clock position/time are unchanged. Future cards still wait for their own segment.
- Browser time fixtures cover New York local time, minute rollover, `03 : 07`, `00 : 00`, pageshow/focus/visible visibilitychange, identical time on all Watch/Crown elements, and preservation of the exact time DOM nodes. Updating realtime does not change either Journey hand or Clock position at a fixed scroll sample.
- Chrome desktop, 820×1180 tablet, 390×844 touch/reduced motion, and WebKit touch emulation cover Watch text, overflow and link layout. Crown/ALL FACES selects all three projects, infinite drag works both ways, project SPA navigation/history retains selection and skips the intro, and Contact Watch shows current time.
- CASE STUDY clicks open new tabs with the exact requested hrefs; JADUYA query parameters and both Live Site hrefs are verified. Opening the external page is not a review of its slide contents.
- The automation browser keeps inspected tabs visible; real OS background throttling and physical mobile hardware are not verified. Return-event handling is verified with browser events and deterministic store tests. No claim of a real hidden-tab throttle test is made.
- Sol peer Code Review: no actionable findings in either the Watch or Journey/data/link implementation. No application runtime/console errors in completed feature/regression checks.

Evidence: same-viewport before/after screenshots, trajectory JSON, threshold table and browser traces are in the task artifact folder `journey-watch-updates/`.

## Changed files

- `src/time/watchTime.ts`, `src/hooks/useWatchTime.ts`
- `src/components/Watch/WatchAssembly.tsx`, `DigitalCrown.tsx`
- `src/components/Watch/WatchAssembly.css`, `DigitalCrown.css` (comments only)
- `src/hooks/useScrollScene.ts` (comments only), `src/story/storyTime.ts` (unused fixed-time data removed)
- `src/components/Journey/journeyFlow.ts`, `useJourneyInteraction.ts`
- `src/components/Faces/facesData.ts`
- `src/components/Projects/JaduyaCaseStudy.tsx`, `FloatingDock.tsx`
- `tests/watchTime.test.mjs`, `journeyFlow.test.mjs`, `facesProjectLinks.test.mjs`, `floatingDock.test.mjs`
- This report.
