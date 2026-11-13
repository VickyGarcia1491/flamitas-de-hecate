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
// Las listas de páginas del servidor y del sitio estático coinciden con los .html existentes.
const htmlPages = readdirSync('.').filter(f=>f.endsWith('.html')).map(f=>f.slice(0,-5)).sort();
for (const file of ['server/app.js','scripts/build-static.js']) {
 const list = /const pages = \[([^\]]+)\]/.exec(readFileSync(file,'utf8'))?.[1].match(/'([^']+)'/g)?.map(p=>p.slice(1,-1)).sort() || [];
 if (JSON.stringify(list) !== JSON.stringify(htmlPages)) { console.error(`${file}: la lista de páginas no coincide con los .html (${htmlPages.join(', ')})`); failed = true; }
}
// Recuperación de contraseña: sin indexar y nunca guardada por el service worker.
const sw = readFileSync('sw.js','utf8');
const swSinCache = /const SIN_CACHE = \/(.+)\/;/.exec(sw);
for (const page of ['recuperar','restablecer']) {
 if (!existsSync(page+'.html')) { console.error(`falta ${page}.html`); failed = true; continue; }
 const html = readFileSync(page+'.html','utf8');
 if (!/<meta name="robots" content="noindex">/.test(html)) { console.error(`${page}.html: falta <meta name="robots" content="noindex">`); failed = true; }
 if (!/<script src="(?:\.\/)?js\/recuperacion\.js"/.test(html)) { console.error(`${page}.html: falta js/recuperacion.js`); failed = true; }
 if (sw.includes(`"/${page}.html"`)) { console.error(`sw.js: ${page}.html no debe guardarse en caché`); failed = true; }
 if (!swSinCache || !sw.includes('SIN_CACHE.test(url.pathname)') || !['/'+page+'.html','/'+page].every(p=>new RegExp(swSinCache[1]).test(p))) { console.error(`sw.js: ${page} debe quedar fuera del service worker`); failed = true; }
}
if (!sw.includes('"/js/recuperacion.js"')) { console.error('sw.js: falta /js/recuperacion.js'); failed = true; }
process.exitCode = failed ? 1 : 0;
if (!failed) console.log('Sintaxis y recursos locales correctos.');
