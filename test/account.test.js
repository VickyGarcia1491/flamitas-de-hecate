import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createApp, initialize} from '../server/app.js';
import {hashPassword, newPassword, tokenHash} from '../server/security.js';

// Base en memoria con el mismo bloqueo simple que usan las otras pruebas de PostgreSQL.
async function servidor(t, preparar) {
 const pg = new PGlite();
 let tail = Promise.resolve();
 async function lock() { const previous = tail; let release; tail = new Promise(resolve => release = resolve); await previous; return release; }
 const query = (sql, args) => args ? pg.query(sql, args) : sql.includes('CREATE TABLE') ? pg.exec(sql) : pg.query(sql);
 const db = {query: async (sql, args) => { const release = await lock(); try { return await query(sql, args); } finally { release(); } }, connect: async () => { const release = await lock(); return {query, release}; }};
 if (preparar) await preparar(pg);
 const config = {ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'test-admin-password-123'};
 await initialize(db, config);
 const server = createApp(db).listen(0, '127.0.0.1');
 await new Promise(resolve => server.once('listening', resolve));
 t.after(async () => { await new Promise(resolve => server.close(resolve)); await pg.close(); });
 async function request(url, method = 'GET', body, cookie = '', headers = {'X-Flamitas': '1'}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${url}`, {method, headers: {'Content-Type': 'application/json', Cookie: cookie, ...headers}, ...(body ? {body: JSON.stringify(body)} : {})});
  return {status: response.status, data: await response.json().catch(() => null), cookie: response.headers.get('set-cookie')?.split(';')[0]};
 }
 return {db, config, request};
}
const sesiones = async (db, email) => (await db.query('SELECT s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.email=$1 ORDER BY s.token_hash', [email])).rows.map(r => r.token_hash);
const hashDe = cookie => tokenHash(cookie.split('=')[1]);

test('Política de contraseñas nuevas', () => {
 assert.throws(() => newPassword('abc1234'), /entre 8 y 128/);
 assert.equal(newPassword('vela-azul'), 'vela-azul');
 assert.equal(newPassword('x'.repeat(128)), 'x'.repeat(128));
 assert.throws(() => newPassword('x'.repeat(129)), /entre 8 y 128/);
 assert.throws(() => newPassword('Password123'), /muy común/);
 assert.throws(() => newPassword('12345678'), /muy común/);
 assert.throws(() => newPassword('Ana@Example.com', {email: 'ana@example.com'}), /igual a tu email/);
 assert.throws(() => newPassword('vela-azul-1', {admin: true}), /entre 12 y 128/);
 assert.equal(newPassword('vela-azul-de-noche', {admin: true}), 'vela-azul-de-noche');
});

test('Base existente: agrega created_at sin tocar usuarios, sesiones ni contraseñas cortas', async t => {
 const sesionVieja = 'a'.repeat(64);
 const {db, request} = await servidor(t, async pg => {
  // Esquema anterior, sin created_at, con una administradora y su sesión abierta.
  await pg.exec("CREATE TABLE users (id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, nombre TEXT NOT NULL, telefono TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL, rol TEXT NOT NULL CHECK (rol IN ('admin','cliente'))); CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL);");
  await pg.query("INSERT INTO users(email,nombre,password_hash,rol) VALUES('vieja@example.com','Vieja',$1,'admin')", [await hashPassword('corta1')]);
  await pg.query("INSERT INTO sessions VALUES($1,1,now()+interval '1 day')", [tokenHash(sesionVieja)]);
 });
 const vieja = (await db.query("SELECT * FROM users WHERE email='vieja@example.com'")).rows[0];
 assert.equal(vieja.created_at, null);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n, 1, 'initialize no crea otra administradora');
 assert.deepEqual(await sesiones(db, 'vieja@example.com'), [tokenHash(sesionVieja)]);
 assert.equal((await request('/api/bootstrap', 'GET', null, 'flamitas_session=' + sesionVieja)).data.usuario.email, 'vieja@example.com');
 // El login solo verifica el hash: una contraseña anterior de 6 caracteres sigue sirviendo.
 assert.equal((await request('/api/login', 'POST', {email: 'vieja@example.com', password: 'corta1'})).status, 200);
 const nueva = await request('/api/register', 'POST', {nombre: 'Nueva', email: 'nueva@example.com', telefono: '099', password: 'vela-azul'});
 assert.equal(nueva.status, 201);
 assert.ok((await db.query("SELECT created_at FROM users WHERE email='nueva@example.com'")).rows[0].created_at instanceof Date);
 const lista = (await request('/api/admin/users', 'GET', null, 'flamitas_session=' + sesionVieja)).data;
 assert.equal(lista.find(u => u.email === 'vieja@example.com').created_at, null);
});

test('Cuentas: registro, lista de usuarios, perfil y cambio de contraseña', async t => {
 const {db, config, request} = await servidor(t);
 const admin = (await request('/api/login', 'POST', {email: config.ADMIN_EMAIL, password: config.ADMIN_PASSWORD})).cookie;
 const adminOtroDispositivo = (await request('/api/login', 'POST', {email: config.ADMIN_EMAIL, password: config.ADMIN_PASSWORD})).cookie;

 await t.test('Registro aplica la política de clientes', async () => {
  const datos = {nombre: 'Ana', email: 'ana@example.com', telefono: '099123456'};
  assert.equal((await request('/api/register', 'POST', {...datos, password: 'corta12'})).status, 400);
  assert.equal((await request('/api/register', 'POST', {...datos, password: 'password123'})).status, 400);
  assert.equal((await request('/api/register', 'POST', {...datos, password: 'ana@example.com'})).status, 400);
  assert.equal((await request('/api/register', 'POST', {...datos, password: 'x'.repeat(129)})).status, 400);
  const ok = await request('/api/register', 'POST', {...datos, password: 'vela-azul'});
  assert.equal(ok.status, 201); assert.equal(ok.data.password_hash, undefined);
 });
 const ana = (await request('/api/login', 'POST', {email: 'ana@example.com', password: 'vela-azul'})).cookie;
 const anaOtroDispositivo = (await request('/api/login', 'POST', {email: 'ana@example.com', password: 'vela-azul'})).cookie;
 const otra = (await request('/api/register', 'POST', {nombre: 'Otra', email: 'otra@example.com', telefono: '', password: 'otra-vela-1'})).cookie;

 await t.test('La lista de usuarios es solo para administradoras y nunca envía el hash', async () => {
  assert.equal((await request('/api/admin/users')).status, 403);
  assert.equal((await request('/api/admin/users', 'GET', null, ana)).status, 403);
  const lista = await request('/api/admin/users', 'GET', null, admin);
  assert.equal(lista.status, 200);
  assert.deepEqual(lista.data.map(u => u.email).sort(), ['admin@example.com', 'ana@example.com', 'otra@example.com']);
  for (const usuario of lista.data) assert.deepEqual(Object.keys(usuario).sort(), ['created_at', 'email', 'id', 'nombre', 'rol', 'telefono']);
  assert.doesNotMatch(JSON.stringify(lista.data), /password|:[a-f0-9]{64,}/);
  assert.equal((await request('/api/admin/users', 'POST', {}, admin)).status, 404);
 });

 await t.test('Perfil propio: nombre y teléfono editables, email no', async () => {
  assert.equal((await request('/api/account', 'PUT', {nombre: 'Ana María', telefono: '098'})).status, 401);
  assert.equal((await request('/api/account', 'PUT', {nombre: 'Ana María', telefono: '098'}, ana, {})).status, 403, 'sin X-Flamitas no se acepta');
  assert.equal((await request('/api/account', 'PUT', {nombre: '<img src=x>', telefono: '098'}, ana)).status, 400);
  assert.equal((await request('/api/account', 'PUT', {nombre: '   ', telefono: '098'}, ana)).status, 400);
  const ok = await request('/api/account', 'PUT', {nombre: 'Ana María', telefono: '098 765', email: 'robada@example.com', rol: 'admin'}, ana);
  assert.equal(ok.status, 200);
  assert.deepEqual({nombre: ok.data.nombre, telefono: ok.data.telefono, email: ok.data.email, rol: ok.data.rol}, {nombre: 'Ana María', telefono: '098 765', email: 'ana@example.com', rol: 'cliente'});
  assert.equal(ok.data.password_hash, undefined);
  assert.equal((await db.query("SELECT nombre FROM users WHERE email='otra@example.com'")).rows[0].nombre, 'Otra');
  // Una administradora también edita sus propios datos.
  assert.equal((await request('/api/account', 'PUT', {nombre: 'Administradora Flamitas', telefono: '091'}, admin)).data.telefono, '091');
 });

 await t.test('Cambio de contraseña: valida la actual y la política', async () => {
  assert.equal((await request('/api/account/password', 'POST', {actual: 'vela-azul', nueva: 'vela-verde'})).status, 401);
  assert.equal((await request('/api/account/password', 'POST', {actual: 'vela-azul', nueva: 'vela-verde'}, ana, {})).status, 403);
  assert.equal((await request('/api/account/password', 'POST', {actual: 'incorrecta', nueva: 'vela-verde'}, ana)).status, 401);
  assert.equal((await request('/api/account/password', 'POST', {actual: 'vela-azul', nueva: 'corta'}, ana)).status, 400);
  assert.equal((await request('/api/account/password', 'POST', {actual: 'vela-azul', nueva: 'ana@example.com'}, ana)).status, 400);
  assert.equal((await request('/api/account/password', 'POST', {actual: config.ADMIN_PASSWORD, nueva: 'vela-azul-1'}, admin)).status, 400, 'administradoras: mínimo 12');
  assert.equal((await request('/api/login', 'POST', {email: 'ana@example.com', password: 'vela-azul'})).status, 200, 'los rechazos no cambian la contraseña');
 });

 await t.test('Cambiar la contraseña cierra solo las otras sesiones de esa usuaria', async () => {
  const antesAdmin = await sesiones(db, config.ADMIN_EMAIL), antesOtra = await sesiones(db, 'otra@example.com');
  assert.equal(antesAdmin.length, 2);
  assert.ok((await sesiones(db, 'ana@example.com')).length >= 2);
  assert.equal((await request('/api/account/password', 'POST', {actual: 'vela-azul', nueva: 'vela-verde'}, ana)).status, 200);
  assert.deepEqual(await sesiones(db, 'ana@example.com'), [hashDe(ana)]);
  assert.equal((await request('/api/bootstrap', 'GET', null, ana)).data.usuario.email, 'ana@example.com', 'la sesión actual sigue abierta');
  assert.equal((await request('/api/bootstrap', 'GET', null, anaOtroDispositivo)).data.usuario, null, 'la otra sesión se cerró');
  assert.deepEqual(await sesiones(db, config.ADMIN_EMAIL), antesAdmin, 'sesiones de administradoras intactas');
  assert.deepEqual(await sesiones(db, 'otra@example.com'), antesOtra, 'sesiones de otras clientas intactas');
  assert.equal((await request('/api/bootstrap', 'GET', null, otra)).data.usuario.email, 'otra@example.com');
  assert.equal((await request('/api/login', 'POST', {email: 'ana@example.com', password: 'vela-azul'})).status, 401);
  assert.equal((await request('/api/login', 'POST', {email: 'ana@example.com', password: 'vela-verde'})).status, 200);
 });

 await t.test('Administradora: borra avisos de sus otras sesiones y conserva los del dispositivo actual', async () => {
  const p256dh = (await db.query('SELECT keys FROM push_config')).rows[0].keys.publicKey;
  const suscripcion = endpoint => ({endpoint: 'https://fcm.googleapis.com/fcm/send/' + endpoint, keys: {p256dh, auth: 'a'.repeat(22)}});
  assert.equal((await request('/api/admin/push/subscription', 'POST', suscripcion('actual'), admin)).status, 200);
  assert.equal((await request('/api/admin/push/subscription', 'POST', suscripcion('otro'), adminOtroDispositivo)).status, 200);
  // Otra administradora con su propio dispositivo: no debe verse afectada.
  await db.query("INSERT INTO users(email,nombre,password_hash,rol) VALUES('segunda@example.com','Segunda',$1,'admin')", [await hashPassword('segunda-clave-larga')]);
  const segunda = (await request('/api/login', 'POST', {email: 'segunda@example.com', password: 'segunda-clave-larga'})).cookie;
  assert.equal((await request('/api/admin/push/subscription', 'POST', suscripcion('segunda'), segunda)).status, 200);
  const antesSegunda = await sesiones(db, 'segunda@example.com');

  assert.equal((await request('/api/account/password', 'POST', {actual: config.ADMIN_PASSWORD, nueva: 'una-clave-nueva-larga'}, admin)).status, 200);
  const avisos = (await db.query('SELECT endpoint,session_hash FROM push_subscriptions ORDER BY endpoint')).rows;
  assert.deepEqual(avisos.map(a => a.endpoint.split('/').at(-1)), ['actual', 'segunda']);
  assert.equal(avisos[0].session_hash, hashDe(admin));
  assert.deepEqual(await sesiones(db, config.ADMIN_EMAIL), [hashDe(admin)]);
  assert.equal((await request('/api/bootstrap', 'GET', null, admin)).data.usuario.rol, 'admin');
  assert.equal((await request('/api/bootstrap', 'GET', null, adminOtroDispositivo)).data.usuario, null);
  assert.deepEqual(await sesiones(db, 'segunda@example.com'), antesSegunda);
  assert.equal((await request('/api/bootstrap', 'GET', null, segunda)).data.usuario.email, 'segunda@example.com');
 });
});
