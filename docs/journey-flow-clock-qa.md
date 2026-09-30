# Journey Flow Clock QA

Base: origin/main at 85e25544bf540ed8605b9b1adb88e1424777f36d.
Branch: feature/journey-flow-clock. The initial working tree was clean.

## Approved geometry behavior

The original path travels through the cards beneath opaque surfaces. The user explicitly chose to preserve that exact geometry and allow the clock to pass behind cards. The clock is therefore occluded inside cards, including the first/last interior endpoints. It never switches DOM or follows a displaced rail. Mobile retains the existing central vertical line and document cards; the existing SVG now renders that same line instead of a CSS background.

## Implementation

- Journey.tsx: one decorative, noninteractive clock DOM with 12 ticks, two hands and a center pin. No digital time, numerals or second hand.
- Journey.css: desktop 104px, tablet 88px at <=1200px, mobile 74px at <=600px. Carbon glass rgba(8,9,10,.46), 1px Ice rim .30, highlight .08, Electric Ice reflection .14. Unblurred center keeps the line legible. Hour hand 3px x 24% at .9 opacity; minute 2px x 36% at .82; pin 4px. Quarter-hour ticks are slightly longer.
- journeyData.ts: minutes 820 / 850 / 900 / 980 / 1020, corresponding to 13:40 / 14:10 / 15:00 / 16:20 / 17:00. Card data is unchanged.
- journeyFlow.ts: one journeyFlowProgress writes active stroke-dashoffset, actual getPointAtLength(total * progress), and both hand angles. getTotalLength and SVG CTM are cached. Unwrapped angles (minutes / 2, minutes * 6) remain continuous across hour boundaries.
- useJourneyInteraction.ts: retains original organic path construction, card anchors, camera, scroll extent and handoff. Removes the separate clock rail and dock schedule. Existing on-demand GSAP ticker remains the only smoothing loop.
- useJourneyDocumentFlow.ts: one unpinned trigger for the existing document layout. Reduced motion uses direct scroll progress without easing or an animation loop.

Per segment: f(t) = .22t + .78t²(3 - 2t). It is monotone and C1 even with unequal milestone spacing. Minimum slope .22 prevents a hold, snap or timer pause. Reverse uses the same pure mapping. Minutes interpolate between measured path milestones; the last path segment continues to 1 with the time remaining at 17:00.

Geometry is measured at mount, fonts ready, resize and ScrollTrigger refresh. A ResizeObserver updates the cached SVG mapping after pin/container dimensions settle. Neither scroll renderer reads card rectangles or computed styles. Cleanup removes triggers, observers, listeners, ticker callbacks and inline state.

## Browser QA

The root agent inspected the actual React app in Chromium through a local viewport harness. Dimensions were verified from each iframe's innerWidth/innerHeight. The harness scrolls the actual document and measures rendered SVG/clock geometry without replacing production animation logic. Ignored logs/ QA files are not shipped.

| Viewport | Diameter | Normalized milestones: Start / FIGMA / FRONT-END / AI / STILL |
| --- | --- | --- |
| 1920x1080 | 104px | 0 / .143982 / .420561 / .754805 / .979962 |
| 1440x900 | 104px | 0 / .137318 / .415646 / .749714 / .977470 |
| 1024x768 | 88px | 0 / .120025 / .398102 / .723714 / .968121 |
| 390x844 | 74px | 0 / .186680 / .443925 / .712437 / .902538 |

## Regression and validation

- Seven cards retain order, copy, positions, dimensions and typography. Path construction and anchors are unchanged.
- No edits to Intro, Header, Hero, About, FACES/CTA, Crown, ALL FACES, Contact/CTA/modal, Light Rays or email copy.
- npm run lint: pass.
- npm run build: pass; existing large-bundle advisory remains.
- node --test tests/journeyFlow.test.mjs: 7/7 pass (nonuniform milestones, positive slope, C1, reverse, hour rollover, reduced motion, final continuation).
- git diff --check: pass.

## Final verification notes

Desktop/tablet card dimensions observed: 620x439.99 at 1920, 465x366.656 at 1440, 460x340 at 1024. No horizontal overflow at the requested sizes. During 24-second full traversals, instrumentation recorded zero Journey getBoundingClientRect/getComputedStyle calls from scroll rendering and zero Journey child-list mutations. The same clock DOM and exactly one Journey progress trigger remained active through viewport changes.

The user-approved card occlusion is intentional. On mobile the 74px clock also passes behind document cards while following the original centered line; it is visible in the spaces between them. The clock center is never displaced to avoid cards.

### Browser outcomes

- 1920, 1440, 1024 and 390: passed full traversal and visual checks; the desktop/tablet reverse and mobile forward/reverse runs were also inspected directly.
- Each 24-second traversal sampled approximately 1,400 frames. Forward center error was below .001px; desktop/tablet reversal boundary samples stayed below 1px. Active line progress error stayed below .000003 (under .01px of stroke length). These are screen-coordinate/serialization tolerances; both use the same path distance.
- Exactly one clock, 12 ticks, two hands, no digital text; one Journey progress trigger; same DOM identity after resizing across desktop/mobile.
- Mobile final milestones: 0 / .186680 / .443925 / .712437 / .902538.
- Reduced-motion preference was emulated in the local app's matchMedia interface at 1440x900. 23 forward/reverse samples passed with zero reverse discrepancy, zero Journey layout reads and no duplicate trigger. CSS inspection confirms no pulse or reflection animation.
- Contact end: Crown attach reached 1. Returning into Journey restored attach to 0, with the same clock/path state. The existing Contact CTA was visually unchanged.
- Application error capture: zero. Fresh final QA browser console: zero errors. Earlier development-page hot reloads produced browser-tool MutationObserver errors; these did not reproduce on the final fresh page.
- Final lint, build and all seven tests passed after the last source change.
