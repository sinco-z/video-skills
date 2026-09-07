import {cpSync, existsSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const destination = process.argv[2];
if (!destination || process.argv.length !== 3) {
  console.error('Usage: node init-project.mjs <new-project-directory>');
  process.exit(1);
}
const target = resolve(destination);
if (existsSync(target)) {
  console.error(`Refusing to overwrite existing path: ${target}`);
  process.exit(1);
}
const source = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/template');
mkdirSync(dirname(target), {recursive: true});
cpSync(source, target, {recursive: true, errorOnExist: true, force: false});
console.log(`Created ${target}\nNext: cd into that directory, then run pnpm install and pnpm check.`);
