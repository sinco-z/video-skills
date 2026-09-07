import {readFileSync,writeFileSync,copyFileSync,existsSync,mkdirSync,realpathSync,statSync} from 'node:fs';
import {resolve,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {resolveStory} from './story.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function asset(src) {
  assert(typeof src==='string' && src && !src.includes('\\'),'Use a forward-slash project-relative asset path');
  const path=resolve(root,src);
  assert(path.startsWith(root+sep)&&existsSync(path)&&statSync(path).isFile(),`Missing project asset: ${src}`);
  assert(realpathSync(path).startsWith(realpathSync(root)+sep),`Asset resolves outside the project: ${src}`);
  return path;
}
const input=JSON.parse(readFileSync(resolve(root,'story.json'),'utf8'));
const durations=new Map();
const story=resolveStory(input,src=>{
  if(!durations.has(src)) {
    const path=asset(src);
    let result;
    try {result=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type','-of','json',path],{encoding:'utf8'}));}
    catch(error) {throw new Error(`Cannot probe ${src}. Install FFmpeg/ffprobe and verify the file. ${error.message}`);}
    assert(result.streams?.some(s=>s.codec_type==='audio'),`Asset has no audio stream: ${src}`);
    durations.set(src,Number(result.format.duration));
  }
  return durations.get(src);
});
const escapeHtml=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const boardPath=asset(story.board.src);
const board=story.board.type==='svg' ? readFileSync(boardPath,'utf8') :
  `<image href="${escapeHtml(story.board.src)}" x="0" y="0" width="${story.board.width}" height="${story.board.height}" preserveAspectRatio="xMidYMid meet"/>`;
const paths=story.annotations.map(a=>`<path id="${a.id}" class="mark" d="${a.path}"/>`).join('\n');
const audio=story.audio.map((c,i)=>`<audio id="voice${i}" src="${escapeHtml(c.src)}" data-start="${c.start}" data-duration="${c.duration}" data-track-index="2"></audio>`).join('\n');
const c=story.canvas;
const values={WIDTH:c.width,HEIGHT:c.height,FPS:c.fps,VIEWPORT_HEIGHT:c.viewportHeight,
  BOARD_WIDTH:story.board.width,BOARD_HEIGHT:story.board.height,BOARD_LABEL:escapeHtml(story.board.label??'信息图'),
  MARGIN:c.margin,CAPTION_BOTTOM:Math.round(c.rail*.18),CAPTION_HEIGHT:Math.round(c.rail*.65),
  CAPTION_FONT_SIZE:c.fontSize,DURATION:story.duration,BOARD_CONTENT:board,ANNOTATION_PATHS:paths};
let html=readFileSync(resolve(root,'index.html.in'),'utf8');
for(const [key,value] of Object.entries(values))html=html.replaceAll(`{{${key}}}`,()=>String(value));
assert(!/\{\{[A-Z_]+\}\}/.test(html),'Unresolved template field');
html=html.replace('<!-- Captions and audio are built synchronously from story.js. -->',()=>audio)
  .replace('<script src="runtime.js"></script>',()=>'<script>\n'+readFileSync(resolve(root,'runtime.js'),'utf8')+'\n</script>');
const gsap=resolve(root,'node_modules/gsap/dist/gsap.min.js');
assert(existsSync(gsap),'Run pnpm install before building');
mkdirSync(resolve(root,'assets'),{recursive:true});
copyFileSync(gsap,resolve(root,'assets/gsap.min.js'));
writeFileSync(resolve(root,'index.html'),html);
writeFileSync(resolve(root,'story.js'),`window.STORY = ${JSON.stringify(story)};\n`);
writeFileSync(resolve(root,'build-report.json'),JSON.stringify({duration:story.duration,canvas:story.canvas,
  audio:story.audio.map(({src,start,duration})=>({src,start,duration})),shots:story.shots,reviewTimes:story.reviewTimes},null,2)+'\n');
console.log(`Built ${c.width}×${c.height}, ${story.duration.toFixed(3)}s. Measured ${story.audio.length} audio clips; fitted camera regions and generated temporary underlines.`);
console.log(`Review emphasis boundaries: hyperframes check --at ${story.reviewTimes.join(',')}`);
