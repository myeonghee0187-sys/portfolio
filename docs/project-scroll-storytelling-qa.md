# TCHAIKIM & JADUYA scroll storytelling QA

2026-10-20. Baseline: `6113666`, on `codex/jaduya-final-integration` / PR #33.

Historical report for `5ad8e32`. Its rectangular Ending reveal has since been removed in PHASE 1; see [design recovery QA](phase1-design-recovery-qa.md). The existing video fixes remain.

## 1. TCHAIKIM — editorial flow

Preserved the existing Hero → Overview → AS-IS / TO-BE → Insight → Design Concept → Main → Shop → Brand Experience → Ending composition. Fresh Figma reads confirmed the detail root `98:24`, Hero `255:680` and Overview `255:696`. Their shared `story6.png` alignment and existing masks remain unchanged. No new triggers or entrance effects were added to these static sections.

Brand Experience now measures the actual video bounds rather than the padded section. A reproduced case had the video bottom at -20.484px while the section bottom remained at 302.156px: manual playback previously continued; it now pauses. The original video, poster, playback speed, center-entry hysteresis, user pause intent and controls are retained.

WebKit testing also exposed offscreen media suspension: the time getter could retain the old position before `play()` but playback restarted at zero. The component now records playback position in a ref and explicitly seeks to it before resuming. It uses no scroll-driven React state. Final Chrome resume: 0.553s → 0.635s; WebKit: 0.538s → 0.603s. Manual resume retained 0.957s and 0.785s respectively. User pause survived three leave / return cycles.

## 2. JADUYA — path reveal

Figma Ending `2100:150` uses separate road and character assets. The original `ending-road.png` is revealed through its native image coordinates with a percentage clip-path. Existing rotation, scale, placement, color and image bytes are untouched. The original character and final three-line message remain visible and static throughout.

Exactly one unpinned `jaduya-ending-path` ScrollTrigger scrubs linearly from the section top reaching 85% viewport height to its bottom reaching that same position. Reverse scroll retraces the mask. The completed road remains visible below the section. There is no snap, forced scroll, opacity animation, additional transform or independent character motion.

## 3. Preserved features

No CSS, source assets, typography, content, FACES data, shaders, watch interaction, Crown, ALL FACES, Header, Floating Dock or routing code changed. Before / after section, image, text and shared-plum geometry was identical in all 16 project / viewport combinations: maximum coordinate error 0px, unchanged document heights and no horizontal overflow. Existing HOME CARE alpha masks, connector placement, compact 24px speech bubbles and continuous red / green DESIGN backgrounds are retained.

## 4. Intentionally static sections

Hero, Overview, AS-IS / TO-BE, Result / Insight, Design / Brand Concept, Main Page and Shop retain their completed static composition. Their order, continuous backgrounds and original long mockups provide the requested reading flow without decorative effects.

HOME CARE's timeline is baked into `home-care-long-phone.png` (726×2167), not an independent SVG / HTML line. The original UI was not split, redrawn or covered. Its scroll-progress effect is intentionally not applied under the brief's explicit image-integrity constraint.

## 5. Files

- `src/hooks/useEndingPathReveal.ts`: scoped GSAP context, one trigger, local reduced-motion listener, image / font / content-size refresh and complete cleanup.
- `src/components/Projects/JaduyaBrandSections.tsx`: section and road refs only.
- `src/components/Projects/BrandExperienceVideo.tsx`: actual-video visibility measurement, observed video size and playback-position preservation.
- This QA report.

Refresh work is batched into one animation frame. Native viewport height is read during the scoped refresh, avoiding stale viewport percentages immediately after resize. A local media-query listener avoids a global GSAP matchMedia refresh that was observed resetting scroll to zero. On reduce or unmount, context reversion restores the entire original road and removes the trigger, observers, image listener and pending frame. No static section receives a trigger.

## 6. Responsive and browser verification

Chromium: **1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 430×932, 390×844, 375×667**, both details. Images decode, original aspect ratios and static opacity / transforms are retained, no new pins, horizontal overflow or document-height changes.

Ending checks pass at 0 / 25 / 50 / 75 / 100%, forward and reverse, with copy and character opacity always 1. Live reduced-motion changes show the entire road, remove the trigger and preserve scroll position. Resize through mobile / tablet / desktop retains one correctly measured trigger. A temporary +37px upstream content-height change recalculates its start by the same 37px. Reload, route unmount, browser back and restored scroll progress pass. Mobile WebKit forward / reverse and reduced-motion checks also pass.

Video checks pass in desktop Chromium and mobile WebKit: center autoplay, pause on leaving, immediate resume from saved position, persistent manual pause, five rapid leave / return cycles, reduced-motion changes, offscreen manual-play cancellation and pause on route unmount. Touch play / pause and initially reduced mobile playback pass. An injected autoplay rejection shows the existing loaded poster, play button and status; manual retry starts playback. Original muted / playsInline flags and playbackRate=1 remain intact. No page or console errors occurred.

Integrated main-page regression passes: both-direction WebGL drag across all three Faces, persistent CTA, Crown / ALL FACES selection, ready CTA navigation, Header hide / reveal and focus, Dock links / hover, NextFace chain, mobile reduced-motion rail, reload and back / forward restoration. F45 remains an unavailable detail route.

## 7. Commands

- `npm run lint`: pass.
- `npm run build`: pass, including TypeScript.
- `node --test tests/*.test.mjs`: 50 pass, 0 fail.
- `git diff --check`: pass.
- Existing homepage bundle-size warning remains; no new dependency was added.

## 8. Limits and release scope

HOME CARE progress is intentionally omitted because its timeline is embedded in the source image. Physical iPhone / Android devices and OS-specific power-saving modes were not tested; mobile browser checks use emulation and WebKit. This change is prepared on the existing review branch. The prior owner-approval requirement for main merge / Production release remains in force.

## 9. Evidence

This chat's `project-storytelling` artifact folder contains before / after full-page captures at 1920px and 390px, `layout-comparison.json`, `ending-qa.json`, `video-qa.json`, `story-functional-qa.json`, road progression screenshots, reduced-motion capture, autoplay-block poster and the `ending-scroll.mp4` forward / reverse recording. Complete static Ending crops are `ending-complete-1920.png` and `ending-complete-390.png`.
