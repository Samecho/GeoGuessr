# Coverage and candidate policy

The geographic candidate list is derived from every chapter linked by the local `tuxundoc/index.html` index. The import processed all 133 linked chapters and includes Antarctica. This is a source-library inclusion policy, not a claim that every listed unit has complete Google road coverage or appears in every GeoGuessr map. The user's manual hard scope is the only runtime candidate filter. The gallery also filters source-backed clues by that manual scope, independently of ranking; selected observations persist when the scope changes. No scored candidate is hidden by its rank or missing clue estimates.

Every location has a stable source-derived ID, localized source title and a trace to the chapter HTML and metadata. Where the local text explicitly establishes a parent relationship, the importer may record that relationship; ambiguous parent links are kept in the import audit instead of being silently assumed. The 133 source candidates and per-chapter import counts are in [DATA_COVERAGE.md](DATA_COVERAGE.md). The local archive's approximately 8 GB of originals remains ignored and unchanged. Web-sized copies of all 5,860 images are included in the user-directed public Pages test build; image rights are documented separately in ASSETS.md.

Coverage boundaries are therefore intentionally narrow in what they claim:

- A chapter existing makes its named location a default candidate, per the project requirement; it does not certify formal road coverage.
- A chapter's failure to mention an internal area or clue is unknown, not evidence of absence.
- The import creates only source-mentioned regional units. A regional distribution is shown only for a complete, mutually exclusive partition. Brazil, Canada, and the 18 African source chapters have complete declared schemes, at the source-supported state, province, broad-zone, or documented-coverage-cluster granularity. Six other schemes are partial and remain neutral empty states. Those 18 African chapters are the complete African candidate set in the documentation supplied for this project.
- The one missing `document.lake` file is recorded as a source issue; its HTML chapter was present and processed.
- No external source or live coverage API has been used to supplement geographic facts in this rebuild.

See [the current import gaps](GAPS.md) for translation and semantic-review status.
