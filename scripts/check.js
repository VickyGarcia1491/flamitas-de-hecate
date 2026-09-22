import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
let failed = false;
for (const dir of ['js','server','scripts']) for (const file of readdirSync(dir).filter(f=>f.endsWith('.js'))) {
 const result = spawnSync(process.execPath,['--check',`${dir}/${file}`],{encoding:'utf8'});
 if (result.status) { console.error(result.stderr); failed = true; }
}
for (const file of readdirSync('.').filter(f=>f.endsWith('.html'))) for (const match of readFileSync(file,'utf8').matchAll(/(?:src|href)="(?:\.\/)?((?:js|css)\/[^"?]+)"/g)) {
 if (!existsSync(match[1])) {console.error(`${file}: falta ${match[1]}`); failed = true;}
}
for (const page of readdirSync('.').filter(f=>f.endsWith('.html'))) {
 const html = readFileSync(page,'utf8'), functions = new Map(), ids = new Set();
 for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
  if (ids.has(match[1])) { console.error(`${page}: id duplicado ${match[1]}`); failed = true; }
  ids.add(match[1]);
 }
 for (const script of html.matchAll(/<script src="(?:\.\/)?([^"]+)"/g)) {
  if (!existsSync(script[1])) continue;
  for (const fn of readFileSync(script[1],'utf8').matchAll(/^(?:async )?function (\w+)\(/gm)) {
   if (functions.has(fn[1])) { console.error(`${page}: función duplicada ${fn[1]} en ${script[1]} y ${functions.get(fn[1])}`); failed = true; }
   functions.set(fn[1],script[1]);
  }
 }
}
process.exitCode = failed ? 1 : 0;
if (!failed) console.log('Sintaxis y recursos locales correctos.');
