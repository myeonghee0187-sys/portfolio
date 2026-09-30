# Journey long S-curve — QA

Base: `origin/main ff71b61` (PR #11). Branch: `feature/journey-s-curve`.

## Geometry

The previous path projected card-adjacent portions outward, then subdivided six original desktop cubics into 288 Hermite pieces. The mobile route had 121 pieces in the saved 390px layout. Subdivision itself was not the visible defect: short projection shoulders and individual card bows introduced repeated small changes in direction.

The rendered shared path now contains one `M` and exactly three `C` commands at every breakpoint. Four route points define a broad upper bend, a long return, and the final approach. Control points occupy one third and two thirds of each vertical span. Both sides of each join share a vertical tangent; y always increases, and there are at most two horizontal reversals. This is tangent-continuous geometry, not a claim of C2 curvature continuity.

The desktop crest uses the measured VISUAL TOOLS edge and clock clearance. The lower point uses the measured WORKING WITH AI edge, 260 SVG units below its center. First/last anchors retain their original card connection and radius-safe flow window. The old six-segment reference only preserves camera timing before the three-segment rendered path is assigned.

Only tight opposing pairs receive small symmetric horizontal offsets. Original y, dimensions, copy, typography, spacing, and clock styling remain unchanged. Offsets are applied at geometry refresh, do not accumulate, and are removed on cleanup.

| Viewport | Cubics | Minimum sampled radius | Horizontal card adjustment |
| --- | ---: | ---: | --- |
| 1920×1080 | 3 | ≈1048px | None |
| 1440×900 | 3 | ≈718px | BUILD / AI pair ≈8.4px outward |
| 1024×768 | 3 | ≈462px | FIGMA / VISUAL ≈3.35px; BUILD / AI ≈48px outward |
| 390×844 | 3 | ≈5390px | None; existing gutter retained |

Radii use dense derivative samples of embedded browser-size fixtures, including one-sided join limits. They exceed the requested160–220px target. Mobile is almost vertical, with x40–52 inside the existing92px gutter. The whole clock starts below the first card. Its clear endpoints use range0→1 instead of searching for a nonexistent card crossing.

A numerical sweep at widths901–1920 (10px steps), heights768/900/1080 found no circle/card collision. The smallest sampled gap was2.87px; maximum horizontal offset was65.4px between the required viewport sizes.

## Clock and regression

`journeyFlow.ts` is unchanged. One `journeyFlowProgress` still drives active stroke, clock position, and both unwrapped hand angles. `getTotalLength()` and `getPointAtLength()` use the new shared path; measured card heights produce new milestone distances. The40%-of-cruise slowdown and13:40→14:10→15:00→16:20→17:00 interpolation remain intact.

One persistent marker,12 ticks,2 hands, no digital text, and one Journey progress trigger remain. Both SVG paths share the exact `d`. Colors,2.5px active stroke, round caps/joins, and non-scaling stroke are unchanged.

No protected section, Contact CTA, Crown component, clock visual CSS, card data, package, or dependency changed. Workers independently reviewed scope/cleanup and geometry tests. Root reviewed their results and performed geometry, integration, and browser QA.

## Browser QA

Root operated the actual React app in exact-size browser iframes. The ignored harness drives native scrolling; it does not replace the controller. Each viewport received20-second forward and20-second reverse traversals (about1200 samples each), plus5 milestone seeks.

All8 traversals: zero clock/card overlap, zero clock viewport clipping, one unchanged clock DOM across desktop/mobile, one Journey trigger, no child-list mutations, no Journey layout/style reads during scroll, and no app errors.

Maximum physical active-head/clock-center discrepancy:0.075px, usually below0.01px. Native fractional scroll rounding caused at most0.03minute (1.8seconds) milestone difference; pure interpolation reaches exact values.

Minimum full-circle viewport clearance:114.64 /81.89 /43.86 /4.00px. At1024, the active BUILD card border remains inside the stage with about1.36px clearance. After1024→390→1024 and refresh, offsets restore once with the same clock and one trigger.

Journey→Contact retained START A CONVERSATION and Crown attach=1. Reverse to Journey restored attach=0 and the exposed13:40 starting clock.

## Validation

- `npm run lint`: pass.
- `npm run build`: pass; existing large-bundle advisory remains.
- `node --test tests/journeyFlow.test.mjs tests/journeyPath.test.mjs`:15/15 pass.
- `git diff --check`: pass.

Temporary browser evidence is under ignored `logs/journey-scurve-*` and is not shipped.

Reduced-motion JavaScript preference emulation at 1440×900 passed 23 forward/reverse samples: reverse error 0, overlap 0, app errors 0, one persistent DOM and one trigger, no Journey layout reads. OS-level CSS preference emulation was not used; clock CSS is unchanged.
