---
name: infographic-explainer
description: Make focus-and-annotate explainer videos (聚焦讲图) from editable diagrams or supplied images using HyperFrames. Use for a continuous infographic canvas with narration-led camera moves, fixed captions, and one temporary red underline at a time, including landscape or portrait exports. Not for slideshows or generative image-to-video.
---

# 聚焦讲图 / Infographic explainer

Guide attention around one continuous board: context → relevant region → temporary underline → next idea. Follow the user's reference, topic, language, duration and voice preferences. The public skill identifier remains `infographic-explainer` for installation continuity; the Chinese display name is 聚焦讲图.

## Start with the right inputs

Use the conversation's existing brief; do not repeat questions already answered. Determine the board source, spoken content, output aspect ratio and available voice. Ask only for a genuinely missing input that blocks work. Default visual style: warm white, dark handwritten-looking Chinese text, pale yellow cards and red annotation. Default sample: 26 seconds, classic 1440×1080 at 30fps.

Choose the board source deliberately:

- Text-heavy new content: author `assets/board.svg`, with readable hierarchy and deliberate line breaks. Replace the demo topic and demo audio together.
- Existing image or user-requested generated image: use the bitmap as supplied; do not redraw it merely to add animation. Use an available image-generation tool only when needed and report the actual image source.
- Provided voice: keep it. Otherwise use an available TTS provider. The optional macOS helper is a test voice, not a required voice or an imitation of the reference speaker.

## Create a project

Run from the skill folder:

```sh
node scripts/init-project.mjs <new-directory> --preset classic
# Alternatives: --preset landscape or --preset portrait
# Add --image /absolute/path/board.png to import an existing bitmap.
```

The initializer refuses to overwrite a project. In the new project run `pnpm install` then `pnpm preflight`. For edits, use the existing project. HyperFrames and GSAP are pinned; no separate skill or secret key is required. Read [the project guide](references/project-guide.md) for fields, scripts and migration; read [the style prompt](references/style-prompt.md) when choosing visual direction or generating a bitmap.

## Author content, regions and timing

Keep the content in `assets/board.svg` or the imported bitmap, and production settings in `story.json`. Leave `index.html.in` and `runtime.js` alone for ordinary topic changes.

1. Finalize speech before assigning emphasis times. `pnpm build` measures real audio durations with ffprobe; omit manually guessed durations. Existing TTS timestamps or manual listening can determine word emphasis. Character counts do not establish word timing.
2. Define named rectangles in board coordinates. Use larger context regions for camera targets and tight phrase regions for underlines. Verify that boxes match visible text, particularly for OCR-derived bitmap regions.
3. Use `target` names for the initial camera and shots. The builder fits them into the safe viewport for the selected aspect ratio. If a dense region becomes too small in portrait, split the content or choose a smaller region; do not claim the preset alone solves readability.
4. Reference phrase targets from annotations. The builder generates the underline path; only set start/draw/end times. Use semantic beats rather than moving at every subtitle change.
5. Caption text stays below the camera viewport. Split long sentences instead of shrinking them until unreadable.

Use short clear moves (usually 1–1.5s), then hold while speaking. Return to the whole board when useful. Do not turn the sample's business content into assertions about a new topic.

## Draft from an existing timed transcript

When sentence timestamps exist, add text/keyword metadata to regions and use `pnpm plan transcript.json` to produce a separate draft. Read [transcript planning](references/transcript-planning.md) first. Inspect every proposed match and timing warning, resolve ambiguous passages, then apply the reviewed draft and run the normal verification workflow. Never overwrite a carefully authored timeline automatically. This is deterministic keyword matching with curated synonyms, not automatic semantic understanding or word alignment.

## Preserve the style's essential behavior

- Show at most one red annotation at a time. Draw → brief hold → ~0.15s fade → explicit opacity zero. Hide it before the next mark and normally before the next camera move.
- Keep the path and following cursor in board coordinates; keep subtitles in screen coordinates. No round-cap dots or cursor jumps before drawing starts, and no accumulated marks at the end.
- Use explicit `#id` strings for SVG GSAP targets. Direct SVG element targets can look correct in preview yet disappear in HyperFrames 0.8.30 export.
- Construct the paused, registered GSAP timeline synchronously. Do not replace seekable animation with wall-clock timers or media-play callbacks.

## Validate the actual deliverable

Run `pnpm check`. Build validation covers named regions, timing overlap, audio length and duration; HyperFrames covers runtime/layout/motion/contrast. Use `build-report.json` review times to inspect each line during drawing and just after it expires, plus the final overview. The example's documented overlap exemption covers clipped-off SVG bounds only, not visible text collisions.

Render with `pnpm render --output renders/final.mp4 --quality high --workers 2`, adjusting workers to hardware. Decode-check the MP4, confirm its duration and audio stream, and inspect frames from the exported file: passing preview checks is not sufficient. Review font availability and caption placement on the rendering machine.

Deliver the MP4 and editable project. State the actual image and voice sources and what is automated. Region selection and narration-to-content matching remain authored decisions; this is not arbitrary-image automatic understanding. Publishing, global installation or sending files is not implied by invoking the skill.
