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
 // El CSP solo permite scripts propios: nada de <script> en línea ni manejadores on*=.
 for (const match of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>|<[a-z][^>]*\son[a-z]+\s*=/gi)) { console.error(`${page}: código en línea bloqueado por el CSP: ${match[0].slice(0,80)}`); failed = true; }
 // Los campos de contraseña necesitan el botón para mostrarla.
 if (/type="password"/.test(html) && !/<script src="(?:\.\/)?js\/mostrar-password\.js"/.test(html)) { console.error(`${page}: falta js/mostrar-password.js`); failed = true; }
 if (/<script src="(?:\.\/)?js\/mostrar-password\.js"/.test(html) && html.indexOf('js/mostrar-password.js') < html.indexOf('js/iniciar.js')) { console.error(`${page}: js/mostrar-password.js debe cargarse después de js/iniciar.js`); failed = true; }
 if (/<script src="(?:\.\/)?js\/mostrar-password\.js"/.test(html) && !readFileSync('sw.js','utf8').includes('"/js/mostrar-password.js"')) { console.error('sw.js: falta /js/mostrar-password.js'); failed = true; }
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
