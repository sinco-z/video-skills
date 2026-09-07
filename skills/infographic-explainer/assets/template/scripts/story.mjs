import assert from 'node:assert/strict';

export const PRESETS = {
  classic: {width:1440, height:1080, rail:170, margin:64, fontSize:42},
  landscape: {width:1920, height:1080, rail:170, margin:72, fontSize:46},
  portrait: {width:1080, height:1920, rail:240, margin:54, fontSize:42},
};
const finite = n => typeof n === 'number' && Number.isFinite(n);
const positive = n => finite(n) && n > 0;
const EPS = 1e-7;
export function disjoint(items, label) {
  const sorted = [...items].sort((a,b) => a.start-b.start);
  for (let i=1;i<sorted.length;i++) assert(sorted[i].start + EPS >= sorted[i-1].end,
    `${label}: overlapping windows near ${sorted[i].start}s`);
}
function timeWindow(start, end, label) {
  assert(finite(start) && finite(end) && start>=0 && end>start, `${label}: invalid time window`);
}
function cameraFor(pose, regions, canvas) {
  assert(pose && typeof pose === 'object', 'Camera pose required');
  if (pose.target !== undefined) {
    const r = Object.hasOwn(regions,pose.target) ? regions[pose.target] : undefined;
    assert(r, `Unknown camera region: ${pose.target}`);
    const padding = pose.padding ?? canvas.margin;
    const maxScale = pose.maxScale ?? 2.4;
    assert(finite(padding) && padding>=0 && 2*padding<Math.min(canvas.width,canvas.viewportHeight), 'Invalid camera padding');
    assert(positive(maxScale), 'maxScale must be positive');
    const scale = Math.min((canvas.width-2*padding)/r.width,
      (canvas.viewportHeight-2*padding)/r.height, maxScale);
    return {x:canvas.width/2-scale*(r.x+r.width/2), y:canvas.viewportHeight/2-scale*(r.y+r.height/2), scale};
  }
  assert(finite(pose.x) && finite(pose.y) && positive(pose.scale), 'Camera requires a target region or x/y/scale');
  return {x:pose.x,y:pose.y,scale:pose.scale};
}

export function resolveStory(input, probeAudio) {
  assert(input.version===2, 'Use a version: 2 story with named regions. Keep v0.1 projects on their existing template.');
  const preset = PRESETS[input.canvas?.preset ?? 'classic'];
  assert(preset, 'canvas.preset must be classic, landscape or portrait');
  const canvas = {...preset,...input.canvas};
  for (const key of ['width','height','rail','fontSize']) assert(positive(canvas[key]), `Invalid canvas.${key}`);
  assert(Number.isInteger(canvas.width) && Number.isInteger(canvas.height) && canvas.width%2===0 && canvas.height%2===0,
    'Video dimensions must be positive even integers');
  assert(finite(canvas.margin) && canvas.margin>=0 && canvas.rail<canvas.height, 'Invalid canvas margin or subtitle rail');
  canvas.fps = canvas.fps ?? 30;
  assert(Number.isInteger(canvas.fps) && canvas.fps>=1 && canvas.fps<=60, 'fps must be an integer from 1 to 60');
  canvas.viewportHeight=canvas.height-canvas.rail;
  assert(2*canvas.margin<Math.min(canvas.width,canvas.viewportHeight), 'Margins leave no camera viewport');
  const board=input.board;
  assert(board && ['svg','image'].includes(board.type) && positive(board.width) && positive(board.height), 'board requires type, width, height and src');
  assert(typeof board.src==='string' && board.src.length>0, 'board.src required');
  const regions=input.regions;
  assert(regions && typeof regions==='object' && !Array.isArray(regions), 'regions must be a named rectangle map');
  for (const [name,r] of Object.entries(regions)) {
    assert(finite(r.x) && finite(r.y) && positive(r.width) && positive(r.height) && r.x>=0 && r.y>=0 && r.x+r.width<=board.width+EPS && r.y+r.height<=board.height+EPS,
      `Region ${name} is outside the board or has invalid dimensions`);
  }
  for(const key of ['shots','annotations','captions','audio']) assert(Array.isArray(input[key]), `${key} must be an array`);
  const initialCamera=cameraFor(input.initialCamera,regions,canvas);
  const shots=input.shots.map(s=>{
    timeWindow(s.start,s.start+s.duration,'Camera');
    return {start:s.start,duration:s.duration,...cameraFor(s,regions,canvas)};
  });
  const moves=shots.map(s=>({start:s.start,end:s.start+s.duration}));
  disjoint(moves,'Camera');
  const ids=new Set();
  const annotations=input.annotations.map(a=>{
    assert(typeof a.id==='string' && /^[a-zA-Z][\w-]*$/.test(a.id) && !ids.has(a.id),'Annotations require unique valid IDs');
    ids.add(a.id);
    timeWindow(a.start,a.end,a.id);
    assert(positive(a.draw) && a.draw>.01 && a.start+a.draw<=a.end-.15+EPS, `${a.id}: leave at least 0.15s for fade-out`);
    assert(a.allowDuringMove===undefined || typeof a.allowDuringMove==='boolean', 'allowDuringMove must be boolean');
    if(!a.allowDuringMove) assert(!moves.some(s=>a.start<s.end-EPS && a.end>s.start+EPS), `${a.id}: annotation overlaps a camera move; move its time window or explicitly set allowDuringMove`);
    const r=Object.hasOwn(regions,a.target) ? regions[a.target] : undefined;
    assert(r, `Unknown annotation region: ${a.target}`);
    const offset=a.offset??8;
    assert(finite(offset) && offset>=0, 'Underline offset must be nonnegative');
    const y=r.y+r.height+offset, wave=Math.min(3,r.width*.01);
    assert(y+wave+4<=board.height, `${a.id}: underline falls outside the board`);
    const path=`M${r.x} ${y} Q${r.x+r.width*.25} ${y+wave} ${r.x+r.width*.5} ${y} T${r.x+r.width} ${y}`;
    return {...a,path};
  });
  disjoint(annotations,'Annotations (only one may be visible)');
  for(const c of input.captions) {
    timeWindow(c.start,c.end,'Caption');
    assert(c.end-c.start>=.16, 'Caption too short for its entrance');
    assert(typeof c.text==='string' && c.text.trim(), 'Caption text required');
  }
  disjoint(input.captions,'Captions');
  const audio=input.audio.map(c=>{
    const duration=probeAudio(c.src);
    assert(positive(duration), `No measurable audio duration: ${c.src}`);
    if(c.duration!==undefined) assert(finite(c.duration) && Math.abs(c.duration-duration)<=.05,
      `Audio duration mismatch: ${c.src}. Remove the manual duration to use the actual file length.`);
    timeWindow(c.start,c.start+duration,`Audio ${c.src}`);
    return {...c,duration};
  });
  const audioWindows=audio.map(c=>({start:c.start,end:c.start+c.duration}));
  disjoint(audioWindows,'Narration');
  const last=Math.max(0,...moves.map(s=>s.end),...annotations.map(s=>s.end),...input.captions.map(s=>s.end),...audioWindows.map(s=>s.end));
  const tail=input.tail??.3;
  assert(finite(tail) && tail>=0, 'tail must be nonnegative');
  const duration=input.duration==='auto' ? Math.ceil((last+tail)*canvas.fps)/canvas.fps : input.duration;
  assert(positive(duration) && duration+EPS>=last, `Composition duration must reach ${last.toFixed(3)}s to include all content`);
  const reviewTimes=[.8,duration-.1,...annotations.flatMap(a=>[a.start+a.draw/2,a.start+a.draw+.02,a.end+.04])]
    .filter(t=>t>=0&&t<duration).map(t=>Number(t.toFixed(3)));
  return {...input,canvas,initialCamera,shots,annotations,audio,duration,reviewTimes:[...new Set(reviewTimes)].sort((a,b)=>a-b)};
}
