# F45 KOREA — reference audit and editorial plan

2026-10-20. Branch `codex/f45-case-study`, based on the recovered detail-page revision `101d862`. This audit precedes F45 component implementation. Main / Production remain unchanged pending design review.

## Reference actually viewed

[NONFICTION — WEBSITE RENEWAL UIUX, Sungnyeom Kim](https://notefolio.net/kimsungnyeom/309884), also [on Behance](https://www.behance.net/gallery/145311831/NONFICTION-WEBSITE-RENEWAL-UIUX).

The text-only fetch could not render either project, but the real Chrome pages did. Notefolio exposed 54 project-content images, including five animated GIFs. All 54 were viewed in six ordered contact sheets; animated frames were also sampled at 25 / 50 / 80 percent. These research images stay outside the runtime / repository. No NONFICTION brand image, original diagram, card arrangement, typeface combination or animation is copied into the F45 implementation.

Observed sequence: photographic cover and About → dark project-background statement → positioning / desk-research panel → user-segmentation matrix → dark As-is / white To-be contrast → concept diagram → brand typography / color / component study → large UI compositions with fine annotation lines → repeated desktop / mobile application examples → final UI collage and quiet photographic close. Analysis uses small, restrained copy, thin dividers and generous negative space. Dense analytical panels alternate with short statements and large imagery; the UI explanations switch between light and dark surrounds. The actual reference is not ten identical card grids.

F45 adaptation: use its own Montserrat / Pretendard and dark / teal / purple / light palette; give the sports brand stronger headline scale. Use a comparison table, asymmetric target panels, qualitative priority lanes, connected flow, typography / color composition, large original UI captures and a concise validation ledger. Preserve the portfolio's shared Hero / Ending hierarchy and navigation.

## Primary F45 evidence

- [Moodboard `2037:311`](https://www.figma.com/design/72oHwooCnVPMsvkz51KVHf/F45?node-id=2037-311): Playful Community; Montserrat / Pretendard; Dark `#0A0913`, Teal `#008BA3`, Purple `#5B5CEB`, Light `#F8F9FA`. Fresh high-fidelity context and screenshot read.
- [Lean Product Canvas `2037:251`](https://www.figma.com/design/72oHwooCnVPMsvkz51KVHf/F45?node-id=2037-251): barriers before trying F45; primary beginner / price-conscious group; secondary experienced-but-new-to-F45 group; four prioritized solution hypotheses. Goals and hypotheses are not measured outcomes.
- [Test notes `2037:142`](https://www.figma.com/design/72oHwooCnVPMsvkz51KVHf/F45?node-id=2037-142): two mobile answer entries per question, covering first impression, timetable / waiting form, price emphasis, reviews, FAQ leading and parking weight. The sheet has no verified test date, participant count or definitive tested-version identity. Do not call it a validated result for the final live site; do not invent a success rate or claim its price / timetable / review screens shipped.
- [Final UI page](https://www.figma.com/design/72oHwooCnVPMsvkz51KVHf/F45?node-id=0-1): PC `2001:418`, mobile `2003:93`, tablet `2024:134`; fresh Phase / locator / guide context and renders read.
- [Actual site](https://myeonghee0187-sys.github.io/f45_korea/) and [source](https://github.com/myeonghee0187-sys/f45_korea) at `8ee558edc64fc03a0b88e6518b1acaf9a77b989e`: actual UI, local original images / fonts / logo, JavaScript behavior and documentary implementation history inspected.

## Content / implementation boundary

| Area | Verified implementation | Boundary |
| --- | --- | --- |
| WHY F45 KOREA | Five editorial brand-benefit cards | Brand explanation, not evidence of fitness outcomes |
| PHASE | Seven program cards; native touch scrolling plus mouse / keyboard support | No personalized schedule or live class inventory |
| Location Finder | City / name / address filters over six Seoul records; six basic branch details | Static reference map; nearby control resets filters; no geolocation / distance sorting |
| Beginner Care | Six pre-visit information cards | No submitted survey or on-site booking |
| App Guide | Six steps, arrows / dots / touch, real store links | Reservation / payment occur in the external app, not this website |
| Secondary planning | Program information is present | Pricing, operational timetable, coach profiles, reviews and real-time booking are not implemented |
| Responsive history | Video / mobile-image split; native touch and Safari edge-gesture guards exist in code | Historical Safari fixes are implementation records, not claimed physical-device validation |

Original repository notes record July–September 2026 work. The user's subsequent clarification establishes the Hero metadata: PERIOD `2026.07`; MY ROLE `WEB PLANNING · UX/UI DESIGN · FRONT-END IMPLEMENTATION`; CONTRIBUTION `100% (PERSONAL PROJECT)`. July was the first individual project in the academy's regular course. August–September was independent additional development and design / functionality improvement after that course ended, rather than an extension of its duration. Implementation & QA separates these stages and explains self-directed browser checks and responsive / interaction / mobile improvements. The original project's context identifies a Codex development workflow and browser QA; AI support is described as code implementation / debugging assistance under the user's design direction and final review. No unsupported model-by-model or month-by-month AI attribution is added. No F45 external Case Study link is fabricated. The referenced implementation ZIP was not present among the supplied attachment files; it is not silently assumed or applied.

## Ten-section design plan

| Section | Layout and purpose | Evidence / assets |
| --- | --- | --- |
| Hero | Existing full-viewport copy / metadata / representative visual hierarchy | Actual desktop / mobile UI and original training image |
| Overview | Large editorial statement plus compact purpose text | Canvas problem and user outcome |
| Problem Definition | Thin-rule, three-row As-is / To-be comparison on dark | Entry barrier, missing decision information, disconnected path |
| Target & Insight | Unequal primary / secondary panels and a brief emphasized insight | Canvas groups only; no Jane Doe or invented demographics |
| Strategy & Priority | Two qualitative priority lanes with shipped / planned scope indicated | Canvas priority order; actual program and guide scope |
| UX Structure | Five connected semantic steps, then external app handoff | Brand → program → location → care → app |
| Design Direction | Large type specimen, actual color swatches and original community imagery | Moodboard and unmodified source assets |
| Design Application | Four varied, large UI compositions paired with problem → decision → screen | Actual site captures; original phone assets |
| Validation & Improvement | Notes / implemented response / remaining limit ledger | Figma notes kept separate from repository work and current QA |
| Ending | Shared full-viewport conclusion / image hierarchy, then shared NextFace | Original team visual; no claimed conversion uplift |

## Reuse and responsive strategy

Reuse ProjectHeader, ProjectViewport, FloatingDock, NextFace, page transitions and history handling. Add only the F45 route / rewrite / data availability; keep Crown, FACES WebGL, ALL FACES, original videos and the two existing case-study designs unchanged. The data-driven chain becomes TCHAIKIM → JADUYA → F45 → TCHAIKIM. F45 Dock renders the real Live Site only.

Desktop uses an editorial 12-column rhythm with asymmetric spans and bounded line lengths. Tablet reduces headline size and moves annotations into normal flow. Mobile stacks comparisons and priority lanes in reading order, turns the flow into a vertical ordered list, and gives UI images their full natural aspect ratio. No diagram depends on hover or tiny desktop labels. Hero / Ending retain shared viewport / safe-area rules; short landscape remains scrollable. No decorative scroll listener, pin or fade is introduced.
