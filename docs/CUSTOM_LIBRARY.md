# Personal clue library

The **My library / 我的题库** tab is separate from the published official library. Switching tabs preserves each tab's selected observations, but only the active library's clues and weights enter its chart. The geographic hard scope is shared. No account, server, network upload, or runtime AI is involved.

Create a clue by entering an English or Chinese visual label, choosing its existing category, and adding a country or a region from a complete published region scheme. The other language falls back to the entered label if left blank. Images can be uploaded, dropped, pasted into the image area with Ctrl+V, or read from the clipboard button. The browser resizes each image to at most 1280 pixels and stores it as WebP. PNG, JPEG, and WebP are accepted; SVG and executable image formats are rejected. A clue can also be text only.

Each location has independent **When seen** and **When clearly absent** multipliers from 0.01× to 1000×. A missing location is 1×, meaning neutral. The multiplier is a user-provided relative likelihood ratio, **not a direct percentage change or a measured frequency**. Certain observations use the full log multiplier; uncertain observations use half its log value. Candidate priors are uniform within the manually selected scope, scores are added in log space, and the chart normalizes across all candidates. Scope exclusion is absolute.

When a detailed card describes the same visible object as a broader card, JSON may give the detailed card a `supersedesClueIds` array containing the broader clue IDs. If both are marked **seen**, the broad color evidence is replaced rather than multiplied again. An uncertain detailed observation replaces only its reliability fraction; a contradictory clearly-absent observation remains separate. The editor preserves this relation when editing and exporting an imported clue. This optional field is backward compatible with older personal-library JSON files.

For a country, the country-level multipliers are combined with each region’s joint evidence, then the region likelihoods are averaged once, with unconfigured regions at 1×. This uses the existing uniform region prior and avoids giving countries with many regions an automatic advantage. The region chart displays the normalized region multipliers conditional on the inspected country. A country-only weight affects country ranking but cancels within its region chart. Only countries with a complete mutually exclusive regional scheme offer region targets; other countries can still receive country weights.

The browser saves the personal library in IndexedDB. Export downloads a versioned JSON file containing all clue labels, weights and embedded image data. Import validates the schema and **merges by stable clue ID**, replacing matching IDs while keeping unrelated local entries. Deleting a clue offers an immediate Undo action. Export regularly for a portable backup; browser storage may be cleared independently of this site.

Example structure (image omitted; remove `supersedesClueIds` unless that broad clue exists):

```json
{
  "schemaVersion": 1,
  "kind": "street-clues-custom-library",
  "clues": [
    {
      "id": "custom-example123",
      "appearance": { "en": "Black Street View car", "zh": "黑色街景车" },
      "categoryId": "camera",
      "supersedesClueIds": ["custom-general-car"],
      "weights": [
        { "locationId": "loc:canada:region:ca-ab", "seenMultiplier": 20, "absentMultiplier": 1 }
      ]
    }
  ]
}
```

The official library's reviewed sources and photos are not written into custom JSON. A personal image appears only in the user's browser and their exported file.
