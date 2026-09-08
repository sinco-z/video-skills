import test from 'node:test';
import assert from 'node:assert/strict';
import {planStory} from './plan.mjs';
import {resolveStory} from './story.mjs';
const base=()=>({version:2,canvas:{preset:'classic'},board:{type:'svg',src:'board.svg',width:1600,height:1050},regions:{
 overview:{x:0,y:0,width:1600,height:1000},card:{x:100,y:100,width:800,height:400},
 word:{x:150,y:200,width:200,height:40,text:'持续收费',keywords:['订阅服务'],cameraTarget:'card',underline:true},
 other:{x:400,y:200,width:200,height:40,text:'行业定制',cameraTarget:'card',underline:true}},
 initialCamera:{target:'overview'},shots:[],annotations:[],captions:[],audio:[],duration:26});
test('matches configured synonym and produces valid motion and single annotations',()=>{
 const input=base();const out=planStory(input,[{start:1,end:5,text:'可以提供订阅服务'},{start:5,end:8,text:'持续收费'}]);
 assert.equal(out.report.unresolved,0);assert.equal(out.draft.shots.length,1);assert.equal(out.draft.annotations.length,2);
 assert.equal(input.shots.length,0);assert.doesNotThrow(()=>resolveStory(out.draft,()=>0));
});
test('does not invent a target for unknown content',()=>{const p=planStory(base(),[{start:1,end:5,text:'天气不错'}]);assert.equal(p.report.unresolved,1);assert.equal(p.draft.shots.length,0)});
test('multiple distinct concepts require an explicit target',()=>{
 const segment={start:1,end:5,text:'从行业定制到持续收费'};
 assert.equal(planStory(base(),[segment]).report.segments[0].status,'ambiguous');
 assert.equal(planStory(base(),[{...segment,target:'word'}]).report.segments[0].status,'explicit');
});
test('timed emphasis during movement is omitted, never shifted silently',()=>{
 const p=planStory(base(),[{start:1,end:5,text:'持续收费',emphasisAt:1.3}]);assert.equal(p.draft.annotations.length,0);
});
test('short segments do not cause hurried camera motion',()=>{
 const p=planStory(base(),[{start:1,end:2,text:'持续收费'}]);assert.equal(p.report.segments[0].status,'too-short');assert.equal(p.draft.shots.length,0);
});
test('rejects overlapping transcript and nonexistent overrides',()=>{
 assert.throws(()=>planStory(base(),[{start:1,end:5,text:'a'},{start:4,end:6,text:'b'}]),/overlapping/);
 assert.throws(()=>planStory(base(),[{start:1,end:5,text:'a',target:'missing'}]),/Unknown explicit/);
});
