import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createApp,initialize} from '../server/app.js';
test('Recuperación: caída, rollback fallido y respuesta perdida después de COMMIT',async t=>{
 const pg=new PGlite();let mode='',releasedBroken=false;
 const fault=()=>Object.assign(new Error('Detalle privado que no debe publicarse'),{code:'ECONNRESET'});
 const query=(s,a)=>!a&&s.includes('CREATE TABLE')?pg.exec(s):pg.query(s,a);
 const db={query:async(s,a)=>{if(mode==='offline')throw Object.assign(fault(),{code:'57P03'});return query(s,a);},connect:async()=>({
 query:async(s,a)=>{
  if(s==='ROLLBACK'&&mode==='rollback-fails'){await query(s);mode='';throw Error('Rollback failed');}
  const result=await query(s,a);
  if(s.startsWith('UPDATE business_state')&&mode==='write-fails'){mode='rollback-fails';throw fault();}
  if(s==='COMMIT'&&mode==='commit-response-lost'){mode='';throw fault();}
  return result;
 },release:error=>{if(error)releasedBroken=true;}})};
 await initialize(db,{ADMIN_EMAIL:'admin@example.com',ADMIN_PASSWORD:'test-admin-password-123'});
 const app=createApp(db);app.locals.deliverPush=async()=>{};
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await pg.close();});
 const base='http://127.0.0.1:'+server.address().port;
 async function req(url,body,cookie=''){const r=await fetch(base+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Flamitas':'1',Cookie:cookie},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const user=(await req('/api/register',{nombre:'Prueba',email:'recovery@example.com',password:'test-customer-password'})).cookie;
 const initial=(await req('/api/bootstrap')).data;
 mode='offline';assert.equal((await req('/health')).status,503);const unavailable=await req('/api/bootstrap');assert.equal(unavailable.status,503);assert.ok(!JSON.stringify(unavailable.data).includes('Detalle privado'));
 mode='';assert.equal((await req('/health')).status,200);assert.equal((await req('/api/bootstrap')).status,200);
 const order={requestId:'outage-order',productos:[{id:1,cantidad:1}],entrega:{metodo:'Retiro'},pago:{medio:'Transferencia bancaria'}};
 mode='write-fails';assert.equal((await req('/api/orders',order,user)).status,503);assert.equal(releasedBroken,true);
 assert.equal((await req('/api/bootstrap')).data.productos[0].stock,initial.productos[0].stock);
 assert.equal((await req('/api/bootstrap',null,user)).data.pedidos.length,0);
 mode='commit-response-lost';assert.equal((await req('/api/orders',order,user)).status,503);
 const retry=await req('/api/orders',order,user);assert.equal(retry.status,201);
 const final=(await req('/api/bootstrap',null,user)).data;assert.equal(final.pedidos.length,1);assert.equal(final.productos[0].stock,initial.productos[0].stock-1);
 assert.equal((await req('/health')).status,200);
});
