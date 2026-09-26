# Clue and image audit — 2026-09-26

This pass visually reviewed a contact sheet of every illustrated clue card, compared ambiguous cases with the local chapter originals, and checked duplicate English labels and shared primary images. It does not certify every geographic frequency in the 8,466 source paragraphs. The only geographic source is the local `tuxundoc/` archive.

## Corrections connected to source facts

| Observation | Source check | Playable change |
|---|---|---|
| Traffic keeps right | The Thailand paragraph `tuxundoc/亚洲/thailand/index.html` compares left and right traffic; it does not state that Thailand drives right. `scripts/verified-driving-side.json` lists 31 explicit source entries that cover 31 country relations. | Thailand now has a low nonzero right-side estimate and a high left-side estimate. Unmentioned places use the shared unknown background. The traffic infographic is no longer a photo card. |
| Red field, white bend chevron | `canada/images/0067.png` and `hungary/images/0009.png` show a broad board; `turkey/images/0010.png`, `vietnam/images/0009.png` and `botswana/images/0009.png` show narrower upright boards. | Broad and narrow styles are different clue IDs. Quebec has a higher conditional regional prevalence than broad country-level Canada, while Hungary has its own source-based prevalence. |
| White field, red bend chevron | Source images in South Africa, Philippines, Turkey, Denmark and Slovenia show one chevron on a broad board. Jordan has two same-direction chevrons; Bulgaria has opposing chevrons; Argentina has a narrow upright board. | Four visual clues replace the merged shape. The broad clue uses the Philippine photo and source-backed frequency tiers: Denmark/Philippines .82 and South Africa/Turkey/Slovenia .62. These are qualitative engineering estimates, not measured proportions. |
| White and yellow vehicle plates | `ghana/images/0003.png` contains a white plate above a yellow plate. | The two clue cards frame the relevant half independently. Browser screenshots were checked at 1440 px. The full original remains accessible in the detail view. |
| Quebec roadside rectangles | The first four images beside the source paragraph are hydrant markers; the fifth, `canada/images/0032.png`, shows the blue/yellow rectangles described by the clue. | The card now uses the fifth image. |
| Arid landscape with red soil | `south-africa/images/0036.png` has pale soil, although its paragraph describes a red-soil landscape. | The observation remains scorable from the cited paragraph but is text-only until a matching image is reviewed. |
| Tea plantation; cobblestone town roads | Each pair repeated the same source photo and observation under two labels. | Each pair now has one stable clue ID and one evidence calculation. |
| DUR on stop sign | Substring matching had connected the Turkish word to unrelated place names. | Only the cited Turkish stop-sign paragraph remains attached. |

The current playable library has 489 bilingual clues: 324 illustrated and 165 text-only; 451 carry active likelihood estimates across 1,192 location relations. The chapter browser separately offers all 5,860 source images. An image's existence does not make every nearby extracted phrase a verified picture clue.

## Open review

- The remaining 165 text clues need source-by-source image matching before becoming illustrated cards. Many lack an adjacent matching photo.
- Other broad clue families may still combine subtly different country variants. Shared primary-image pairs were inspected for literal duplicates, but the 5,860-image archive has not received a full object-level visual classification.
- Source prose gives qualitative frequency words; current prevalence tiers and recognition parameters remain estimates. Only cited comparisons should change relative likelihoods. Countries absent from a paragraph remain unknown.
- The regional preset boundaries are practical manual filters, not evidence or a single authoritative cultural map; users can combine presets and individual candidates.
