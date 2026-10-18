# JADUYA first case-study implementation

Design: Figma `9kXZ17uZOK7WinbmInLvUH`, node `2068:363`, inspected 2026-10-18.

## Scope and integration

- `JaduyaCaseStudy.tsx` composes Hero, Overview, Direction (AS-IS / TO-BE), and Conclusion. The page ends at Conclusion. Text and cards are HTML; no complete section screenshot is used.
- `JaduyaCaseStudy.css` contains scoped layout, colors, and responsive rules. Native Figma scenery, five independent phone mockups, outlined wordmark, plum, six final icons, connectors, and four curve assets are local. See `public/projects/jaduya/ASSETS.md` for exact nodes, source dimensions, optimization, and font licenses.
- Existing `ProjectHeader` and `FloatingDock` are reused. Header props select the originating Face and an accessible dark-text treatment for the light hero. Default TCHAI KIM appearance remains unchanged. Wanted Sans registration moved unchanged to shared `ProjectFonts.css`.
- App, projectRouting, facesData, and PageTransition connect `/projects/jaduya`, route title/canonical, project exit, focus, dissolve/reverse dissolve, and document background. Existing TCHAI KIM Next Face resolves to its now-implemented JADUYA destination; JADUYA adds no Next Face section.
- History keeps separate per-project reading positions. A beforeunload snapshot supplements pagehide so Chromium reload also receives the latest reading position.

## Validation

- `npm run lint`: passed.
- `npm run build`: passed, including TypeScript. Existing 722.99 kB homepage chunk warning remains; no homepage scene code was changed.
- `node --test tests/*.test.mjs`: 50 passed, 0 failed. Route/history and native-rail link tests cover both implemented projects, F45 unavailability, modified clicks, gesture cancellation, JADUYA exit locking, and hosting rewrites for direct detail URLs.
- Chrome screenshots and DOM geometry checked at 1920, 1440, 1024, 768, 390, 375, and 320 px. No horizontal document overflow, missing assets, or clipped text. Five phone and six icon source layers retained their aspect ratios.
- At 1920 px: Hero is 1080 px; Overview is 588.78 px versus Figma 590 px (text line-box rounding); Direction is 1146 px. Phone bounding boxes differ by less than 0.3 px from the Figma layout because natural bitmap proportions are retained. Native green/yellow conclusion shapes meet in the original crossing.
- Responsive differences are intentional: small screens move metadata above the phones to prevent overlap; widths <=900 px stack matched AS-IS / TO-BE pairs, reuse the original beige wave per pair, and keep a visible connector. A 100 px ending allowance lets the last text scroll clear of the fixed Dock.
- Chrome: direct detail visit, header direction hide/reveal, focus treatment, FACES return to JADUYA, gallery CTA entry, Back/Forward, refresh and reading-position restoration, Contact, and existing page transitions passed.
- Regression: TCHAI KIM hero copy/color/link and header, video readiness, existing Next Face, Crown ALL FACES selection remaining in the gallery, gallery pointer drag, and Intro completion/home Hero/About/header/canvases passed. No uncaught page errors observed.
- WebKit: 390 px touch/reduced-motion rendering plus native mobile rail → detail → Back → Forward passed. This is browser-engine emulation, not a physical iPhone Safari test.
- LIVE SITE opened `https://jaduya.vercel.app/` in a new tab and rendered the real JADUYA service.

## Production routing and external links

Production direct-route QA caught the need for explicit Vercel SPA rewrites at `/projects/jaduya` and its trailing-slash variant. Both now serve `index.html`, matching the existing TCHAI KIM configuration.

The original JADUYA Deck was unavailable. The owner supplied the replacement shared URL with file key `7l7yOTebIpNQ4Go31Mduar`; facesData now holds that exact URL and FloatingDock reads it from there. The actual Figma page opened successfully and displayed slide 1 of 53. No URL was invented.

Future design sections (Brand Character, Main Page, Core Experience, Interaction Video, other sections, and JADUYA Next Face) remain unimplemented pending the next design instruction.
