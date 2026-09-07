# Editing the template

## Files

- `index.html.in`: source SVG, board styling, fixed 1440×1080 canvas and 910px-high camera viewport. Edit this, not generated `index.html`.
- `story.json`: duration, initial camera pose, camera moves, temporary annotations, captions and narration clips.
- `runtime.js`: synchronous seekable GSAP timeline. Keep the single-visible-annotation behavior.
- `scripts/build.mjs`: validates time windows, generates static audio markup and `story.js`, copies installed GSAP for local serving.
- `assets/voice-*.wav`: example narration, already generated. Playback does not require macOS.
- `DESIGN.md`: reference visual direction. Update when adopting another style.

`pnpm check`, `pnpm render`, and `pnpm preview` build first. `pnpm preview` uses HyperFrames' background Studio mode; verify its actual URL/status before handing off. No hosting is necessary for producing an MP4.

## Time and coordinates

All time fields are seconds. `shots` animate camera `x`, `y`, `scale` for a `duration` beginning at `start`. They must not overlap.

A board point becomes screen coordinates `screenX = cameraX + scale * boardX` and similarly for Y. For a target rectangle `(bx, by, bw, bh)` and a desired screen rectangle `(sx, sy, sw, sh)`, use `scale = min(sw/bw, sh/bh)` and translate to align their centers. Add breathing room; do not blindly fill every pixel with text. Review intermediate pan frames as well as endpoints.

For a new aspect ratio, update root width/height, CSS canvas size, SVG sizing, caption rail and progress width together, then recalculate camera poses. Only duration is automatically inserted from JSON into the HTML template.

An annotation entry is `{ "id": "line1", "start": 6.35, "draw": 0.78, "end": 7.95 }`. The ID references an SVG path in the board; `end` is when opacity reaches zero, not when drawing ends. Leave at least 0.15 seconds after drawing for the fade. Use distinct paths for separate appearances. Keep windows disjoint, and end before the next camera motion when appropriate.

A caption entry is `{ "start": 4, "end": 8.5, "text": "讲解字幕" }`. Captions use `textContent`, not HTML. Keep each short enough to fit; split long speech into multiple caption windows.

An audio entry is `{ "start": 4, "duration": 3.8465, "src": "assets/voice-1.wav", "text": "对应旁白" }`. Measure actual file duration, and set the composition duration to include its end. Static audio markup is required so HyperFrames finds the clips during compilation. For background music, extend the template deliberately; the default validator treats audio as non-overlapping narration.

## Voice and fonts

The sample uses macOS Tingting at rate 255. On a Mac, a new test clip can be created with:

```sh
say -v Tingting -r 255 -o assets/voice-new.aiff '这里是新的旁白。'
ffmpeg -i assets/voice-new.aiff -ar 48000 assets/voice-new.wav
ffprobe -v error -show_entries format=duration -of csv=p=0 assets/voice-new.wav
```

Do not assume `say` exists on Windows/Linux. Use provided narration or an available Chinese TTS service, and report the actual source. Do not infer word-level timestamps from character counts; align them or manually verify the emphasis moments.

The template declares local font candidates: Kaiti SC / KaiTi / Noto Serif CJK SC for the board and PingFang SC / Microsoft YaHei / Noto Sans CJK SC for captions. These fonts are not bundled. Fallback fonts can change layout. Inspect text rendering on the recipient machine; for matching output, use the same licensed font files via `@font-face`. A font name in CSS is not proof the font is installed.

## Existing bitmap mode

Replace the board's content groups with an SVG `<image>` referencing the user's image, while retaining the annotation/cursor group above it. Keep board dimensions explicit and preserve the bitmap's aspect ratio. Add target paths in image/board coordinates. The runtime needs coordinates and timestamps; it does not itself do OCR or infer targets from arbitrary subtitles.

## SVG animation targets

Use explicit `#id` selector strings for SVG targets passed to GSAP. Measure path geometry through DOM references, but animate the selector. In HyperFrames 0.8.30, direct SVG element targets worked in preview but lost annotations in the exported sample; selector targets were verified in the MP4.
