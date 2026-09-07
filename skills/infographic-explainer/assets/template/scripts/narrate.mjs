import {readFileSync,writeFileSync,existsSync,mkdirSync,mkdtempSync,renameSync,rmSync,realpathSync} from 'node:fs';
import {resolve,dirname,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
let voice='Tingting',rate=255,overwrite=false;
for(let i=0;i<args.length;i++) {
  if(args[i]==='--voice')voice=args[++i];
  else if(args[i]==='--rate')rate=Number(args[++i]);
  else if(args[i]==='--overwrite')overwrite=true;
  else throw new Error('Usage: pnpm narrate [--voice Tingting] [--rate 255] [--overwrite]');
}
assert(process.platform==='darwin','This helper uses macOS say. On another platform, place TTS or recorded files at the story.audio src paths and run pnpm build.');
assert(typeof voice==='string' && voice && Number.isInteger(rate) && rate>=80 && rate<=500,'Invalid voice or rate (80–500)');
const story=JSON.parse(readFileSync(resolve(root,'story.json'),'utf8'));
assert(Array.isArray(story.audio)&&story.audio.length,'No narration clips in story.audio');
const seen=new Set();
const clips=story.audio.map(clip=>{
  assert(typeof clip.text==='string'&&clip.text.trim(),'Each clip needs narration text');
  assert(typeof clip.src==='string'&&extname(clip.src).toLowerCase()==='.wav','The say helper writes WAV files; use a .wav src');
  const path=resolve(root,clip.src);
  assert(path.startsWith(root+sep)&&!seen.has(path),'Narration paths must be distinct project files');
  seen.add(path);
  assert(overwrite||!existsSync(path),`Refusing to replace ${clip.src}. Use --overwrite to regenerate existing clips.`);
  mkdirSync(dirname(path),{recursive:true});
  assert(realpathSync(dirname(path)).startsWith(realpathSync(root)+sep),'Narration directory resolves outside the project');
  return {...clip,path};
});
const stage=mkdtempSync(resolve(root,'assets/.narration-'));
try {
  // Generate all clips before replacing any existing narration.
  clips.forEach((clip,i)=>{
    const text=resolve(stage,`${i}.txt`),aiff=resolve(stage,`${i}.aiff`),wav=resolve(stage,`${i}.wav`);
    writeFileSync(text,clip.text);
    execFileSync('say',['-v',voice,'-r',String(rate),'-f',text,'-o',aiff]);
    execFileSync('ffmpeg',['-y','-v','error','-i',aiff,'-ar','48000',wav]);
    const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',wav],{encoding:'utf8'}));
    assert(Number.isFinite(duration)&&duration>0,`Empty narration: ${clip.src}`);
    console.log(`${clip.src}: ${duration.toFixed(3)}s`);
  });
  clips.forEach((clip,i)=>renameSync(resolve(stage,`${i}.wav`),clip.path));
} finally {rmSync(stage,{recursive:true,force:true});}
console.log(`Voice: macOS ${voice}, rate ${rate}. Run pnpm build to measure the new audio and check your timing.`);
