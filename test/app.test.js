import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { createApp, initialize } from '../server/app.js';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('PostgreSQL: sesiones, permisos, pedidos, concurrencia y persistencia', async t => {
 const pg = new PGlite();
 let tail = Promise.resolve();
 async function lock() { const previous = tail; let release; tail = new Promise(resolve => release = resolve); await previous; return release; }
 const query = (sql, args) => args ? pg.query(sql, args) : sql.includes('CREATE TABLE') ? pg.exec(sql) : pg.query(sql);
 const db = {query: async (sql,args) => { const release = await lock(); try { return await query(sql,args); } finally { release(); } }, connect: async () => {const release = await lock(); return {query,release};}};
 await initialize(db,{ADMIN_EMAIL:'admin@example.com',ADMIN_PASSWORD:'test-admin-password-123'});
 const app = createApp(db); const server = app.listen(0,'127.0.0.1');
 await new Promise(resolve => server.once('listening',resolve));
 const base = `http://127.0.0.1:${server.address().port}`;
 t.after(async () => { await new Promise(resolve=>server.close(resolve)); await pg.close(); });
 async function request(url, method='GET', body, cookie='') {
  const response = await fetch(base+url,{method,headers:{'Content-Type':'application/json','X-Flamitas':'1',Cookie:cookie},...(body ? {body:JSON.stringify(body)} : {})});
  return {status:response.status, data:await response.json().catch(()=>null), cookie:response.headers.get('set-cookie')?.split(';')[0], headers:response.headers};
 }
 let adminCookie, clientCookie, order;
 await t.test('No expone secretos ni datos privados', async () => {
  for (const url of ['/.env','/server/seed.json','/server/schema.sql','/package.json']) assert.equal((await request(url)).status,404);
  assert.equal((await request('/api/admin/backup')).status,403);
  assert.equal((await request('/api/bootstrap')).data.productos.length,10);
 });
 await t.test('Registro y login: contraseña hasheada, rol cliente, cookie HttpOnly', async () => {
  const admin = await request('/api/login','POST',{email:'admin@example.com',password:'test-admin-password-123'}); assert.equal(admin.status,200); adminCookie = admin.cookie;
  const client = await request('/api/register','POST',{nombre:'Ana',email:'ana@example.com',telefono:'099123456',password:'test-customer-password',rol:'admin'});
  assert.equal(client.status,201); assert.equal(client.data.rol,'cliente'); assert.match(client.headers.get('set-cookie'),/HttpOnly/); clientCookie = client.cookie;
  assert.equal(client.data.password_hash,undefined);
  assert.notEqual((await db.query("SELECT password_hash FROM users WHERE email='ana@example.com'")).rows[0].password_hash,'test-customer-password');
  assert.equal((await request('/api/admin/state','PUT',{},clientCookie)).status,403);
  assert.equal((await request('/api/register','POST',{nombre:'<img>',email:'bad@example.com',password:'test-customer-password'})).status,400);
 });
 await t.test('Importación inicial protegida y sin sobrescrituras repetidas', async () => {
  const state = (await request('/api/bootstrap','GET',null,adminCookie)).data;
  const body = {productos:state.productos,esencias:state.esencias,pedidos:[],vistos:[],consultas:[]};
  assert.equal((await request('/api/admin/import','POST',body,clientCookie)).status,403);
  assert.equal((await request('/api/admin/import','POST',{...body,productos:[...body.productos,body.productos[0]]},adminCookie)).status,400);
  assert.equal((await request('/api/admin/import','POST',body,adminCookie)).status,200);
  assert.equal((await request('/api/admin/import','POST',body,adminCookie)).status,409);
 });
 await t.test('El servidor calcula precios y no acepta pagos autoconfirmados', async () => {
  const result = await request('/api/orders','POST',{requestId:'order-1',productos:[{id:1,cantidad:2,precio:1}],entrega:{metodo:'Retiro'},pago:{medio:'Efectivo',estado:'Pagado'}},clientCookie);
  assert.equal(result.status,201); order=result.data; assert.equal(order.total,700); assert.equal(order.pago.estado,'Pendiente');
  assert.equal((await request('/api/bootstrap')).data.productos[0].stock,3);
 });
 await t.test('Reintentos no duplican pedidos ni descuentan dos veces', async () => {
  const result = await request('/api/orders','POST',{requestId:'order-1',productos:[{id:1,cantidad:2}],entrega:{metodo:'Retiro'}},clientCookie);
  assert.equal(result.data.id,order.id); assert.equal((await request('/api/bootstrap')).data.productos[0].stock,3);
 });
 await t.test('Compras concurrentes no sobrevenden y errores revierten todo', async () => {
  const result = await Promise.all(['a','b'].map(requestId => request('/api/orders','POST',{requestId,productos:[{id:1,cantidad:3}],entrega:{metodo:'Retiro'}},clientCookie)));
  assert.deepEqual(result.map(x=>x.status).sort(),[201,409]);
  assert.equal((await request('/api/bootstrap')).data.productos[0].stock,0);
  const failed = await request('/api/orders','POST',{requestId:'atomic',productos:[{id:2,cantidad:1},{id:1,cantidad:1}],entrega:{metodo:'Retiro'}},clientCookie);
  assert.equal(failed.status,409); assert.equal((await request('/api/bootstrap')).data.productos[1].stock,3);
 });
 await t.test('Un cliente solo ve sus pedidos; el administrador detecta cambios concurrentes', async () => {
  const other = await request('/api/register','POST',{nombre:'Otra',email:'other@example.com',telefono:'',password:'other-password-123'});
  assert.equal((await request('/api/bootstrap','GET',null,other.cookie)).data.pedidos.length,0);
  const state = (await request('/api/bootstrap','GET',null,adminCookie)).data;
  const {productos,esencias,pedidos,vistos} = state;
  const body = {version:state.version,data:{productos,esencias,pedidos,vistos}};
  assert.equal((await request('/api/admin/state','PUT',body,adminCookie)).status,200);
  assert.equal((await request('/api/admin/state','PUT',body,adminCookie)).status,409);
 });
 await t.test('Consultas persistentes y cierre de sesión revocado', async () => {
  assert.equal((await request('/api/contact','POST',{nombre:'Ana',telefono:'',email:'ana@example.com',mensaje:'Hola\nConsulta'})).status,201);
  assert.equal((await request('/api/admin/backup','GET',null,adminCookie)).data.consultas.length,1);
  await request('/api/logout','POST',{},clientCookie);
  assert.equal((await request('/api/bootstrap','GET',null,clientCookie)).data.usuario,null);
 });
 await t.test('Reiniciar la aplicación conserva pedidos y stock', async () => {
  await initialize(db,{ADMIN_EMAIL:'admin@example.com',ADMIN_PASSWORD:'another-password-123'});
  const data = (await request('/api/bootstrap','GET',null,adminCookie)).data;
  assert.equal(data.pedidos.length,2); assert.equal(data.productos[0].stock,0);
 });
});

test('El panel conserva lecturas sincrónicas al usar la API', async () => {
 const context = vm.createContext({structuredClone, window:{addEventListener(){}}, datosServidor:{pedidos:[{id:1}],vistos:[1]}});
 vm.runInContext(await readFile('js/admin.js','utf8'),context);
 assert.equal(context.obtenerPedidos()[0].id,1);
 assert.equal(context.obtenerPedidosVistos()[0],1);
});
