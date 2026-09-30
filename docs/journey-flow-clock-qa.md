# Journey Flow Clock — final refinement QA

Base: `origin/main` at `e88f8ac` (PR #10). Feature: `feature/journey-flow-clock-final`.

## Scope and root cause

The first clock was the single moving marker, not a duplicate or decoration. The original bottom anchor is one quarter of the card height inside its opaque surface, and cards paint above the clock. The original final anchor and intermediate path also entered cards.

The user explicitly approved local detours of the shared SVG and minimum responsive clearance. Seven-card copy, order and center coordinates remain unchanged. The original organic builder and baseline camera timing remain; the shared path is deformed only near collisions. No protected section, shared timeline, Contact CTA, Crown component, modal, rays, email, dependency or package file changed.

## Appearance

| Viewport | Clock diameter | Card adjustment |
| --- | ---: | --- |
| 1920×1080 | 106px | Existing 620×440px |
| 1440×900 | 102px | Existing 465×366.66px |
| 1024×768 | 88px | Minimum corridor width; 395.24×340px in measured browser, centers/type/padding retained |
| 390×844 | 72px | Left padding 20→92px, right20px and gap64px retained; card height follows existing content wrapping |

One persistent marker contains one glass body, twelve ticks, two hands and one pin. No time text, numbers, label, second hand, clone or per-card visibility switch.

- Glass: `rgba(8,9,10,.34)`; border1px `rgba(212,229,239,.32)`.
- Frost:12px blur only on the thin masked rim, keeping the line visible through the center.
- Shadows: inset18px Ice/.04, outer14px Electric Ice/.08; static faint reflections, no pulse or flashing.
- Ticks: four5%-diameter ticks/.32; eight3%-diameter ticks/.22.
- Hour:3px wide,14% diameter (28% radius), Ice/.9.
- Minute:2px wide,21% diameter (42% radius), Ice/.8.
- Pin:4px, Ice/.8 with a restrained Electric Ice reflection.

## Geometry, progress and time

`journeyFlowProgress` is the single normalized0→1 driver. It maps into a measured safe window of the existing shared SVG. `getTotalLength()` is cached at measurement; `getPointAtLength()` places the clock. The same physical distance determines stroke dash offset and clock center; normalized progress interpolates story minutes and both unwrapped hand angles.

The beginning clears the first card plus clock radius and its existing28px intro travel. The end remains fully outside STILL UPDATING. Intermediate card anchors are measured on the actual detoured path, not equally divided percentages. Hermite pieces retain the original vertical progression and continuous tangents; an opposing narrow corridor smoothly limits the outward bow. A close pair at1024 follows its outside boundary when the inner corridor is closed.

Milestone speeds are40% of mid-segment speeds: `0.5t + 0.5t²(3−2t)`. There are no time-based pauses, zero-slope stops, snaps or history-dependent reverse branches. Time interpolation uses820→850→900→980→1020 minutes, corresponding to13:40→14:10→15:00→16:20→17:00. These values are never rendered as text.

Actual normalized **SVG distances** (the first/last values define the safe window; normalized flow begins0 and ends1):

| Viewport | Start | FIGMA DESIGN | FRONT-END | WORKING WITH AI | STILL UPDATING |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1920 | .040784 | .203427 | .458409 | .762766 | .965667 |
| 1440 | .050401 | .202130 | .456346 | .761861 | .958658 |
| 1024 | .056166 | .163344 | .366059 | .718117 | .954588 |
| 390 | .179652 | .258776 | .505504 | .798398 | .944688 |

Recompute on mount, fonts ready, resize and ScrollTrigger refresh. Scroll writes perform no card/layout measurements and no React state updates. The pinned scene retains one on-demand GSAP follow callback; document mode has one progress trigger and no animation loop. Reduced motion uses direct clamped progress; no reflection or scale animation is present.

## Browser validation

Root agent directly inspected actual browser traversal and screenshots in all four viewport sizes, using the same React application in an exact-size iframe. The temporary ignored harness drives native scrolling; it does not replace the production controller. Each viewport received a24-second forward and24-second reverse traversal (approximately1,441 frame samples each), plus five exact milestone seeks and refresh between sizes.

All eight traversals: zero card/clock overlap, zero viewport clipping during Journey, one persistent clock, twelve ticks, two hands, no digital text, no horizontal overflow, no app errors, zero Journey rectangle/style reads during scrolling, and zero child-list mutations. Card text remains uncovered. Desktop identity persists through switching to mobile.

Measured minimum full-circle viewport clearance:1920≈82.7px;1440≈64.3px;1024≈54.9px;390≈4px. Native fractional scroll rounding produces a maximum milestone time difference of.026minute (about1.6seconds); pure-function tests hit exact milestone values.

SVG arc-length flattening can return slightly different totals after pin/render changes. Therefore physical head verification uses `(strokeDasharray − strokeDashoffset) / scale`, not a freshly recomputed total multiplied by an old fraction. This compares the actual drawn head with the clock center.

A second physical-head pass traversed all four sizes forward/reverse (361 samples per direction): maximum center/head distance0.327px at the reverse boundary, typically below0.01px; zero overlap or clipping.

Reduced-motion JavaScript preference emulation at1440×900 passed23 forward/reverse samples: reverse discrepancy0, overlap0, app errors0, one persistent DOM and one progress trigger. CSS was inspected for the absence of reflection/scale animation; OS-level preference emulation was not used.

Journey→Contact displayed the unchanged CTA and attached Crown (attach=1); reversing to Journey restored attach=0 and the visible13:40 starting clock. App error capture remained empty. Browser-tool/harness MutationObserver errors occurred during reloads in the outer QA page, not in the application error capture.

## Automated validation

- `npm run lint`: pass.
- `npm run build`: pass; existing large-bundle advisory remains.
- `node --test tests/journeyFlow.test.mjs tests/journeyPath.test.mjs`:17/17 pass.
- Tests cover full-radius safe endpoints, irregular milestones, positive continuous speed,40% slowdown ratio, reverse identity, hour rollover, reduced motion, path clearance, preserved remote geometry/y progression and continuous tangent joins.
- Independent static review confirms unchanged protected files/card data/baseline path and symmetric trigger/observer/ticker cleanup.

Browser evidence is under ignored `logs/journey-final-*`; temporary QA pages are not production artifacts.
