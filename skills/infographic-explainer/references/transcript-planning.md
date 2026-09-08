# Transcript-to-region draft planning (v0.3)

`pnpm plan transcript.json` creates `story.draft.json` and `plan-report.json`, leaving `story.json` unchanged. It refuses to replace existing drafts/reports. Review or move those files before another run.

## Region metadata

Add metadata to the same rectangles already used for camera framing:

```json
"keyword": {
  "x":120,"y":150,"width":260,"height":44,
  "text":"持续收费",
  "keywords":["订阅服务","按月收费"],
  "cameraTarget":"service-card",
  "underline":true
}
```

`text` is the visible phrase. `keywords` are curated spoken aliases, each at least two normalized characters. `cameraTarget` names a larger context region; without it the camera fits the matched region itself. `underline: true` opts the phrase into annotation. Do not put generic aliases such as “这个” into many regions, or attach the same phrase to both its word and parent card.

## Transcript format

Use measured/aligned times in seconds, relative to the complete composition:

```json
[
  {"start":4,"end":8.5,"text":"这里可以提供订阅服务。","caption":"提供订阅服务"},
  {"start":9,"end":13,"text":"从行业定制到持续收费。","target":"keyword","emphasisAt":10.5}
]
```

Entries cannot overlap. Optional `caption` can shorten the visible subtitle without changing the matching text. Optional `target` explicitly resolves the intended region. Optional `emphasisAt` is a known word/phrase time, not a character-count estimate. It must fall within the segment. If it lands during camera movement or too close to the end, the planner omits the line and reports the reason instead of silently shifting it.

This helper consumes timestamps; it does not transcribe audio or align words. Existing audio remains in story.audio. `transcript.example.json` uses the bundled narration's authored sentence windows for demonstration.

## Matching and timing behavior

Matching uses Unicode normalization, case folding and punctuation/whitespace removal, then checks whether the spoken text contains a region's text or configured alias. It has no embedding model, language-model call or OCR. A score in the report is the longest matching term length, not a confidence probability.

- Exactly one region: propose its camera view.
- Multiple different regions: mark ambiguous and keep the previous camera. Lists often legitimately mention several ideas; split the segment or specify a target after review.
- No match: mark unmatched and keep the previous camera. Add a precise alias or explicit target.
- New view with less than 1.8s available: flag too-short; avoid a rushed move.
- Consecutive matches to the same cameraTarget: hold rather than moving again.
- Annotations remain disjoint and fully disappear before the next segment's move. Default emphasis timing is only a layout-based draft and always flagged for listening review.

All captions are carried into the draft, including unmatched passages. `requiresReview` remains true even when every sentence has a unique match: lexical matching does not establish correct semantic intent or precise word timing.

## Apply after review

Read every report row, especially ambiguous/unmatched/too-short statuses and underline timing warnings. Correct transcript overrides, aliases, or the draft itself. Preserve the existing story as a backup, then copy the reviewed draft to story.json. Run `pnpm check` and inspect the exported MP4, not only the browser preview. A draft with a wrong target is not a completed video.

The planner is an optional assistant aid; do not replace a user's carefully authored timeline just because a transcript is available. v0.2 story files still work without this metadata or script.
