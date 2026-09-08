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
process.exitCode = failed ? 1 : 0;
if (!failed) console.log('Sintaxis y recursos locales correctos.');
