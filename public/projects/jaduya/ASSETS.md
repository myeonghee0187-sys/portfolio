# JADUYA asset provenance

Design source: [Figma `project_jaduya`, node `2068:363`](https://www.figma.com/design/9kXZ17uZOK7WinbmInLvUH/portfolio?node-id=2068-363&m=dev)

The 18 design assets below were downloaded without transformation from the temporary URLs returned by Figma `get_design_context`. PNG dimensions are intrinsic pixel dimensions. SVG dimensions are the original root `width`, `height`, and `viewBox` values; they were not rewritten.

| Local file | Figma source / node | Intrinsic dimensions | Bytes |
| --- | --- | ---: | ---: |
| `hero-landscape.png` | `imgScreenBackground`, `2068:365` | 1920 × 1080 | 338,265 |
| `phone-1518.png` | `imgImage1518`, `2068:367` | 758 × 1496 | 225,781 |
| `phone-1431.png` | `imgImage1431`, `2068:368` | 582 × 1150 | 173,235 |
| `phone-1519.png` | `imgImage1519`, `2068:369` | 758 × 1494 | 266,345 |
| `phone-1520.png` | `imgImage1520`, `2068:370` | 742 × 1502 | 327,779 |
| `phone-1521.png` | `imgImage1521`, `2068:371` | 722 × 1460 | 664,095 |
| `overview-plum.png` | `imgImage1407`, `2068:391` | 737 × 806 | 199,921 |
| `as-is-1.png` | `imgImage1531`, `2086:494` | 2172 × 724 | 967,034 |
| `as-is-2.png` | `imgImage1532`, `2086:499` | 2172 × 724 | 718,865 |
| `as-is-3.png` | `imgImage1533`, `2086:510` | 2172 × 724 | 756,902 |
| `to-be-1.png` | `imgImage1534`, `2086:515` | 2172 × 724 | 739,585 |
| `to-be-2.png` | `imgImage1535`, `2086:520` | 2172 × 724 | 738,526 |
| `to-be-3.png` | `imgImage1530`, `2086:489` | 2172 × 724 | 926,865 |
| `wave-green.svg` | `imgVector2`, `2068:397` | 758 × 2001; `viewBox="0 0 758 2001"` | 477 |
| `wave-beige.svg` | `imgVector1`, `2068:398` | 601 × 2292; `viewBox="0 0 601 2292"` | 688 |
| `connector.svg` | `imgLine81`, `2068:433`, `2068:434`, `2068:435` | 143.75 × 8; `viewBox="0 0 143.75 8"` | 2,874 |
| `conclusion-green.svg` | `imgPolygon1`, `2068:474` | 1920 × 90; `viewBox="0 0 1920 90"` | 575 |
| `conclusion-yellow.svg` | `imgPolygon2`, `2068:476` | 1920 × 89.9999; `viewBox="0 0 1920 89.9999"` | 690 |

No full-section screenshot was downloaded or added. `jaduya-wordmark.svg` is the native outlined SVG exported from the original Figma wordmark node `2068:376`. It preserves the original 547 × 189 root dimensions and is used directly by the Hero at runtime, so the logo does not depend on an installed font.

## Derived WebP icons

The six source PNGs above remain unchanged. The following delivery derivatives were resized from 2172 × 724 to 936 × 312 with Pillow 11.3.0 using Lanczos resampling, then encoded as WebP at quality 95 and method 6. The 3:1 aspect ratio, crop, color content, and transparency were preserved.

| Source PNG | Derived WebP | PNG bytes | WebP bytes | Alpha difference | Checkerboard-composite PSNR |
| --- | --- | ---: | ---: | ---: | ---: |
| `as-is-1.png` | `as-is-1.webp` | 967,034 | 70,552 | 0 pixels | 43.8206 dB |
| `as-is-2.png` | `as-is-2.webp` | 718,865 | 38,538 | 0 pixels | 42.1886 dB |
| `as-is-3.png` | `as-is-3.webp` | 756,902 | 45,890 | 0 pixels | 45.0138 dB |
| `to-be-1.png` | `to-be-1.webp` | 739,585 | 39,440 | 0 pixels | 43.2746 dB |
| `to-be-2.png` | `to-be-2.webp` | 738,526 | 35,660 | 0 pixels | 44.2008 dB |
| `to-be-3.png` | `to-be-3.webp` | 926,865 | 64,504 | 0 pixels | 42.5955 dB |

For the comparison, each source PNG was independently resized to 936 × 312 using the same Lanczos filter. The decoded WebP and reference had identical alpha values at every pixel. Visual comparison was performed after compositing both images over the same checkerboard background.

## Font inventory and licenses

Figma node `2068:363` specifies these exact families and styles:

- Wanted Sans Regular, Medium, and SemiBold
- Inter Regular and Medium
- Geist Regular
- KERIS KEDU B

Local availability:

- **KERIS KEDU B:** the official KERIS WOFF was obtained and audited as TrueType outlines, version 1.0. KERIS identifies the copyright holder as KERIS and the producer as Together Group; the family is distributed under SIL Open Font License terms: [KERIS KEDU official distribution and license page](https://copyright.keris.or.kr/wft/fntDwnldView?fntGrpId=GFT202512150000000000002). The production wordmark uses the native outlined SVG from Figma node `2068:376`, so KERIS KEDU B is not loaded as a runtime font and its WOFF is not required in the deployed asset set.
- **Wanted Sans:** already present as `/projects/tchaikim/wanted-sans-variable.woff2` (1,289,292 bytes, version 1.196) with `/projects/tchaikim/WantedSans-OFL.txt`. It is licensed under SIL OFL 1.1 by the Wanted Sans Project Authors: [official Wanted Sans repository](https://github.com/wanteddev/wanted-sans).
- **Geist:** already installed as `@fontsource-variable/geist` 5.3.0 and imported by `src/main.tsx`. Its package contains the font files and `LICENSE`, declared `OFL-1.1`. Vercel also identifies Geist as OFL-licensed: [official Geist page](https://vercel.com/font).
- **Inter:** `inter-regular.woff2` (111,268 bytes, font version 4.66) and `Inter-OFL.txt` were downloaded directly from the [official Inter repository](https://github.com/rsms/inter). The files are the upstream Regular 400 WOFF2 and SIL OFL 1.1 license; no substitute or conversion was used. `JaduyaCaseStudy.css` now registers the file as `Jaduya Inter` with `font-weight: 400`, and the JADUYA role and overview copy use that locally hosted runtime face. The shared Google Fonts request remains unchanged for the other Inter weights.

The Figma asset URLs are temporary and expire; runtime code should reference only these local files.
