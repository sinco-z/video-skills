---
name: infographic-explainer
description: Create or edit single-canvas infographic explainer videos with HyperFrames, narration-led camera pans and zooms, fixed subtitles, and one temporary hand-drawn annotation at a time. Use for whiteboard-style narrated diagrams, image walkthroughs, and knowledge-map videos; not generic slideshows or generative image-to-video.
---

# Infographic explainer

Produce a narrated tour of one continuous board. Follow the user's reference, language, content and requested duration. Defaults when unspecified: warm white paper, handwritten-looking Chinese type, dark ink, pale yellow cards, red emphasis, 26 seconds at 1440×1080/30fps. Do not turn example business claims into assertions for a different topic.

## Start from the working template

Run `node scripts/init-project.mjs <new-output-directory>` relative to this skill's directory, then `pnpm install` in the new project. The initializer refuses to overwrite an existing path. For edits, use the existing project rather than initializing again.

The template includes a 26-second example, six pre-generated Chinese narration clips, and a deterministic GSAP timeline. HyperFrames and GSAP are pinned in its package manifest. It does not require another installed skill; if HyperFrames skills are available, consult the relevant one for substantial framework changes.

Read [the project guide](references/project-guide.md) when editing content, narration, framing or timing. Read [the style prompt](references/style-prompt.md) for visual direction or when a user specifically wants a generated bitmap background.

## Choose the board source

- For text-heavy diagrams, prefer editable SVG/HTML. Assign IDs to emphasis paths and stable regions. Use fonts installed on the rendering machine or supplied with an appropriate license.
- When the user provides or requests an image, use that image in the board coordinate space. Generate a bitmap only with an available image-generation tool and disclose that choice. Preserve its aspect ratio. Mark regions manually or with verified OCR; subtitles alone do not identify reliable image coordinates.
- Do not regenerate a supplied image just to add zooming or annotations. Check readability at the largest planned zoom.

## Choreograph to narration

Finalize the spoken text and audio first, then use measured clip durations or aligned transcript timestamps. The included timing is a curated example, not automatic speech-to-region alignment. Replace both the sample content and sample audio for a new topic.

Use semantic beats, not every subtitle change, to choose camera targets. Start with context, pan/zoom smoothly, hold for reading, and return to context when useful. Default camera moves take 1–1.5 seconds. Keep target content clear of the subtitle rail.

Critical annotation behavior:

- Draw a slightly irregular red SVG stroke from left to right; the cursor follows its endpoint.
- Keep annotations and the cursor inside the same transformed board as the content. Subtitles remain in screen coordinates.
- Show at most one annotation at a time. Draw, hold briefly, fade out over about 0.15 seconds, then explicitly set opacity to zero. Finish before the next annotation; normally clear it before a camera move.
- Hide paths before their start, including round-cap dots. Hide the cursor before repositioning it. Returning to the full board must not expose old marks.
- Construct a paused, registered timeline synchronously. Use seekable GSAP animation, not wall-clock timers, async timeline setup or arbitrary callbacks to play media.

## Verify and deliver

Run `pnpm check` (build + HyperFrames lint/runtime/layout/motion/contrast checks). The build rejects overlapping annotation, caption, camera-motion and narration windows. Inspect rendered frames during drawing, just after a line expires, at the next emphasis and at the final wide shot. Confirm fonts, audio presence, caption timing and readable framing.

The example uses a clipped camera viewport above a separate subtitle rail. Its documented overlap exemption is for offscreen SVG geometry; visually check it and do not use exemptions to conceal actual visible overlap.

Render using `pnpm render --output renders/final.mp4 --quality high --workers 2` (adjust workers to machine resources). Decode-check the MP4 and verify duration and audio/video streams. Deliver the video and editable project, explaining the actual image and voice sources. Do not publish, install globally, or send to third parties merely because this skill was invoked.
