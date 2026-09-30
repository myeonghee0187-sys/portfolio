# FACES → Journey visibility QA

## Cause and ownership

The former handoff timeline faded the SVG root (both base and active paths) and clock together with the first card from handoff progress 0.62 to 1. The first card's entry wrapper was still translucent, so the already-visible line showed through its surface. Separately, flow progress0 mapped to the exposed path range.from and drew that entire prefix before the clock moved.

The same single clock, SVG path geometry, card layout, camera/master timeline and hand-time interpolation are retained. No non-Journey implementation files changed. The dark-background fix already on main is retained and regression-checked.

## State rules

- Default/pre-active: SVG root and clock opacity0. Active stroke has dash length L, offset L, and visibility:hidden to prevent a round-cap dot. L uses the existing rendered SVG scale. Clock position may be measured at its exposed start while hidden.
- Interactive activation: actual handoff animation progress must reach1 AND Journey master target/display progress must be positive. The timeline's actual onUpdate handles stationary scrub completion; onRefresh reconciles restored state. Raw master progress0 closes the gate immediately on reverse, before smoothed progress catches up.
- Reveal: use the existing first2% of the master as a short reversible opacity ramp. Active-only CSS opacity transition180ms also softens fast crossings after scrub settles. Pre-active cancels that transition, preventing residual visibility in the handoff. The reduced-motion media query removes the fade.
- Active draw: at flow0 the active stroke stays completely hidden, with the clock at the unchanged exposed start. Subsequent draw begins at that point, with a long dash gap excluding the prefix. Its head and clock still use the same path progress. No path geometry is edited.
- Document/mobile/reduced layout: its existing document-flow trigger owns the same gate. Before its start, the first card can be visible but the path/clock stay hidden. Cleanup removes all owned state and falls back to hidden CSS.

## Background

Journey/stage remain #08090A without screen blending or brightness filters. Ambient is0 through0.78, then reaches0.08 at0.88,0.22 at0.96 and0.38 at1. Contact rays retain their0.38→0.5 handoff. The existing separate background layer and exposure-owner correction are unchanged.

## Browser QA

Actual app in browser iframe viewports:1920x1080,1440x900,1024x768,390x844. 108 settled samples plus984 frame samples during fast boundary crossings cover handoff, activation, main Journey, Contact, reverse and refresh.

- No pre-active SVG/clock exposure at any viewport.
- One unchanged clock DOM; one Journey driver per layout; no card collisions.
- Visible line-head/clock error below0.005px; line and hand reverse remain continuous.
- Dark background and requested late ambient knots retained; no app errors.
- A slow forward/reverse pass at1440 also found no pre-active exposure or painted stroke.
- Explicit1440 fast-cross test observed10 intermediate fade frames after actual handoff completion, even with no further scroll. Reverse returned to opacity0.
- A frame with computed opacity0 but a prepared active dash is the first CSS fade frame after state becomes active, not a pre-active draw. Final diagnostics distinguish these states.

Evidence in ignored logs:journey-visibility-matrix.json,journey-visibility-crossing-1440.json,journey-preactive.png.

## Validation

- npm run lint:pass.
- npm run build:pass; existing large-chunk advisory remains.
- Existing geometry/flow/lighting tests:20 passed.
- New visibility/rendering tests:6 passed, including zero stroke, exposed start, scrub completion-only reveal, reverse head alignment, cached geometry, remeasure and cleanup.
- No new React state, ScrollTrigger, ticker or requestAnimationFrame loop.

An additional390x844 fast-cross check passed:10 intermediate fade frames, no pre-active exposure or pre-active dash, and return to zero opacity/draw. This also confirmed that the matrix's one zero-opacity/prepared-stroke frame was an active CSS-fade start, not a visibility leak.

Active refresh and reload/scroll-restore smoke check at1440x900 passed: after the existing Intro/driver initialization, restoring scrollY10450 returned to master0.5, active SVG/clock opacity1, and no app errors. Restoration deliberately waits for the existing Intro and fonts; Intro behavior is unchanged. Handoff refresh samples remained hidden at all four sizes. Source HMR during QA also retained the correct pre-active state.

Reduced-motion hook smoke check (JS matchMedia harness, not an OS preference change): static layout activated at its document-flow start and returned to pre-active opacity0. Across204 crossing frames there were no pre-active leaks, hidden draws, head mismatches or app errors. The actual reduced-motion CSS override was separately reviewed to disable the180ms transition.
