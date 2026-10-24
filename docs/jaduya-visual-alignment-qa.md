# JADUYA Figma alignment and Visual QA

Date: 2026-10-20. Builds on `5bc87de` in the existing `codex/jaduya-final-integration` branch / PR #33. Main and Production remain unchanged pending the previously requested approval.

## 1. Completed changes

- One shared DESIGN background spans Brand Concept and both Main Page sections. Each original plum is rendered once.
- Responsive type now uses common, continuous scales instead of growing at layout breakpoints. Native desktop Figma sizes and font weights that already matched were preserved.
- Hero metadata uses equal label/value columns, with `기여도 / 팀 내 16%`.
- Brand speech-card height, Result text block, nine original SVG connector positions, and Home Care soft-edge / text details match the source measurements.
- Original phone UI, long Home Care timeline, character and road assets are unchanged. Ending retains the source's three logical lines and 140% leading on mobile as well.

## 2. Main files

Only JADUYA components / styles change: `JaduyaCaseStudy.tsx/.css`, `JaduyaBrandSections.tsx/.css`, and `JaduyaExperienceSections.tsx/.css` under `src/components/Projects`. This report and the experience asset provenance note are also updated. No main-page, TCHAIKIM, FACES, Crown, Header, Dock or router implementation is changed in this revision.

## 3. Measured causes

Fresh Figma source: [root 2068:363](https://www.figma.com/design/9kXZ17uZOK7WinbmInLvUH/portfolio?node-id=2068-363&m=dev), DESIGN `2089:532`. High-fidelity context, individual section screenshots, and Plugin API frame / font / render bounds were compared against the latest branch, not old main.

- Main Page 01's red plum used top `-274.5` instead of `-1174` in its section: a 899.5px displacement at 1920px. Brand and Main also repeated and clipped the same image independently.
- Green fragments differed by 5px in the source; independent copies made the phase change visible at the join.
- At the 1100px layout boundary, a proportionally scaled heading switched to a separate 48px rule. Other breakpoints also changed font sizes abruptly.
- The Hero used independent flex rows, so the longer contribution label pushed its value farther right.
- SVG positioning used geometric line bounds without consistently including the original stroke / arrowhead render bounds. This introduced approximately 2–3px offsets.
- Home Care side masks were 1025px high instead of the source's 1052px, and the final emphasized phrase used 600 instead of the source's 500 weight.

## 4. Typography

Actual Chromium font inspection confirms the custom Wanted Sans Variable font renders the Korean text; the ending uses its SemiBold instance, not a fallback. Native source values remain:

| Style | 1920 size / weight | Reflow floor |
| --- | --- | --- |
| English section label | 32 / 300, Inter | 18 |
| Section title | 48 / 500, Wanted Sans | 24 |
| Point title | 24 / 600 | 16 |
| Point body / Home Care | 20 / 500 | 14 |
| Brand speech text | 48 / 500, 140% | 18 |
| Ending | 64 / 600, 140% | 22 |

Brand heading `2093:647` is Regular / 400 in the actual Figma node; that intentional exception is retained. OVERVIEW's source label is 20 / 400. Size changes across 1100/1099, 901/900, 641/640 and 481/480 stay below 0.1px for corresponding text styles. Layout may reflow at those boundaries.

## 5. Background continuity

The common DESIGN grid underlay uses subgrid rows shared with the real content. Red and green anchors follow Brand and Main Page 01 respectively; their images extend across the actual joins. There is no new scroll listener, resize listener or duplicated fragment.

At 1920px, both original images are 1799px square at x=61. Red begins at DESIGN y=-82; green at y=1717. The shared green follows the Main Page 01 source phase, removing the 5px fragment discrepancy. Opacity remains 6%. Smaller layouts use deliberate large background placements and the same continuous layer. The outer DESIGN boundary clips decorative overflow; content-specific phone clipping remains local.

Adjacent background-row channel deltas at the joins dropped from a maximum of 14 to 2 at 1920px, and from 14 / 10 to 1 / 1 at 390px. All eight viewport measurements confirm both graphics span their respective section joins. A 63px content-height increase also retains the connection.

## 6. Hero metadata and Figma sync

All four rows share a `2.625em` label column (42px at the native 16px font), one gap, and a flexible value column. Labels and values have matching x positions at every tested width. The contribution prefix uses Wanted Sans, with the numeric value retaining Geist.

The approved text was also submitted for Figma synchronization. The connector cannot load Wanted Sans; `listAvailableFontsAsync` confirms the family is absent. Font loading failed before any mutation, so the Figma source is unchanged. Its `2068:388` / `2068:389` texts still require the approved wording, and the four label columns require matching widths in an editor with Wanted Sans installed. No replacement font was silently applied.

## 7. Section visual comparison

Nine source screenshots and nine clean Before/After comparisons are retained in this task's `jaduya-alignment` artifacts, named `compare-hero.jpg`, `compare-overview.jpg`, `compare-direction.jpg`, `compare-result.jpg`, `compare-brand.jpg`, `compare-main-one.jpg`, `compare-main-two.jpg`, `compare-home-care.jpg`, and `compare-ending.jpg`. Clean full-page crops exclude fixed-UI overlays from the section comparisons.

The 1920px phone, character, road and card proportions that already matched were retained. Result has its measured 1188px text block; Brand cards use the 214px source height. The nine connector image bounds are checked against Figma's `absoluteRenderBounds`, including arrowheads and strokes, at 1920, 1440 and 1366px: maximum measured error is 0.032px. Main Page lines use the original stage coordinates, so rounding of scaled card borders cannot move their endpoints. Original SVGs were not rewritten.

## 8. Responsive and regression QA

Chromium: 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 430×932, 390×844, 375×667. Both detail Heroes fit; all nine JADUYA sections render without clipped text, missing images or horizontal overflow. Background continuity and metadata alignment pass at every size.

WebKit with touch / reduced motion: both details at 390×844 and 375×667 pass. Short-landscape fallbacks and dynamic mobile viewport resizing pass. Physical iPhone Safari / Android Chrome and device-specific nonzero safe areas were not tested.

Integrated browser checks pass for both-direction FACES drag / persistent CTA, available and unavailable project links, Crown / ALL FACES, selected-project return, Header hide / reveal and focus, Dock links / hover, NextFace, browser back / forward and reload scroll restoration. No page or console errors occurred.

The right-side black circle is the injected Vercel Preview feedback component (`vercel-live-feedback`, loaded by `vercel.live/_next-live/feedback/feedback.js`). It is absent locally and in an anonymous Production browser check. The repository does not implement it; no product UI or Vercel feedback setting was removed.

F45 has no detail route. Its NextFace label remains `VIEW IN FACES`, with the valid `/?face=f45#faces` destination. Clicking selects F45 in the gallery; its own detail CTA remains disabled. No fictitious route was added.

## 9. Commands

- `npm run lint`: pass.
- `npm run build`: pass, including TypeScript.
- `node --test tests/*.test.mjs`: 50 pass, 0 fail.
- `git diff --check`: pass.
- Existing homepage chunk-size warning remains; no dependency was added.

## 10. Outstanding / release status

Figma text synchronization is blocked by the unavailable Wanted Sans font. Physical mobile devices remain untested. Existing source wording `팀 추천` and mixed quote punctuation are retained. The code revision is committed / pushed to the existing PR; main merge and Production release remain pending approval.
