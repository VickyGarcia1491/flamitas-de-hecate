import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createApp, initialize} from '../server/app.js';
import {imageHash} from '../server/product-images.js';

// GET real con http (fetch descomprime solo y oculta Content-Encoding).
function get(port, path, headers = {}, method = 'GET') {
 return new Promise((resolve, reject) => {
  const req = http.request({host: '127.0.0.1', port, path, method, headers}, res => {
   const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks)}));
  });
  req.on('error', reject); req.end();
 });
}

test('Velocidad: compresión y cabeceras de caché por tipo de recurso', async t => {
 const pg = new PGlite();
 const db = {query: (sql, args) => !args && sql.includes('CREATE TABLE') ? pg.exec(sql) : pg.query(sql, args), connect: async () => ({query: (...a) => pg.query(...a), release() {}})};
 await initialize(db, {ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'test-admin-password-123'});
 const server = createApp(db).listen(0, '127.0.0.1');
 await new Promise(resolve => server.once('listening', resolve));
 t.after(async () => { await new Promise(resolve => server.close(resolve)); await pg.close(); });
 const port = server.address().port;
 const gzip = {'Accept-Encoding': 'gzip'};

 await t.test('Texto comprimido: HTML, CSS, JS, JSON y fuentes; el contenido no cambia', async () => {
  for (const [ruta, archivo] of [['/', 'index.html'], ['/tienda.html', 'tienda.html'], ['/css/styles.css', 'css/styles.css'], ['/js/api.js', 'js/api.js'], ['/sw.js', 'sw.js'], ['/fonts/amsterdam-two-ttf.ttf', 'fonts/amsterdam-two-ttf.ttf']]) {
   const res = await get(port, ruta, gzip);
   assert.equal(res.status, 200, ruta);
   assert.equal(res.headers['content-encoding'], 'gzip', ruta);
   assert.match(res.headers.vary || '', /Accept-Encoding/i, ruta);
   const original = await readFile(archivo);
   assert.ok(res.body.length < original.length, ruta + ' pesa menos comprimido');
   assert.deepEqual(zlib.gunzipSync(res.body), original, ruta + ' llega idéntico');
  }
  const api = await get(port, '/api/bootstrap', gzip);
  assert.equal(api.headers['content-encoding'], 'gzip');
  assert.ok(Array.isArray(JSON.parse(zlib.gunzipSync(api.body)).productos));
  const br = await get(port, '/css/styles.css', {'Accept-Encoding': 'br'});
  assert.equal(br.headers['content-encoding'], 'br', 'Brotli si el navegador lo acepta');
  assert.deepEqual(zlib.brotliDecompressSync(br.body), await readFile('css/styles.css'));
 });

 await t.test('Sin Accept-Encoding y en imágenes no se comprime', async () => {
  const plano = await get(port, '/css/styles.css');
  assert.equal(plano.headers['content-encoding'], undefined);
  assert.deepEqual(plano.body, await readFile('css/styles.css'));
  for (const ruta of ['/img/logo-flamitas-manos.png', '/img/Nosotras.jpeg']) assert.equal((await get(port, ruta, gzip)).headers['content-encoding'], undefined, ruta);
 });

 await t.test('Caché: 30 días para imágenes y fuentes; revalidación para CSS, JS, HTML y sw.js; /api sin caché', async () => {
  const esperado = {
   '/img/logo-flamitas-manos.png': 'public, max-age=2592000',
   '/img/fondo-flamitas-web.png': 'public, max-age=2592000',
   '/fonts/amsterdam-two-ttf.ttf': 'public, max-age=2592000',
   '/icon.svg': 'public, max-age=2592000',
   '/css/styles.css': 'no-cache', '/css/publico.css': 'no-cache', '/js/api.js': 'no-cache', '/js/mostrar-password.js': 'no-cache',
   '/': 'no-cache', '/index.html': 'no-cache', '/tienda.html': 'no-cache', '/restablecer.html': 'no-cache',
   '/sw.js': 'no-cache', '/manifest.webmanifest': 'no-cache',
   '/api/bootstrap': 'no-store'
  };
  for (const [ruta, cache] of Object.entries(esperado)) {
   const res = await get(port, ruta, gzip);
   assert.equal(res.status, 200, ruta);
   assert.equal(res.headers['cache-control'], cache, ruta);
  }
  assert.equal((await get(port, '/api/no-existe', gzip)).headers['cache-control'], 'no-store');
 });

 await t.test('CSS y JS se revalidan con ETag: 304 sin cuerpo si no cambiaron', async () => {
  for (const ruta of ['/css/styles.css', '/js/api.js', '/index.html', '/sw.js']) {
   const primero = await get(port, ruta, gzip);
   assert.ok(primero.headers.etag, ruta + ' tiene ETag');
   const segundo = await get(port, ruta, {...gzip, 'If-None-Match': primero.headers.etag});
   assert.equal(segundo.status, 304, ruta);
   assert.equal(segundo.body.length, 0);
  }
 });

 await t.test('Las fotos de productos conservan su caché larga (excepción de /api)', async () => {
  const productos = JSON.parse(zlib.gunzipSync((await get(port, '/api/bootstrap', gzip)).body)).productos;
  const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  await db.query('INSERT INTO product_images(product_id,image,hash) VALUES($1,$2,$3)', [productos[0].id, pixel, imageHash(pixel)]);
  const res = await get(port, `/api/product-images/${productos[0].id}?v=${imageHash(pixel)}`, gzip);
  assert.equal(res.status, 200);
  assert.equal(res.headers['cache-control'], 'public, max-age=31536000, immutable');
 });
});

test('HTML: preconnect y display=swap para Google Fonts, imagen diferida con dimensiones, logo sin diferir', async () => {
 const paginas = (await readdir('.')).filter(f => f.endsWith('.html'));
 let conFuentes = 0;
 for (const pagina of paginas) {
  const html = await readFile(pagina, 'utf8');
  if (html.includes('fonts.googleapis.com/css')) {
   conFuentes++;
   assert.match(html, /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/, pagina);
   assert.match(html, /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/, pagina);
   assert.match(html, /fonts\.googleapis\.com\/css2\?[^"]*&display=swap"/, pagina);
   assert.ok(html.indexOf('rel="preconnect"') < html.indexOf('fonts.googleapis.com/css2'), pagina + ': preconnect antes de la hoja');
  }
  for (const img of html.matchAll(/<img\b[^>]*>/g)) {
   if (/logo-flamitas-manos|carrito-vela/.test(img[0])) assert.doesNotMatch(img[0], /loading="lazy"/, pagina + ': la primera pantalla carga enseguida');
  }
 }
 assert.equal(conFuentes, paginas.length - 1, 'todas salvo migracion.html usan Google Fonts');
 const index = await readFile('index.html', 'utf8');
 assert.match(index, /<img src="\.\/img\/Nosotras\.jpeg" alt="[^"]+" width="1024" height="1536" loading="lazy" decoding="async">/);
});

test('El fondo y sus reglas CSS siguen exactamente iguales', async () => {
 const fondo = await readFile('img/fondo-flamitas-web.png');
 assert.equal(createHash('sha256').update(fondo).digest('hex'), '5b0054c212637947dbdd9a6dc8a93f81f6e1505aee1151550f317171e81a51bd');
 const reglas = {
  'css/styles.css': ["background-image: url('../img/fondo-flamitas-web.png');", 'background-attachment: fixed;', 'background-attachment: scroll'],
  'css/publico.css': ["background-image:url('../img/fondo-flamitas-web.png')", 'background-attachment:fixed', 'background-attachment:scroll'],
  'css/admin.css': ["background-image:url('../img/fondo-flamitas-web.png')", 'background-attachment:fixed', 'background-attachment:scroll']
 };
 for (const [archivo, textos] of Object.entries(reglas)) {
  const css = await readFile(archivo, 'utf8');
  for (const texto of textos) assert.ok(css.includes(texto), `${archivo}: ${texto}`);
 }
});
