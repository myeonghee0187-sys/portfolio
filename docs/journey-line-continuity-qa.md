# Journey line continuity

## Geometry and handoff

- Replaces the prior whole-SVG/clock visibility gate. The base and the single clock remain visible throughout the Journey panel's arrival; no separate opacity ramp runs at master start.
- The SVG M now starts below the first card. Its center clearance is the measured clock radius + 20 screen pixels, so a 106px clock has a 73px center gap and a 20px outer-rim gap. There is no first-card interior prefix to conceal.
- One 80px vertical cubic joins the existing three broad S-curve spans with a shared vertical tangent. The later two spans, card centers/sizes/order and existing pair offsets are preserved.
- A shared flow-entry wrapper carries both SVG and clock through the first card's existing 28px arrival translation. It uses the same handoff tween timing as the card, preserving the physical gap during entry without masking, clipping or opacity gating.
- The master uses p / 0.88 for line movement, removing the former opening 2% reveal hold. The existing camera timeline retains its original timing. The clock waits at physical path distance 0 before master progress becomes positive.
- journeyFlowProgress still owns active draw, clock position and both hands. At zero draw only the empty active stroke is hidden to avoid a round-cap dot; base and clock remain visible. Reverse uses the same mapping with no reset.
- Base line: Ice Reflection at 0.16 alpha, 2px in every layout. Active line: #D4E5EF, 2.5px. Mobile retains its existing gutter and card spacing, with the same 20px vertical rim gap and 80px lead-in.

## Background and performance

Journey remains #08090A. Its separate ambient layer stays at 0 through progress 0.78, then reaches 0.08 / 0.22 / 0.38 at 0.88 / 0.96 / 1. Contact lighting, CTA and Crown code are unchanged.

Geometry is rebuilt on mount, font readiness and ScrollTrigger refresh/resize. The renderer caches path length and SVG mapping; no new React state, ticker, RAF loop or ScrollTrigger was introduced.

## Validation

- npm run lint: passed.
- npm run build: passed; existing bundle-size advisory remains.
- node --test tests/journeyFlow.test.mjs tests/journeyPath.test.mjs tests/journeyLighting.test.mjs tests/journeyVisibility.test.mjs: 27 passed.
- Geometry tests inspect the physical start instead of skipping a concealed prefix, verify the 20px rim gap and 80px vertical lead-in, and retain card clearance, broad curvature, time interpolation, reverse, CTM alignment and cached-measurement checks.

## Browser QA

Actual application iframe viewports: 1920x1080, 1440x900, 1024x768 and 390x844. The four-size matrix covers 60 settled points and 4,752 sampled frames through handoff, immediate movement, the whole Journey, reverse and refresh.

- Every settled sample retains the base and clock, one unchanged clock DOM and no card collision. No opacity ramp or visibility gate remains at the master boundary.
- Measured starting outer-rim gaps: 20.05px / 20.06px / 20.08px / 20.00px, including the first card's entry translation. Local clock drift while settled before the master: 0px.
- All 80px lead-in checks pass; line and clock match within 0.005px at settled samples. Across the matrix's moving/refresh samples the maximum observed difference was 0.181px, below one screen pixel.
- Scroll instrumentation recorded zero Journey getBoundingClientRect/getComputedStyle calls. Explicit refresh measurements are excluded. Each layout retains exactly one Journey driver.
- No application errors. Stage background remains rgb(8,9,10), world filter none and blend normal. The requested ambient knots remain intact, within scroll-pixel rounding.
- Evidence: ignored logs/journey-continuity-matrix.json and logs/journey-continuity-qa.html.

A 1440x900 slow full traversal (24 seconds each direction, 3,019 frame samples) kept the line and clock visible, with no card collisions, duplicate clocks, app errors or Journey layout reads. Moving head alignment stayed within 0.089px. Reverse naturally settled back to 13:40 at distance0 with ambient0; the existing short progress smoothing remains active while scroll direction changes. Refresh and full reload/scroll restoration at master0.5 also retained one visible clock and the same current line position.

Reduced-motion hook smoke check used the QA harness's JS matchMedia override (not an OS preference change). Its document layout kept the 20px start gap and visible clock/base, and 156 forward/reverse samples had no collision, head mismatch, errors or layout reads. No opacity transition remains in the actual CSS, and the existing reduced-motion will-change override remains intact.
