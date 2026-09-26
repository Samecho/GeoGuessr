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
| Green back of a road sign | The British Columbia source paragraph says sign backs may be green; it does not oppose British Columbia or Canada. | Direct source support for British Columbia and the inferred parent Canada relation are separate from estimated occurrence. The lower-than-50% estimate no longer appears as “source opposes” or pushes an undocumented province above British Columbia. |
| DUR on stop sign | Substring matching had connected the Turkish word to unrelated place names. | Only the cited Turkish stop-sign paragraph remains attached. |

### Follow-up source-polarity audit

The 148 entries previously labelled as opposing evidence were grouped by provenance. The 95 previously paragraph-reviewed comparisons and 31 driving-side opposites remain explicit; the one manual Curaçao comparison remains. This pass checked the 21 legacy importer oppositions against their cited local paragraphs and recorded them in `scripts/reviewed-source-relations.json`. Seventeen were actually positive appearances, often rare or limited to one region, and four excerpt-to-observation links were removed. Examples: Qatar usually uses a white edge line; most Singapore plates are black with white characters; Luxembourg uses black-backed yellow chevrons; an excerpt about Russian in eastern Estonia does not establish a Russia-wide estimate. The correction file is reapplied on every data build and rejects changed source fact IDs. Validation now rejects an opposing label paired with a majority occurrence estimate.

This pass also checked 23 formerly mixed relations and six unclassified region-derived parent estimates. Five unrelated observation links were removed; source-supported appearances and inferred country parents now have distinct labels. Active estimates no longer carry mixed or unclassified relation labels. This is still not a complete semantic audit of every clue: broad wording/source pairings and visual variants need further manual review. The Info view uses the reviewed per-estimate relation rather than old overlapping raw relation lists.

After the scene-atomization pass, the playable library has 475 bilingual clues: 304 illustrated and 171 text-only; 438 carry active likelihood estimates across 1,322 location relations. The chapter browser separately offers all 5,860 source images. An image's existence does not make every nearby extracted phrase a verified picture clue.

## Open review

- The remaining 171 text clues need source-by-source image matching before becoming illustrated cards. Many lack an adjacent matching photo.
- Other broad clue families may still combine subtly different country variants. Shared primary-image pairs were inspected for literal duplicates, but the 5,860-image archive has not received a full object-level visual classification.
- Source prose gives qualitative frequency words; current prevalence tiers and recognition parameters remain estimates. Only cited comparisons should change relative likelihoods. Countries absent from a paragraph remain unknown.
- The regional preset boundaries are practical manual filters, not evidence or a single authoritative cultural map; users can combine presets and individual candidates.

## Canada scoped-gallery follow-up

The single-country gallery requires region-varying estimates. It previously hid both front-plate observations because only country estimates existed. The Canada chapter's plate-requirement map (`tuxundoc/北美洲/canada/index.html#477af9e7a461eef2f074edc7ff23b68c`, adjacent `images/0013.png`) and its New Brunswick/Newfoundland exceptions (`#u52744c9c`) now support moderate initial estimates across the 13 province/territory regions. Both separate vehicle observations appear in Canada scope and update the conditional region chart. Legal requirements are only a weak proxy for what a random Street View vehicle visibly carries. No-front and front observations can coexist. The gallery also no longer drops cited comparative or low-prevalence evidence solely because it is negative; unknown locations remain unknown in scoring.

Country-only cues with no defensible province split, such as national sign wording, remain hidden in the default single-country **Region clues** view. They are accessible under **All cited clues** with an explanation that they may not change the region chart. The switch avoids inventing provincial frequencies and keeps the original region-focused default. This pass did not claim that all country-only observations have been assigned regional frequencies.
