import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveStory,PRESETS} from './story.mjs';
const input=()=>({version:2,canvas:{preset:'classic'},board:{type:'image',src:'assets/board.png',width:1600,height:1050},
  regions:{focus:{x:300,y:100,width:700,height:400},word:{x:400,y:240,width:200,height:40}},
  initialCamera:{target:'focus'},shots:[{start:0,duration:1,target:'focus'}],
  annotations:[{id:'mark1',target:'word',start:1.2,draw:.4,end:2}],captions:[{start:.1,end:2,text:'示例'}],
  audio:[{start:0,src:'assets/voice.wav'}],duration:'auto',tail:.3});

test('named camera region stays inside safe viewport across all aspect presets',()=>{
  for(const preset of Object.keys(PRESETS)) {
    const s=input();s.canvas.preset=preset;
    const result=resolveStory(s,()=>2.5),p=result.initialCamera,r=s.regions.focus,c=result.canvas;
    assert(p.x+p.scale*r.x>=c.margin-1e-7);
    assert(p.x+p.scale*(r.x+r.width)<=c.width-c.margin+1e-7);
    assert(p.y+p.scale*r.y>=c.margin-1e-7);
    assert(p.y+p.scale*(r.y+r.height)<=c.viewportHeight-c.margin+1e-7);
  }
});
test('duration uses measured audio and rounds up to a complete frame',()=>{
  const result=resolveStory(input(),()=>3.217);
  assert(result.duration>=3.217+.3);
  assert(result.duration-(3.217+.3)<1/result.canvas.fps);
  assert.equal(result.audio[0].duration,3.217);
});
test('fixed duration cannot silently trim narration',()=>{
  const s=input();s.duration=2;
  assert.throws(()=>resolveStory(s,()=>3),/Composition duration must reach/);
});
test('rejects overlapping visible annotations, but permits exact handoff',()=>{
  const s=input();s.annotations.push({...s.annotations[0],id:'mark2',start:1.9,end:2.6});
  assert.throws(()=>resolveStory(s,()=>3),/Annotations.*overlapping/);
  s.annotations[1].start=2;
  assert.doesNotThrow(()=>resolveStory(s,()=>3));
});
test('rejects annotation during camera move unless deliberately allowed',()=>{
  const s=input();s.annotations[0].start=.5;
  assert.throws(()=>resolveStory(s,()=>3),/overlaps a camera move/);
  s.annotations[0].allowDuringMove=true;
  assert.doesNotThrow(()=>resolveStory(s,()=>3));
});
test('unknown or out-of-bounds regions fail before rendering',()=>{
  const s=input();s.shots[0].target='missing';
  assert.throws(()=>resolveStory(s,()=>3),/Unknown camera region/);
  s.shots[0].target='constructor';
  assert.throws(()=>resolveStory(s,()=>3),/Unknown camera region/);
  s.shots[0].target='focus';s.regions.word.x=1550;
  assert.throws(()=>resolveStory(s,()=>3),/outside the board/);
});
test('stale manually entered duration is rejected',()=>{
  const s=input();s.audio[0].duration=2;
  assert.throws(()=>resolveStory(s,()=>3),/duration mismatch/);
});
test('underline is below the declared phrase and independent of canvas',()=>{
  const s=input(),a=resolveStory(s,()=>3).annotations[0];
  assert(a.path.startsWith('M400 288 '));
  s.canvas.preset='portrait';
  assert.equal(resolveStory(s,()=>3).annotations[0].path,a.path);
});
