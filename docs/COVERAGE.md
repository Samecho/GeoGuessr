# Coverage and candidate policy

The geographic candidate list is derived from every chapter linked by the local `tuxundoc/index.html` index. The import processed all 133 linked chapters and includes Antarctica. This is a source-library inclusion policy, not a claim that every listed unit has complete Google road coverage or appears in every GeoGuessr map. The user's manual hard scope is the only runtime candidate filter. No candidate is hidden by its rank or missing clue estimates.

Every location has a stable source-derived ID, localized source title and a trace to the chapter HTML and metadata. Where the local text explicitly establishes a parent relationship, the importer may record that relationship; ambiguous parent links are kept in the import audit instead of being silently assumed. The 133 source candidates and per-chapter import counts are in [DATA_COVERAGE.md](DATA_COVERAGE.md). The local archive's 8 GB of images is referenced by path, not copied into the repository or Pages build.

Coverage boundaries are therefore intentionally narrow in what they claim:

- A chapter existing makes its named location a default candidate, per the project requirement; it does not certify formal road coverage.
- A chapter's failure to mention an internal area or clue is unknown, not evidence of absence.
- The import creates only source-mentioned regional units. A regional distribution is shown only for a complete, mutually exclusive partition. Brazil's source-coded 27 state units are complete; six other schemes are partial and remain neutral empty states.
- The one missing `document.lake` file is recorded as a source issue; its HTML chapter was present and processed.
- No external source or live coverage API has been used to supplement geographic facts in this rebuild.

See [the current import gaps](GAPS.md) for translation and semantic-review status.
