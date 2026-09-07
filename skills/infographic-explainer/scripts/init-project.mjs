import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve,dirname,extname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const args=process.argv.slice(2),destination=args.shift();
assert(destination&&!destination.startsWith('--'),'Usage: node init-project.mjs <new-directory> [--preset classic|landscape|portrait] [--image /path/to/image.png]');
let preset='classic',image;
for(let i=0;i<args.length;i++) {
  if(args[i]==='--preset')preset=args[++i];
  else if(args[i]==='--image'){image=args[++i];assert(image&&!image.startsWith('--'),'--image requires a file path');}
  else throw new Error(`Unknown option: ${args[i]}`);
}
assert(['classic','landscape','portrait'].includes(preset),'Unknown canvas preset');
const target=resolve(destination);
assert(!existsSync(target),`Refusing to overwrite existing path: ${target}`);
let bitmap;
if(image!==undefined) {
  assert(image&&existsSync(resolve(image)),'Image file does not exist');
  const extension=extname(image).toLowerCase();
  assert(['.png','.jpg','.jpeg','.webp','.avif'].includes(extension),'Use a PNG, JPEG, WebP or AVIF bitmap');
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',resolve(image)],{encoding:'utf8'}));
  const dimensions=probe.streams?.[0];
  assert(dimensions?.width>0&&dimensions?.height>0,'Cannot read image dimensions');
  bitmap={...dimensions,extension};
}
const source=resolve(dirname(fileURLToPath(import.meta.url)),'../assets/template');
mkdirSync(dirname(target),{recursive:true});
cpSync(source,target,{recursive:true,errorOnExist:true,force:false});
const path=resolve(target,'story.json');
const story=JSON.parse(readFileSync(path,'utf8'));
story.canvas.preset=preset;
if(bitmap) {
  const src=`assets/board-user${bitmap.extension}`;
  copyFileSync(resolve(image),resolve(target,src));
  story.board={type:'image',src,width:bitmap.width,height:bitmap.height,label:basename(image)};
  story.regions={overview:{x:0,y:0,width:bitmap.width,height:bitmap.height}};
  story.initialCamera={target:'overview'};
  story.shots=[];story.annotations=[];story.captions=[];story.audio=[];
}
writeFileSync(path,JSON.stringify(story,null,2)+'\n');
console.log(`Created ${target} (${preset})\nNext: cd into that directory, then pnpm install, pnpm preflight and pnpm check.`);
if(bitmap)console.log('Imported the image with its original dimensions. Add your own regions, narration and timeline; no sample speech is used.');
