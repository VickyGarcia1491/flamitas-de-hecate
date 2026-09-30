import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createApp,initialize} from '../server/app.js';
test('Comprobantes: privacidad, formatos, reemplazo y confirmación exclusiva del administrador',async t=>{
 const pg=new PGlite();let tail=Promise.resolve();async function lock(){const prev=tail;let release;tail=new Promise(r=>release=r);await prev;return release;}
 const query=(s,a)=>a?pg.query(s,a):s.includes('CREATE TABLE')?pg.exec(s):pg.query(s);
 const db={query:async(s,a)=>{const release=await lock();try{return await query(s,a)}finally{release()}},connect:async()=>{const release=await lock();return {query,release}}};
 await initialize(db,{ADMIN_EMAIL:'admin@example.com',ADMIN_PASSWORD:'test-admin-password-123'});
 const server=createApp(db).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(async()=>{await new Promise(r=>server.close(r));await pg.close()});
 const base='http://127.0.0.1:'+server.address().port;
 async function req(url,method='GET',body,cookie=''){const r=await fetch(base+url,{method,headers:{'X-Flamitas':'1','Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});return {status:r.status,headers:r.headers,data:await r.text(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const admin=(await req('/api/login','POST',{email:'admin@example.com',password:'test-admin-password-123'})).cookie;
 const own=(await req('/api/register','POST',{nombre:'Ana',email:'ana@example.com',password:'test-client-password',telefono:'099123456'})).cookie;
 const other=(await req('/api/register','POST',{nombre:'Otra',email:'otra@example.com',password:'test-other-password',telefono:'099123456'})).cookie;
 const created=await req('/api/orders','POST',{requestId:'receipt-test',productos:[{id:1,cantidad:1}],entrega:{metodo:'Retiro'},pago:{medio:'Transferencia bancaria'}},own);assert.equal(created.status,201);const order=JSON.parse(created.data);const url='/api/orders/'+order.id+'/receipt';
 const file={name:'pago.pdf',mime:'application/pdf',content:Buffer.from('%PDF-1.4\nexample\n%%EOF').toString('base64')};
 assert.equal((await req(url,'POST',file)).status,401);assert.equal((await req(url,'POST',file,other)).status,404);
 assert.equal((await req(url,'POST',{...file,content:Buffer.from('<html>').toString('base64')},own)).status,400);
 assert.equal((await req(url,'POST',{...file,mime:'image/png'},own)).status,400);
 assert.equal((await req(url,'POST',{...file,content:'A'.repeat(6990512)},own)).status,400);
 assert.equal((await req(url,'POST',file,own)).status,201);
 assert.equal((await req('/api/receipts')).status,401);assert.deepEqual(JSON.parse((await req('/api/receipts','GET',null,other)).data),[]);
 assert.equal((await req(url,'GET',null,other)).status,404);const download=await req(url,'GET',null,admin);assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/attachment/);assert.match(download.headers.get('cache-control'),/no-store/);
 let state=JSON.parse((await req('/api/bootstrap','GET',null,own)).data);assert.equal(state.pedidos[0].pago.estado,'Pendiente');assert.ok(!JSON.stringify(state).includes(file.content));
 let receipt=JSON.parse((await req('/api/receipts','GET',null,admin)).data)[0];assert.ok(!receipt.content);const oldDate=new Date(receipt.uploaded_at).toISOString();
 assert.equal((await req(url+'/confirm','POST',{uploadedAt:oldDate},own)).status,403);
 await new Promise(r=>setTimeout(r,10));assert.equal((await req(url,'POST',{...file,name:'nuevo.pdf'},own)).status,201);
 assert.equal((await req(url+'/confirm','POST',{uploadedAt:oldDate},admin)).status,409);
 receipt=JSON.parse((await req('/api/receipts','GET',null,admin)).data)[0];assert.equal((await req(url+'/confirm','POST',{uploadedAt:new Date(receipt.uploaded_at).toISOString()},admin)).status,200);
 state=JSON.parse((await req('/api/bootstrap','GET',null,own)).data);assert.equal(state.pedidos[0].pago.estado,'Pagado');assert.equal(state.productos[0].stock,4);
 assert.equal((await req(url,'POST',file,own)).status,409);
});
