import {spawnSync} from 'node:child_process';
let failures=0;
const major=Number(process.versions.node.split('.')[0]);
console.log(`${major>=22?'OK':'MISSING'} Node.js ${process.versions.node} (22+ required)`);
if(major<22)failures++;
for(const command of ['ffmpeg','ffprobe']) {
  const result=spawnSync(command,['-version'],{encoding:'utf8'});
  if(result.error || result.status!==0){console.error(`MISSING ${command}: install FFmpeg and expose it on PATH`);failures++;}
  else console.log(`OK ${result.stdout.split('\n')[0]}`);
}
console.log(process.platform==='darwin' ? 'Voice: macOS say is available as an optional provider; pnpm narrate uses Tingting by default.' : 'Voice: use existing audio or an available TTS provider; the macOS say helper is not required to render.');
console.log('Fonts: not bundled. Confirm a Chinese board font and subtitle font in the actual render.');
console.log('Browser: HyperFrames checks/downloads its Chromium runtime on first check/render; this preflight does not launch a browser.');
process.exitCode=failures?1:0;
