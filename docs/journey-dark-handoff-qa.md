# Journey dark background / Contact handoff QA

## Change

Journey and its stage retain Carbon Black (#08090A). The former leading radial was removed. Contact ambient is a separate background layer below the Journey world, with opacity 0 through progress 0.78, 0.08 at 0.88, 0.22 at 0.96, and 0.38 at 1. The same curve drives desktop and document layouts; document layout confines the layer to the bottom viewport of the section.

Contact starts from the shared 0.38 light value and reaches its existing final LightRays opacity 0.5 at Contact progress 0.35. Both layouts use scroll-linked light, so reverse follows the same curve. Content receives no brightness or screen blending. Existing Contact content/reveal/Crown behavior is retained.

## Root cause

Browser inspection reproduced a fixed .about-faces-bloom layer remaining at opacity 0.32 over Journey after ScrollTrigger refresh. Journey itself was already Carbon Black. The About-to-FACES exposure uses proxy tweens and direct DOM writes; refresh can restore proxy state with tween callbacks suppressed. Its existing owner now reconciles DOM styles on timeline updates and refresh and forces neutral exposure outside the transition. The original flash was verified at opacity 0.75 around transition progress 0.52 and 0 at its end.

## Browser validation

128 sampled states across 1920x1080, 1440x900, 1024x768 and 390x844 covered Journey forward/reverse, Contact entry/exit and refresh.

- All four layouts: Journey/stage computed background rgb(8, 9, 10); no Journey/world brightness filter or screen blend; ambient 0 through 0.78.
- Requested late ambient knots matched within 0.0003 after browser scroll-coordinate rounding. Forward/reverse opacity difference at matching sample targets was at most 0.0001; mobile was identical.
- Contact rays followed 0.38 -> 0.5 -> 0.38, and the global exposure stayed hidden throughout Journey/Contact.
- Same single clock DOM and one Journey trigger across all layouts. Seven card titles/order, existing card sizes, path geometry and hands retained. No horizontal overflow or application errors.
- Desktop/tablet Crown attach reached 1 at Contact end and returned to 0 on reverse; mobile retains its own Crown.
- Scroll refresh restored the dark starting state without stale light.

Local browser measurements: logs/journey-light-matrix.json (ignored QA artifact). Before/after screenshots: logs/journey-handoff-before.png and logs/journey-handoff-dark.png.

## Validation

- npm run lint: passed.
- npm run build: passed; existing bundle-size advisory remains.
- node --test tests/journeyFlow.test.mjs tests/journeyPath.test.mjs tests/journeyLighting.test.mjs: 20/20 passed.
- git diff --check: passed.

Reduced-motion hook smoke check at 1440x900 (JS matchMedia harness, not an OS preference change) also retained static Journey Carbon/ambient 0, reached ambient 0.38 and Contact rays 0.5 at the end, and returned to the dark start without errors.
