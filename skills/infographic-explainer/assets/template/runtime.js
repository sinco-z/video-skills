/* Synchronous, seekable timeline. No network calls or real-time callbacks. */
const story = window.STORY;
const root = document.getElementById('root');
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({paused: true});
gsap.set('#camera', story.initialCamera);
tl.from('#scene', {opacity: 0, duration: .65, ease: 'power2.out'}, .1);

for (const shot of story.shots) {
  const {start, ...pose} = shot;
  tl.to('#camera', {...pose, ease: 'power2.inOut'}, start);
}

for (const annotation of story.annotations) {
  const {id, start, draw, end} = annotation;
  const path = document.getElementById(id);
  if (!path || typeof path.getTotalLength !== 'function') throw new Error(`Missing SVG annotation: ${id}`);
  const target = `#${id}`;
  const length = path.getTotalLength();
  gsap.set(target, {strokeDasharray: length, strokeDashoffset: length, opacity: 0});
  tl.set(target, {opacity: 1}, start);
  tl.to(target, {strokeDashoffset: 0, duration: draw, ease: 'none'}, start);
  const first = path.getPointAtLength(0);
  tl.set('#cursor', {x: first.x, y: first.y, opacity: 1}, start);
  for (let i = 1; i <= 32; i++) {
    const point = path.getPointAtLength(length * i / 32);
    // Epsilon prevents floating-point boundary overlap warnings.
    tl.to('#cursor', {x: point.x, y: point.y, duration: draw / 32 - .000001, ease: 'none'}, start + (i - 1) * draw / 32);
  }
  tl.to('#cursor', {opacity: 0, duration: .15}, Math.min(start + draw + .2, end - .15));
  tl.to(target, {opacity: 0, duration: .15, ease: 'power1.out'}, end - .15);
  tl.set(target, {opacity: 0}, end);
}

story.captions.forEach((caption, i) => {
  const container = document.createElement('div');
  container.id = `cap${i}`;
  container.className = 'subtitle';
  const text = document.createElement('span');
  // Camera SVG bounds outside its clipped viewport are not painted in this rail.
  text.setAttribute('data-layout-allow-overlap', '');
  text.textContent = caption.text;
  container.append(text);
  root.append(container);
  tl.to(container, {opacity: 1, duration: .16, ease: 'power1.out'}, caption.start);
  tl.set(container, {opacity: 0}, caption.end);
});

// Audio markup is emitted by build.mjs so the compiler can find and mix it.
tl.fromTo('#progress', {scaleX: 0}, {scaleX: 1, duration: story.duration, ease: 'none'}, 0);
window.__timelines.main = tl;
