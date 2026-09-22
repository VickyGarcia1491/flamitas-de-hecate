import { cp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public-static');
await mkdir(output, {recursive: true});
// Lista explícita: nunca publicar .env, servidor, base de datos ni respaldos.
const pages = ['index', 'tienda', 'login', 'registro', 'mi-cuenta', 'admin', 'contacto', 'migracion'];
for (const name of pages) await copyFile(path.join(root, name + '.html'), path.join(output, name + '.html'));
for (const name of ['manifest.webmanifest', 'icon.svg', 'sw.js']) await copyFile(path.join(root, name), path.join(output, name));
for (const name of ['css', 'js', 'fonts', 'img']) await cp(path.join(root, name), path.join(output, name), {recursive: true});
// Proxy del mismo origen: mantiene cookies HttpOnly sin cookies de terceros.
await writeFile(path.join(output, '_redirects'), '/api/* https://flamitas-web.onrender.com/api/:splat 200!\n');
await writeFile(path.join(output, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n/sw.js\n  Cache-Control: no-cache\n');
console.log('Sitio público generado en public-static. Listo para publicar en Netlify.');
