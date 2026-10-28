import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createApp,initialize} from '../server/app.js';
test('Límites de tamaño del cuerpo según tipo de usuario y mensajes claros',async t=>{
 const pg=new PGlite();let tail=Promise.resolve();async function lock(){const prev=tail;let release;tail=new Promise(r=>release=r);await prev;return release;}
 const query=(s,a)=>a?pg.query(s,a):s.includes('CREATE TABLE')?pg.exec(s):pg.query(s);
 const db={query:async(s,a)=>{const release=await lock();try{return await query(s,a)}finally{release()}},connect:async()=>{const release=await lock();return {query,release}}};
 await initialize(db,{ADMIN_EMAIL:'admin@example.com',ADMIN_PASSWORD:'test-admin-password-123'});
 const server=createApp(db).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(async()=>{await new Promise(r=>server.close(r));await pg.close()});
 const base='http://127.0.0.1:'+server.address().port;
 async function req(url,method='GET',rawBody,cookie=''){const r=await fetch(base+url,{method,headers:{'X-Flamitas':'1','Content-Type':'application/json',Cookie:cookie},body:rawBody});return {status:r.status,data:await r.json().catch(()=>null),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const json=(url,method,body,cookie)=>req(url,method,body!==undefined?JSON.stringify(body):undefined,cookie);
 const admin=(await json('/api/login','POST',{email:'admin@example.com',password:'test-admin-password-123'})).cookie;
 const cliente=(await json('/api/register','POST',{nombre:'Ana',email:'ana@example.com',password:'test-client-password',telefono:'099123456'})).cookie;

 await t.test('Público: un envío que supera 100 KB se rechaza con mensaje claro',async()=>{
  const result=await json('/api/contact','POST',{nombre:'Ana',email:'ana@example.com',telefono:'',mensaje:'A'.repeat(150000)});
  assert.equal(result.status,413);
  assert.equal(result.data.error,'El envío es demasiado grande. Reducí el tamaño de los datos o del archivo adjunto e intentá de nuevo.');
 });

 await t.test('JSON mal formado se rechaza con mensaje claro, no un error genérico',async()=>{
  const result=await req('/api/login','POST','{"email":"a@example.com","password":');
  assert.equal(result.status,400);
  assert.equal(result.data.error,'No se pudieron leer los datos enviados: el formato no es válido.');
 });

 await t.test('Cliente autenticado: fuera de comprobantes, el límite sigue siendo 100 KB',async()=>{
  const result=await json('/api/orders','POST',{requestId:'a'.repeat(1),productos:[{id:1,cantidad:1,relleno:'A'.repeat(150000)}],entrega:{metodo:'Retiro'}},cliente);
  assert.equal(result.status,413);
 });

 await t.test('Comprobante de cliente autenticado: un archivo de varios MB no se rechaza por tamaño',async()=>{
  const created=await json('/api/orders','POST',{requestId:'receipt-limit-test',productos:[{id:1,cantidad:1}],entrega:{metodo:'Retiro'},pago:{medio:'Transferencia bancaria'}},cliente);
  assert.equal(created.status,201);
  const content=Buffer.concat([Buffer.from('%PDF-'),Buffer.alloc(3*1024*1024,65)]).toString('base64');
  const result=await json('/api/orders/'+created.data.id+'/receipt','POST',{name:'comprobante.pdf',mime:'application/pdf',content},cliente);
  assert.notEqual(result.status,413);
  assert.equal(result.status,201);
 });

 await t.test('Administración autenticada: un cuerpo de varios MB no se rechaza por tamaño',async()=>{
  const state=(await json('/api/bootstrap','GET',undefined,admin)).data;
  const body={version:state.version,data:{relleno:'A'.repeat(9*1024*1024)}};
  const result=await json('/api/admin/state','PUT',body,admin);
  assert.notEqual(result.status,413);
  assert.equal(result.status,400);
 });

 await t.test('El límite de 25 MB es exclusivo de administración: un cliente con el mismo tamaño sigue limitado',async()=>{
  const state=(await json('/api/bootstrap','GET',undefined,cliente)).data;
  const body={version:state.version,data:{relleno:'A'.repeat(9*1024*1024)}};
  const result=await json('/api/admin/state','PUT',body,cliente);
  assert.equal(result.status,413);
 });
});
