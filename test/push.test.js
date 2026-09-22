import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createApp,initialize} from '../server/app.js';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('Avisos: permisos, persistencia, envío único y fallos independientes del pedido',async t=>{
 const pg=new PGlite();
 const db={query:(sql,args)=>!args && sql.includes('CREATE TABLE') ? pg.exec(sql) : pg.query(sql,args),connect:async()=>({query:(...args)=>pg.query(...args),release(){}})};
 const config={ADMIN_EMAIL:'admin@example.com',ADMIN_PASSWORD:'test-admin-password-123'};
 await initialize(db,config);
 const keys=(await db.query('SELECT keys FROM push_config')).rows[0].keys;
 await initialize(db,config);
 assert.deepEqual((await db.query('SELECT keys FROM push_config')).rows[0].keys,keys);
 const sent=[]; let failure;
 const app=createApp(db,{}, {sendPush:async(sub,payload)=>{if(failure)throw failure;sent.push(JSON.parse(payload));}});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await pg.close();});
 async function request(path,method='GET',body,cookie=''){
  const res=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method,headers:{'Content-Type':'application/json','X-Flamitas':'1',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})});
  return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
 }
 const admin=(await request('/api/login','POST',{email:config.ADMIN_EMAIL,password:config.ADMIN_PASSWORD})).cookie;
 const customer=(await request('/api/register','POST',{nombre:'Ana',email:'ana@example.com',password:'test-customer-123'})).cookie;
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test-device',keys:{p256dh:keys.publicKey,auth:'a'.repeat(22)}};
 await t.test('Solo administradoras pueden suscribirse; claves privadas nunca salen de la API',async()=>{
  assert.equal((await request('/api/admin/push/key')).status,403);
  assert.equal((await request('/api/admin/push/subscription','POST',subscription,customer)).status,403);
  assert.deepEqual((await request('/api/admin/push/key','GET',null,admin)).data,{publicKey:keys.publicKey});
  assert.equal((await request('/api/admin/push/subscription','POST',{...subscription,endpoint:'https://127.0.0.1/private'},admin)).status,400);
  assert.equal((await request('/api/admin/push/subscription','POST',subscription,admin)).status,200);
 });
 const orderBody={requestId:'push-one',productos:[{id:1,cantidad:1}],entrega:{metodo:'Retiro'}};
 await t.test('Pedido confirmado avisa una sola vez, sin datos del cliente',async()=>{
  const order=await request('/api/orders','POST',orderBody,customer);assert.equal(order.status,201);
  assert.deepEqual(sent,[{title:'Nuevo pedido en Flamitas',body:'Tenés un pedido nuevo. Tocá para verlo.',orderId:order.data.id}]);
  assert.equal((await request('/api/orders','POST',orderBody,customer)).data.id,order.data.id);
  assert.equal(sent.length,1);
  assert.equal((await db.query('SELECT * FROM push_jobs')).rows.length,0);
 });
 await t.test('Fallo temporal conserva compra y reintenta desde la cola',async()=>{
  failure=Object.assign(new Error('temporal'),{statusCode:503});
  assert.equal((await request('/api/orders','POST',{...orderBody,requestId:'push-two'},customer)).status,201);
  assert.equal((await db.query('SELECT * FROM push_jobs')).rows.length,1);
  failure=null;await db.query('UPDATE push_jobs SET next_attempt=now()');await app.locals.deliverPush();
  assert.equal(sent.length,2);assert.equal((await db.query('SELECT * FROM push_jobs')).rows.length,0);
 });
 await t.test('Dispositivo revocado se elimina y cerrar sesión desactiva avisos',async()=>{
  failure=Object.assign(new Error('gone'),{statusCode:410});
  assert.equal((await request('/api/orders','POST',{...orderBody,requestId:'push-three'},customer)).status,201);
  assert.equal((await db.query('SELECT * FROM push_subscriptions')).rows.length,0);
  assert.equal((await db.query('SELECT * FROM push_jobs')).rows.length,0);
  await request('/api/admin/push/subscription','POST',subscription,admin);
  await request('/api/logout','POST',{},admin);
  assert.equal((await db.query('SELECT * FROM push_subscriptions')).rows.length,0);
 });
});

test('Notificación del teléfono abre solo el pedido interno y avisa al panel',async()=>{
 const handlers={},shown=[],messages=[],opened=[];let pending;
 const context=vm.createContext({self:{addEventListener:(name,fn)=>handlers[name]=fn,registration:{showNotification:async(...args)=>shown.push(args),getNotifications:async()=>shown},navigator:{},clients:{matchAll:async()=>[{postMessage:message=>messages.push(message)}],openWindow:async url=>opened.push(url)}}});
 vm.runInContext(await readFile('sw.js','utf8'),context);
 handlers.push({data:{json:()=>({orderId:123,body:'Datos privados ignorados'})},waitUntil:p=>pending=p});await pending;
 assert.equal(shown[0][1].body,'Tenés un pedido nuevo. Tocá para verlo.');assert.equal(messages[0].orderId,123);
 handlers.notificationclick({notification:{close(){},data:shown[0][1].data},waitUntil:p=>pending=p});await pending;
 assert.deepEqual(opened,['/admin.html?pedido=123']);
 handlers.notificationclick({notification:{close(){},data:{url:'https://otro.example/'}},waitUntil:p=>pending=p});
 assert.equal(opened.length,1);
});
