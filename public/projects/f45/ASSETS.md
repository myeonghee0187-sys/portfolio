# F45 Case Study assets

Source: [myeonghee0187-sys/f45_korea](https://github.com/myeonghee0187-sys/f45_korea), revision `8ee558edc64fc03a0b88e6518b1acaf9a77b989e`.

`asset-map.json` records the original repository paths, file sizes and SHA-256 checksums. The three `hero_frame_*` photographs, `intro_k.jpg` and two app-guide phone PNGs are unmodified copies from that revision. The app screens belong to the original website's external-app guide; they are not invented portfolio UI.

The initial eight WebP images are actual Chrome captures of the [deployed F45 website](https://myeonghee0187-sys.github.io/f45_korea/) on 2026-10-20. Desktop viewport: 1440 × 1000; mobile: 390 × 844. `main-*` capture the first viewport. `why-*`, `phase-*`, `location-*` and `care-*` capture the corresponding real sections at natural dimensions. Fixed header / skip-link overlays were hidden only while capturing individual sections; the website's content, colors and UI were not rewritten. PNG captures were converted to WebP at quality 92 without resizing.

The current case-study page reuses the portfolio's shared Wanted Sans and Inter fonts, so it carries no F45-only font binaries or licenses. Historical website screenshots remain unchanged and retain the typography rendered by the original F45 site at capture time.

NONFICTION reference images are research material only. None is included in this directory or the runtime bundle. No Figma whole-section render is used as a substitute for the Case Study's semantic HTML layout.

## Captures retained from the earlier redesign

The earlier redesign superseded the initial editorial layout. `redesign-assets.json` records additional unmodified F45 photographs and a fresh 390 × 844 capture of the mobile WHY section (`why-mobile.webp`, natural 390 × 2589). The current Bold & Vivid layout separates WHY and PHASE; mobile captures remain available for the responsive presentation.

`device-assets.json` records the unchanged three-device frame and fresh live F45 desktop / tablet / mobile captures. Their natural viewport dimensions match the existing screen projection geometry; PNG captures are converted to lossless WebP with identical decoded RGBA pixels, without resizing. Only F45 screen content is shown in the F45 compositions. No TCHAIKIM source, stylesheet or original asset is edited. Original UI captures / photos remain available even where unused. The obsolete F45-only notebook and Evolution frames were removed; their TCHAIKIM originals are untouched.
