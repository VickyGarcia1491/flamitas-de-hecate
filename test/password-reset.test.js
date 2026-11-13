import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {PGlite} from '@electric-sql/pglite';
import {JSDOM, VirtualConsole} from 'jsdom';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createApp, initialize} from '../server/app.js';
import {hashPassword, tokenHash} from '../server/security.js';
import {createMailer, publicUrl, passwordResetEmail} from '../server/mail.js';

// Todo lo que se escribe en consola durante estas pruebas: nunca debe incluir tokens, enlaces ni claves.
const logs = [], secretos = new Set();
const consolaOriginal = {log: console.log, warn: console.warn, error: console.error};
for (const metodo of Object.keys(consolaOriginal)) console[metodo] = (...args) => logs.push(args.map(String).join(' '));
after(() => {
 Object.assign(console, consolaOriginal);
 for (const secreto of secretos) for (const linea of logs) assert.equal(linea.includes(secreto), false, 'la consola no registra datos sensibles');
});

const PUBLIC_URL = 'https://flamitas.example';
const tokenDe = link => /#token=([a-f0-9]{64})$/.exec(link)?.[1];

// Servidor con base en memoria y envío de correo falso.
async function servidor(t, {config = {}, sendMail, resetDelayMs = 20} = {}) {
 const pg = new PGlite();
 let tail = Promise.resolve();
 async function lock() { const previous = tail; let release; tail = new Promise(resolve => release = resolve); await previous; return release; }
 const query = (sql, args) => args ? pg.query(sql, args) : sql.includes('CREATE TABLE') ? pg.exec(sql) : pg.query(sql);
 const db = {query: async (sql, args) => { const release = await lock(); try { return await query(sql, args); } finally { release(); } }, connect: async () => { const release = await lock(); return {query, release}; }};
 const admin = {ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'test-admin-password-123'};
 await initialize(db, admin);
 const correos = [];
 const enviar = sendMail || (async mail => { correos.push(mail); secretos.add(tokenDe(mail.text)); secretos.add(mail.text.match(/https:\S+#token=\S+/)[0]); });
 const server = createApp(db, {PUBLIC_URL, ...config}, {sendMail: enviar, resetDelayMs}).listen(0, '127.0.0.1');
 await new Promise(resolve => server.once('listening', resolve));
 t.after(async () => { await new Promise(resolve => server.close(resolve)); await pg.close(); });
 const port = server.address().port;
 async function request(url, method = 'GET', body, cookie = '') {
  const response = await fetch(`http://127.0.0.1:${port}${url}`, {method, headers: {'Content-Type': 'application/json', 'X-Flamitas': '1', Cookie: cookie}, ...(body ? {body: JSON.stringify(body)} : {})});
  return {status: response.status, data: await response.json().catch(() => null), cookie: response.headers.get('set-cookie')};
 }
 // Pedido con Host y X-Forwarded-Host falsos: el enlace igual debe usar PUBLIC_URL.
 function requestHostFalso(body) {
  return new Promise((resolve, reject) => {
   const req = http.request({host: '127.0.0.1', port, path: '/api/password-reset/request', method: 'POST', headers: {Host: 'evil.example', 'X-Forwarded-Host': 'evil.example', 'Content-Type': 'application/json', 'X-Flamitas': '1'}}, res => { let data = ''; res.on('data', c => data += c); res.on('end', () => resolve({status: res.statusCode, data: JSON.parse(data)})); });
   req.on('error', reject); req.end(JSON.stringify(body));
  });
 }
 const esperarCorreos = async n => { for (let i = 0; i < 100 && correos.length < n; i++) await new Promise(r => setTimeout(r, 10)); };
 const login = async (address, password) => (await request('/api/login', 'POST', {email: address, password})).cookie.split(';')[0];
 const foto = async () => ({
  users: (await db.query('SELECT * FROM users ORDER BY id')).rows,
  sessions: (await db.query('SELECT * FROM sessions ORDER BY token_hash')).rows,
  push: (await db.query('SELECT * FROM push_subscriptions ORDER BY endpoint')).rows
 });
 const suscribir = async (cookie, nombre) => {
  const p256dh = (await db.query('SELECT keys FROM push_config')).rows[0].keys.publicKey;
  assert.equal((await request('/api/admin/push/subscription', 'POST', {endpoint: 'https://fcm.googleapis.com/fcm/send/' + nombre, keys: {p256dh, auth: 'a'.repeat(22)}}, cookie)).status, 200);
 };
 return {db, admin, correos, request, requestHostFalso, esperarCorreos, login, foto, suscribir};
}

test('Pedir el enlace: respuesta idéntica, enlace con PUBLIC_URL, token hasheado y sin cambiar contraseñas ni sesiones', async t => {
 const s = await servidor(t);
 const adminCookie = await s.login(s.admin.ADMIN_EMAIL, s.admin.ADMIN_PASSWORD);
 await s.suscribir(adminCookie, 'admin');
 await s.request('/api/register', 'POST', {nombre: 'Ana', email: 'ana@example.com', telefono: '099', password: 'vela-azul'});
 const ana = await s.login('ana@example.com', 'vela-azul'), anaCelular = await s.login('ana@example.com', 'vela-azul');
 const antes = await s.foto();

 const existe = await s.requestHostFalso({email: 'ANA@example.com'});
 const noExiste = await s.request('/api/password-reset/request', 'POST', {email: 'nadie@example.com'});
 assert.equal(existe.status, 200);
 assert.deepEqual(existe.data, noExiste.data);
 assert.equal(existe.status, noExiste.status);
 assert.match(existe.data.mensaje, /Si el email corresponde a una cuenta/);

 await s.esperarCorreos(1);
 assert.equal(s.correos.length, 1, 'solo se envía a cuentas existentes');
 const correo = s.correos[0];
 assert.equal(correo.to, 'ana@example.com');
 const link = correo.text.match(/\S+#token=\S+/)[0];
 assert.match(link, /^https:\/\/flamitas\.example\/restablecer\.html#token=[a-f0-9]{64}$/);
 assert.doesNotMatch(correo.text + correo.html, /evil\.example/);
 assert.match(correo.text, /vence en 1 hora/);
 assert.match(correo.text, /Si no lo pediste, podés ignorar este correo/);
 assert.match(correo.text, /Si necesitás ayuda, escribinos desde https:\/\/flamitas\.example\/contacto\.html$/);
 assert.doesNotMatch(correo.html, /<img|<script|track|pixel/i);

 const token = tokenDe(link);
 const filas = (await s.db.query('SELECT * FROM password_resets')).rows;
 assert.equal(filas.length, 1);
 assert.equal(filas[0].token_hash, tokenHash(token));
 assert.doesNotMatch(JSON.stringify(filas), new RegExp(token));
 const minutos = (new Date(filas[0].expires_at) - new Date(filas[0].created_at)) / 60000;
 assert.ok(minutos > 59 && minutos <= 60, 'vence en 1 hora');

 // Pedir el enlace no toca contraseñas, sesiones ni avisos de nadie.
 assert.deepEqual(await s.foto(), antes);
 for (const cookie of [ana, anaCelular, adminCookie]) assert.ok((await s.request('/api/bootstrap', 'GET', null, cookie)).data.usuario);
 assert.equal((await s.request('/api/login', 'POST', {email: 'ana@example.com', password: 'vela-azul'})).status, 200);

 // Un pedido nuevo invalida el anterior.
 await s.request('/api/password-reset/request', 'POST', {email: 'ana@example.com'});
 await s.esperarCorreos(2);
 const tokenNuevo = tokenDe(s.correos[1].text.match(/\S+#token=\S+/)[0]);
 assert.notEqual(tokenNuevo, token);
 assert.deepEqual((await s.request('/api/password-reset/complete', 'POST', {token, nueva: 'vela-verde'})).data, {error: 'El enlace no es válido o venció. Pedí uno nuevo.'});

 // Una contraseña que no cumple la política no gasta el enlace.
 assert.match((await s.request('/api/password-reset/complete', 'POST', {token: tokenNuevo, nueva: 'corta'})).data.error, /entre 8 y 128/);
 assert.match((await s.request('/api/password-reset/complete', 'POST', {token: tokenNuevo, nueva: 'ana@example.com'})).data.error, /igual a tu email/);
 assert.equal((await s.request('/api/password-reset/complete', 'POST', {token: tokenNuevo, nueva: 'vela-verde'})).status, 200);

 // Al completar: cierra todas las sesiones de Ana y solo las de ella.
 assert.equal((await s.request('/api/bootstrap', 'GET', null, ana)).data.usuario, null);
 assert.equal((await s.request('/api/bootstrap', 'GET', null, anaCelular)).data.usuario, null);
 assert.equal((await s.request('/api/bootstrap', 'GET', null, adminCookie)).data.usuario.rol, 'admin');
 const despues = await s.foto();
 assert.deepEqual(despues.push, antes.push);
 assert.deepEqual(despues.users.filter(u => u.email !== 'ana@example.com'), antes.users.filter(u => u.email !== 'ana@example.com'));
 assert.equal((await s.request('/api/login', 'POST', {email: 'ana@example.com', password: 'vela-azul'})).status, 401);
 assert.equal((await s.request('/api/login', 'POST', {email: 'ana@example.com', password: 'vela-verde'})).status, 200);

 // El enlace no sirve dos veces.
 const repetido = await s.request('/api/password-reset/complete', 'POST', {token: tokenNuevo, nueva: 'otra-vela-nueva'});
 assert.deepEqual([repetido.status, repetido.data], [400, {error: 'El enlace no es válido o venció. Pedí uno nuevo.'}]);
 assert.equal((await s.request('/api/login', 'POST', {email: 'ana@example.com', password: 'vela-verde'})).status, 200);
});

test('Administradora: mínimo 12, cierra todas sus sesiones y avisos sin tocar a otras personas', async t => {
 const s = await servidor(t);
 const principal = await s.login(s.admin.ADMIN_EMAIL, s.admin.ADMIN_PASSWORD), celular = await s.login(s.admin.ADMIN_EMAIL, s.admin.ADMIN_PASSWORD);
 await s.suscribir(principal, 'principal'); await s.suscribir(celular, 'celular');
 await s.db.query("INSERT INTO users(email,nombre,password_hash,rol) VALUES('segunda@example.com','Segunda',$1,'admin')", [await hashPassword('segunda-clave-larga')]);
 const segunda = await s.login('segunda@example.com', 'segunda-clave-larga');
 await s.suscribir(segunda, 'segunda');
 await s.request('/api/register', 'POST', {nombre: 'Ana', email: 'ana@example.com', telefono: '', password: 'vela-azul'});
 const ana = await s.login('ana@example.com', 'vela-azul');
 const antes = await s.foto();

 await s.request('/api/password-reset/request', 'POST', {email: s.admin.ADMIN_EMAIL});
 await s.esperarCorreos(1);
 assert.deepEqual(await s.foto(), antes, 'pedir el enlace no cierra sesiones ni avisos');
 const token = tokenDe(s.correos[0].text.match(/\S+#token=\S+/)[0]);

 assert.match((await s.request('/api/password-reset/complete', 'POST', {token, nueva: 'vela-azul-1'})).data.error, /entre 12 y 128/);
 const ok = await s.request('/api/password-reset/complete', 'POST', {token, nueva: 'una-clave-nueva-larga'}, principal);
 assert.equal(ok.status, 200);
 assert.match(ok.cookie, /flamitas_session=;/, 'el dispositivo que restableció también sale');

 const despues = await s.foto();
 const adminId = antes.users.find(u => u.email === s.admin.ADMIN_EMAIL).id;
 assert.deepEqual(despues.sessions.filter(x => x.user_id === adminId), []);
 assert.deepEqual(despues.push.map(p => p.endpoint.split('/').at(-1)), ['segunda']);
 assert.deepEqual(despues.sessions, antes.sessions.filter(x => x.user_id !== adminId));
 assert.equal((await s.request('/api/bootstrap', 'GET', null, segunda)).data.usuario.email, 'segunda@example.com');
 assert.equal((await s.request('/api/bootstrap', 'GET', null, ana)).data.usuario.email, 'ana@example.com');
 assert.equal((await s.request('/api/login', 'POST', {email: s.admin.ADMIN_EMAIL, password: 'una-clave-nueva-larga'})).status, 200);
});

test('El enlace vencido, inventado o mal formado no sirve y no cambia la contraseña', async t => {
 const s = await servidor(t);
 await s.request('/api/register', 'POST', {nombre: 'Ana', email: 'ana@example.com', telefono: '', password: 'vela-azul'});
 await s.request('/api/password-reset/request', 'POST', {email: 'ana@example.com'});
 await s.esperarCorreos(1);
 const token = tokenDe(s.correos[0].text.match(/\S+#token=\S+/)[0]);
 await s.db.query("UPDATE password_resets SET expires_at=now()-interval '1 minute'");
 const generico = {error: 'El enlace no es válido o venció. Pedí uno nuevo.'};
 for (const intento of [token, 'f'.repeat(64), 'abc', '', null, {token}]) {
  const res = await s.request('/api/password-reset/complete', 'POST', {token: intento, nueva: 'vela-verde'});
  assert.deepEqual([res.status, res.data], [400, generico]);
 }
 assert.equal((await s.request('/api/login', 'POST', {email: 'ana@example.com', password: 'vela-azul'})).status, 200);
});

test('Límites: por IP y por email, sin delatar si la cuenta existe', async t => {
 const s = await servidor(t);
 await s.request('/api/register', 'POST', {nombre: 'Ana', email: 'ana@example.com', telefono: '', password: 'vela-azul'});
 await s.request('/api/register', 'POST', {nombre: 'Bea', email: 'bea@example.com', telefono: '', password: 'vela-azul'});
 const respuestas = [];
 for (const address of ['ana@example.com', 'ana@example.com', 'ana@example.com', ' ANA@example.com ']) respuestas.push(await s.request('/api/password-reset/request', 'POST', {email: address}));
 assert.equal(new Set(respuestas.map(r => JSON.stringify([r.status, r.data]))).size, 1, 'el límite por email responde igual');
 await s.esperarCorreos(3); await new Promise(r => setTimeout(r, 50));
 assert.equal(s.correos.length, 3, 'tres correos por email por hora');
 await s.request('/api/password-reset/request', 'POST', {email: 'bea@example.com'});
 await s.esperarCorreos(4);
 assert.equal(s.correos.at(-1).to, 'bea@example.com', 'el límite es por email');
 assert.equal((await s.request('/api/password-reset/request', 'POST', {email: 'bea@example.com'})).status, 429, 'cinco pedidos por IP');
 for (let i = 0; i < 10; i++) assert.equal((await s.request('/api/password-reset/complete', 'POST', {token: 'f'.repeat(64), nueva: 'vela-verde'})).status, 400);
 const bloqueado = await s.request('/api/password-reset/complete', 'POST', {token: 'f'.repeat(64), nueva: 'vela-verde'});
 assert.deepEqual([bloqueado.status, bloqueado.data], [429, {error: 'Demasiados intentos. Probá en 15 minutos.'}]);
});

test('Demora mínima igual y el envío no retrasa ni rompe la respuesta', async t => {
 let llamadas = 0;
 const s = await servidor(t, {resetDelayMs: 250, sendMail: () => { llamadas++; return Promise.reject(Object.assign(new Error('fallo'), {status: 503})); }});
 await s.request('/api/register', 'POST', {nombre: 'Ana', email: 'ana@example.com', telefono: '', password: 'vela-azul'});
 const tiempos = [];
 for (const address of ['ana@example.com', 'nadie@example.com']) {
  const inicio = Date.now();
  assert.equal((await s.request('/api/password-reset/request', 'POST', {email: address})).status, 200);
  tiempos.push(Date.now() - inicio);
 }
 assert.ok(tiempos.every(ms => ms >= 240), 'ambas respuestas esperan la demora mínima: ' + tiempos);
 await new Promise(r => setTimeout(r, 30));
 assert.equal(llamadas, 1);
 assert.ok(logs.some(l => l === 'No se pudo enviar el correo de recuperación: 503'));
 // Un envío que nunca termina tampoco retiene la respuesta.
 const colgado = await servidor(t, {sendMail: () => new Promise(() => {})});
 await colgado.request('/api/register', 'POST', {nombre: 'Ana', email: 'ana@example.com', telefono: '', password: 'vela-azul'});
 assert.equal((await colgado.request('/api/password-reset/request', 'POST', {email: 'ana@example.com'})).status, 200);
});

test('Sin PUBLIC_URL válida no se crea el enlace y se avisa sin datos sensibles', async t => {
 for (const valor of [undefined, 'javascript:alert(1)', 'https://user:pw@flamitas.example']) {
  const s = await servidor(t, {config: {PUBLIC_URL: valor}});
  await s.request('/api/register', 'POST', {nombre: 'Ana', email: 'ana@example.com', telefono: '', password: 'vela-azul'});
  const previos = logs.length;
  const res = await s.request('/api/password-reset/request', 'POST', {email: 'ana@example.com'});
  assert.equal(res.status, 200);
  await new Promise(r => setTimeout(r, 30));
  assert.equal(s.correos.length, 0);
  assert.equal((await s.db.query('SELECT count(*)::int AS n FROM password_resets')).rows[0].n, 0);
  assert.deepEqual(logs.slice(previos), ['Recuperación desactivada: falta configurar PUBLIC_URL con una dirección https válida.']);
 }
});

test('Envío con Resend: sin clave no envía; con clave usa la API HTTP con tiempo límite', async () => {
 const llamadas = [];
 const fetchFalso = async (url, options) => { llamadas.push({url, options}); return {ok: true, status: 200}; };
 const mail = {to: 'ana@example.com', ...passwordResetEmail('https://flamitas.example/restablecer.html#token=' + 'c'.repeat(64), 'https://flamitas.example')};
 secretos.add('c'.repeat(64));

 const previos = logs.length;
 assert.equal(await createMailer({MAIL_FROM: 'Flamitas <no-responder@flamitas.example>'}, fetchFalso)(mail), false);
 assert.equal(await createMailer({RESEND_API_KEY: 're_clave_de_prueba_secreta'}, fetchFalso)(mail), false);
 assert.equal(llamadas.length, 0);
 assert.deepEqual(logs.slice(previos), ['Correo desactivado: falta configurar RESEND_API_KEY. No se envió el correo.', 'Correo desactivado: falta configurar MAIL_FROM. No se envió el correo.']);

 const clave = 're_clave_de_prueba_secreta'; secretos.add(clave);
 assert.equal(await createMailer({RESEND_API_KEY: clave, MAIL_FROM: 'Flamitas <no-responder@flamitas.example>'}, fetchFalso)(mail), true);
 const [{url, options}] = llamadas;
 assert.equal(url, 'https://api.resend.com/emails');
 assert.equal(options.method, 'POST');
 assert.equal(options.headers.Authorization, 'Bearer ' + clave);
 assert.ok(options.signal instanceof AbortSignal);
 assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(), ['from', 'html', 'subject', 'text', 'to']);
 assert.deepEqual(JSON.parse(options.body).to, ['ana@example.com']);

 const rechazo = await createMailer({RESEND_API_KEY: clave, MAIL_FROM: 'x@flamitas.example'}, async () => ({ok: false, status: 422}))(mail).catch(e => e);
 assert.equal(rechazo.status, 422); assert.doesNotMatch(rechazo.message, /re_clave/);

 // Tiempo límite: una API que no responde se corta.
 // AbortSignal.timeout no retiene el proceso; este temporizador lo mantiene vivo durante la espera.
 const inicio = Date.now(), vivo = setInterval(() => {}, 1000);
 const colgado = await createMailer({RESEND_API_KEY: clave, MAIL_FROM: 'x@flamitas.example'}, (url, {signal}) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason))), 50)(mail).catch(e => e).finally(() => clearInterval(vivo));
 assert.equal(colgado.name, 'TimeoutError'); assert.ok(Date.now() - inicio < 2000);
});

test('PUBLIC_URL: solo direcciones públicas válidas', () => {
 assert.equal(publicUrl('https://flamitasdehecate.com/', true), 'https://flamitasdehecate.com');
 assert.equal(publicUrl('http://localhost:3000', false), 'http://localhost:3000');
 for (const valor of ['http://flamitasdehecate.com', 'javascript:alert(1)', 'https://flamitasdehecate.com/?x=1', 'https://a:b@flamitasdehecate.com', '', undefined]) assert.equal(publicUrl(valor, true), null, String(valor));
});

test('Páginas: link en login, pedido con mensaje único y restablecer quita el token de la URL', async () => {
 const login = await readFile('login.html', 'utf8');
 assert.match(login, /<a href="recuperar\.html">¿Olvidaste tu contraseña\?<\/a>/);
 const token = 'd'.repeat(64);
 for (const name of ['recuperar', 'restablecer']) {
  const html = await readFile(name + '.html', 'utf8');
  assert.match(html, /<meta name="robots" content="noindex">/);
  const navegaciones = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', e => { if (/navigation/i.test(e.message)) navegaciones.push(e.message); });
  const dom = new JSDOM(html, {url: `http://localhost/${name}.html#token=${token}`, runScripts: 'outside-only', virtualConsole});
  try {
   const win = dom.window, doc = win.document, llamadas = [];
   win.fetch = async (url, options) => { llamadas.push({url, body: JSON.parse(options.body || '{}')}); return {ok: true, json: async () => url === '/api/bootstrap' ? {usuario: null, productos: []} : {ok: true, mensaje: 'Mensaje único del servidor'}}; };
   for (const match of html.matchAll(/<script src="(?:\.\/)?([^"]+)"/g)) if (match[1] !== 'js/iniciar.js') vm.runInContext(await readFile(match[1], 'utf8'), dom.getInternalVMContext());
   win.iniciarUsuarios(); win.iniciarRecuperacion();
   if (name === 'recuperar') {
    doc.querySelector('#emailRecuperar').value = 'ana@example.com';
    await win.pedirEnlaceRecuperacion({preventDefault() {}, target: doc.querySelector('#formRecuperar')});
    assert.deepEqual(llamadas.at(-1), {url: '/api/password-reset/request', body: {email: 'ana@example.com'}});
    assert.equal(doc.querySelector('#mensajeRecuperar').textContent, 'Mensaje único del servidor');
    continue;
   }
   assert.equal(win.location.hash, '', 'el token sale de la barra de direcciones');
   assert.equal(win.location.href, 'http://localhost/restablecer.html');
   assert.equal(doc.querySelectorAll('#formRestablecer .btn-mostrar-password').length, 2, 'ojito en ambos campos');
   assert.ok(html.indexOf('js/mostrar-password.js') > html.indexOf('js/iniciar.js'));
   const form = doc.querySelector('#formRestablecer');
   doc.querySelector('#passwordRestablecer').value = 'vela-verde';
   doc.querySelector('#passwordConfirmarRestablecer').value = 'vela-roja';
   await win.guardarPasswordRecuperada({preventDefault() {}, target: form});
   assert.match(doc.querySelector('#mensajeRestablecer').textContent, /no coinciden/);
   assert.equal(llamadas.length, 0);
   doc.querySelector('#passwordConfirmarRestablecer').value = 'vela-verde';
   await win.guardarPasswordRecuperada({preventDefault() {}, target: form});
   assert.deepEqual(llamadas.at(-1), {url: '/api/password-reset/complete', body: {token, nueva: 'vela-verde'}});
   assert.equal(navegaciones.length, 1, 'después de restablecer va a login');
  } finally { dom.window.close(); }
 }
 // Sin token, la página avisa y no envía nada.
 const dom = new JSDOM(await readFile('restablecer.html', 'utf8'), {url: 'http://localhost/restablecer.html', runScripts: 'outside-only'});
 try {
  for (const file of ['js/api.js', 'js/usuarios.js', 'js/recuperacion.js']) vm.runInContext(await readFile(file, 'utf8'), dom.getInternalVMContext());
  dom.window.fetch = async () => assert.fail('no debe llamar al servidor');
  dom.window.iniciarRecuperacion();
  assert.match(dom.window.document.querySelector('#mensajeRestablecer').textContent, /no es válido o venció/);
 } finally { dom.window.close(); }
 // Login muestra la confirmación al volver.
 const loginDom = new JSDOM(login, {url: 'http://localhost/login.html?restablecida=1', runScripts: 'outside-only'});
 try {
  loginDom.window.datosServidor = {usuario: null};
  vm.runInContext(await readFile('js/usuarios.js', 'utf8'), loginDom.getInternalVMContext());
  loginDom.window.iniciarUsuarios();
  assert.equal(loginDom.window.document.querySelector('#mensajeLogin').textContent, 'Tu contraseña se cambió. Ingresá con la nueva.');
 } finally { loginDom.window.close(); }
});
