# Coverage review and boundary decisions

Reviewed **2026-09-25**. Default candidates are geographic units with reported **Google-operated road-car Street View imagery relevant to road-based GeoGuessr practice**. A country or territory can have limited imagery and still qualify; its presence does not imply every province, road or game map includes it. The 113 stable IDs and each one's source and road/limited-road status live in `src/data/countries.ts` and the complete table in `DATA_COVERAGE.md`.

Research entry points were the [current Street View coverage chronology](https://en.wikipedia.org/wiki/Google_Street_View_coverage#Current_coverage), [Google's collection explanation](https://www.google.com/streetview/how-it-works/), [Plonk It guide](https://www.plonkit.net/guide), [GeoTips North America](https://geotips.net/north-america/) and [Plonk It's spillover guide](https://www.plonkit.net/spillover-countries). Tutorial sites were used to find common clue families and edge cases, with rules checked against the original author, standards, government, company or photographic sources where available. This table is a dated coverage audit, not a live Google API check. The general coverage list is a secondary source and needs periodic review.

## Included edge cases

| IDs | Decision |
|---|---|
| FO, GI, JE, LI, MC, SM | Road imagery in restricted European areas; recorded as limited where appropriate. Borders and tourist panoramas alone were not used. |
| BM, CW, DO, PR, VI, AS, GU, MP | Distinct covered island/territorial units; several have limited road extent. |
| NP, OM, PS, RE, RW | Limited road imagery. Nepal has a 2025 Google launch that mentions roads. Oman has a Google-led 36,000 km road program captured with Trekker equipment mounted on pickup trucks: included as official vehicle-based road coverage, explicitly distinguished from attraction-only backpack Trekker imagery. The first release does not infer nationwide coverage or all internal districts. |
| BA, GE, XK, PY, VN | Recent entries checked in the 2025–26 coverage chronology; Bosnia also appears in [Google's 2024 imagery announcement](https://blog.google/products-and-platforms/products/earth/3-imagery-updates-to-google-earth-and-maps/). Recheck after coverage updates. |
| HK, MO, TW | Separate coverage units and IDs to avoid folding distinct Street View road environments into a mainland China candidate. |

## Excluded boundaries

- Mainland China, Belarus and similar apparent map-edge/spillover cases are not promoted to a road-car candidate from nearby crossing imagery or user panoramas. See [Plonk It spillovers](https://www.plonkit.net/spillover-countries).
- Trekker, indoor, museum, landmark or other attraction-only imagery does not qualify. This excludes countries such as Madagascar and Pakistan from this road-based default, even where Google panoramas exist.
- User-uploaded 360° photos and unofficial third-party panoramas never establish eligibility.
- A country's candidate status and each of its internal region's imagery status are separate claims. US and Canada use administrative partitions for comparison, but this release has **not** audited every state/province road segment or capture year. Canada omits Nunavut pending road-car verification. Brazil uses five official IBGE macro-regions; no regional rule is published yet. India has no released region scheme pending a defensible coverage partition.

The source and date fields in `countries.ts` are the review trail. A valid URL or administrative boundary source is not proof of current road imagery; all ambiguous newly added units require manual review before publication.
