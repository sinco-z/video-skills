import {readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync} from 'node:fs';
import {resolve, sep, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const story = JSON.parse(readFileSync(resolve(root, 'story.json'), 'utf8'));
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
assert(finite(story.duration) && story.duration > 0, 'duration must be positive');
function windowCheck(start, end, label) {
  assert(finite(start) && finite(end) && start >= 0 && end > start && end <= story.duration,
    `${label}: invalid time window`);
}
function disjoint(items, label) {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    assert(sorted[i].start >= sorted[i - 1].end, `${label}: overlapping windows`);
  }
}
function camera(pose) {
  assert(finite(pose.x) && finite(pose.y) && finite(pose.scale) && pose.scale > 0, 'Invalid camera pose');
}
camera(story.initialCamera);
for (const shot of story.shots) {
  camera(shot);
  windowCheck(shot.start, shot.start + shot.duration, 'Camera');
}
disjoint(story.shots.map(s => ({start: s.start, end: s.start + s.duration})), 'Camera');
const ids = new Set();
for (const line of story.annotations) {
  assert(typeof line.id === 'string' && /^[a-zA-Z][\w-]*$/.test(line.id), 'Invalid annotation ID');
  assert(!ids.has(line.id), 'Use distinct SVG paths for separate annotations');
  ids.add(line.id);
  windowCheck(line.start, line.end, line.id);
  assert(finite(line.draw) && line.draw > .01 && line.start + line.draw <= line.end - .15,
    `${line.id}: leave time for drawing and fade-out`);
}
disjoint(story.annotations, 'Annotations (only one may be visible)');
for (const caption of story.captions) {
  windowCheck(caption.start, caption.end, 'Caption');
  assert(caption.end - caption.start >= .31, 'Caption too short for entrance and exit');
  assert(typeof caption.text === 'string' && caption.text.trim(), 'Caption text required');
}
disjoint(story.captions, 'Captions');
const escapeHtml = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const audio = story.audio.map((clip, i) => {
  windowCheck(clip.start, clip.start + clip.duration, 'Audio');
  assert(typeof clip.src === 'string' && !clip.src.includes('\\'), 'Use forward-slash relative audio paths');
  const path = resolve(root, clip.src);
  assert(path.startsWith(root + sep) && existsSync(path), `Missing project audio: ${clip.src}`);
  return `<audio id="voice${i}" src="${escapeHtml(clip.src)}" data-start="${clip.start}" data-duration="${clip.duration}" data-track-index="2"></audio>`;
}).join('\n');
disjoint(story.audio.map(c => ({start: c.start, end: c.start + c.duration})), 'Narration');
const template = readFileSync(resolve(root, 'index.html.in'), 'utf8');
const html = template.replaceAll('{{DURATION}}', String(story.duration))
  .replace('<!-- Captions and audio are built synchronously from story.js. -->', audio)
  .replace('<script src="runtime.js"></script>', () => '<script>\n' + readFileSync(resolve(root, 'runtime.js'), 'utf8') + '\n</script>');
mkdirSync(resolve(root, 'assets'), {recursive: true});
const gsap = resolve(root, 'node_modules/gsap/dist/gsap.min.js');
assert(existsSync(gsap), 'Run pnpm install before building');
copyFileSync(gsap, resolve(root, 'assets/gsap.min.js'));
writeFileSync(resolve(root, 'index.html'), html);
writeFileSync(resolve(root, 'story.js'), `window.STORY = ${JSON.stringify(story)};\n`);
console.log(`Built ${story.duration}s composition; checked annotation, caption, camera and audio windows.`);
