import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {disjoint} from './story.mjs';

const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{Z}\s]/gu,'');
export function planStory(story,segments){
  assert(Array.isArray(segments)&&segments.length,'Transcript must be a nonempty array');
  for(const s of segments){
    assert(Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.start>=0&&s.end-s.start>=.16,'Invalid transcript timing');
    assert(typeof s.text==='string'&&s.text.trim(),'Transcript text required');
  }
  disjoint(segments,'Transcript');
  const regions=story.regions;
  assert(regions&&typeof regions==='object','Named regions required');
  const own=id=>typeof id==='string'&&Object.hasOwn(regions,id);
  for(const [id,r] of Object.entries(regions)){
    assert(r.keywords===undefined||(Array.isArray(r.keywords)&&r.keywords.every(k=>typeof k==='string'&&normalize(k).length>=2)),`${id}: keywords must contain at least two characters`);
    assert(r.text===undefined||typeof r.text==='string',`${id}: text must be a string`);
    assert(r.cameraTarget===undefined||own(r.cameraTarget),`${id}: unknown cameraTarget`);
  }
  const draft=structuredClone(story),report=[];
  draft.shots=[];draft.annotations=[];draft.captions=[];
  let current=story.initialCamera?.target;
  const ordered=[...segments].sort((a,b)=>a.start-b.start);
  ordered.forEach((s,i)=>{
    const row={index:i,start:s.start,end:s.end,text:s.text,status:'unmatched',candidates:[],warnings:[]};
    draft.captions.push({start:s.start,end:s.end,text:s.caption??s.text});
    let selected;
    if(s.target!==undefined){assert(own(s.target),`Unknown explicit target: ${s.target}`);selected=s.target;row.status='explicit';}
    else {
      const text=normalize(s.text);
      for(const [id,r] of Object.entries(regions)){
        const terms=[r.text,...(r.keywords??[])].filter(x=>typeof x==='string').map(normalize).filter(x=>x.length>=2);
        const matches=[...new Set(terms)].filter(term=>text.includes(term));
        if(matches.length)row.candidates.push({target:id,matches,score:Math.max(...matches.map(m=>m.length))});
      }
      row.candidates.sort((a,b)=>b.score-a.score||a.target.localeCompare(b.target));
      // Different matched regions can represent a list or ambiguous reference: do not guess.
      if(row.candidates.length===1){selected=row.candidates[0].target;row.status='matched';}
      else if(row.candidates.length>1)row.status='ambiguous';
    }
    if(!selected){row.warnings.push('Keep the current camera; add target or region keywords after reviewing this sentence.');report.push(row);return;}
    row.target=selected;
    const region=regions[selected],camera=region.cameraTarget??selected;
    let ready=s.start;
    if(current!==camera){
      if(s.end-s.start<1.8){row.status='too-short';row.warnings.push('Too little time for a readable camera move; combine segments or hold this view manually.');report.push(row);return;}
      draft.shots.push({start:s.start,duration:1.1,target:camera});ready+=1.2;current=camera;
    }
    if(region.underline===true){
      const start=s.emphasisAt??ready;
      assert(Number.isFinite(start)&&start>=s.start&&start<s.end,'emphasisAt must lie inside its transcript segment');
      if(s.emphasisAt===undefined)row.warnings.push('Underline timing is a layout-based draft, not word alignment; listen and set emphasisAt.');
      const end=Math.min(start+1.05,s.end-.05);
      if(start>=ready&&end-start>=.85){draft.annotations.push({id:`auto-mark-${i}`,target:selected,start,draw:.55,end});}
      else row.warnings.push('Underline omitted: emphasis occurs during movement or leaves insufficient draw/hold/fade time.');
    }
    report.push(row);
  });
  const end=ordered.at(-1).end;
  if(typeof draft.duration==='number'&&draft.duration<end)draft.duration='auto';
  return {draft,report:{method:'normalized keyword containment; no semantic model or OCR',requiresReview:true,segments:report,
    unresolved:report.filter(r=>['unmatched','ambiguous','too-short'].includes(r.status)).length}};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const source=process.argv[2];
  assert(source&&process.argv.length===3,'Usage: pnpm plan transcript.json');
  const paths=['story.draft.json','plan-report.json'].map(p=>resolve(root,p));
  assert(paths.every(p=>!existsSync(p)),'Draft/report already exists. Review and move or delete these files before planning again.');
  const result=planStory(JSON.parse(readFileSync(resolve(root,'story.json'),'utf8')),JSON.parse(readFileSync(resolve(source),'utf8')));
  writeFileSync(paths[0],JSON.stringify(result.draft,null,2)+'\n',{flag:'wx'});
  writeFileSync(paths[1],JSON.stringify(result.report,null,2)+'\n',{flag:'wx'});
  console.log(`Draft saved; ${result.report.unresolved} segments need target decisions. Review plan-report.json. Existing story.json was not changed.`);
}
