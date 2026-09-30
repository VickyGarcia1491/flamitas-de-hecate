import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {applyProductChanges} from '../server/business.js';
test('Cambiar stock no transmite las fotos del catálogo y conserva los demás campos',async()=>{
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only'});try{
  const win=dom.window;win.structuredClone=structuredClone;let sent;
  win.fetch=async(url,options)=>{sent={url,body:JSON.parse(options.body),bytes:options.body.length};return {ok:true,json:async()=>({version:2})}};
  vm.runInContext(await readFile('js/api.js','utf8'),dom.getInternalVMContext());
  const products=Array.from({length:6},(_,i)=>({id:i+1,nombre:'Vela '+i,descripcion:'Detalle',precio:320,stock:0,imagen:'data:image/png;base64,'+'A'.repeat(2100000)}));
  win.initial=products;
  vm.runInContext('datosServidor={productos:structuredClone(initial),version:1}',dom.getInternalVMContext());
  const edited=structuredClone(products);edited[0].stock=4;win.edited=edited;
  await vm.runInContext('guardarEstadoServidor({productos:edited})',dom.getInternalVMContext());
  assert.equal(sent.url,'/api/admin/state/changes');assert.ok(sent.bytes<200);
  assert.deepEqual(sent.body.productChanges,{upsert:[{id:1,stock:4}],remove:[]});
  const stored=applyProductChanges(products,sent.body.productChanges);assert.equal(stored[0].stock,4);assert.equal(stored[0].imagen,products[0].imagen);assert.deepEqual(stored.slice(1),products.slice(1));
 }finally{dom.window.close()}
});
test('Cambios parciales: crear, editar imagen, eliminar y rechazar campos inesperados',()=>{
 const products=[{id:1,nombre:'Vela',stock:2,imagen:'vela1.jpeg'}];
 const next=applyProductChanges(products,{upsert:[{id:1,imagen:'vela2.jpeg'},{id:2,nombre:'Nueva',stock:0}],remove:[]});
 assert.equal(next[0].imagen,'vela2.jpeg');assert.equal(next[0].stock,2);assert.equal(products[0].imagen,'vela1.jpeg');
 assert.deepEqual(applyProductChanges(next,{upsert:[],remove:[1]}),[next[1]]);
 assert.throws(()=>applyProductChanges(products,{upsert:[{id:1,rol:'admin'}],remove:[]}));
});
test('Error de texto HTTP 400 informa el código sin volver a enviar',async()=>{
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only'});try{
  let calls=0;dom.window.fetch=async()=>{calls++;return {status:400,ok:false,json:async()=>{throw Error('text/plain')}}};
  vm.runInContext(await readFile('js/api.js','utf8'),dom.getInternalVMContext());
  await assert.rejects(vm.runInContext("api('/api/admin/state/changes','PUT',{})",dom.getInternalVMContext()),/HTTP 400/);assert.equal(calls,1);
 }finally{dom.window.close()}
});
test('Inicio de app y acceso a registro sin esperar la conexión',async()=>{
 const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));assert.equal(manifest.start_url,'/index.html');assert.equal(manifest.id,'/tienda.html');
 for(const page of ['index','tienda','contacto','login']){
  const dom=new JSDOM(await readFile(page+'.html','utf8'));try{
   const link=dom.window.document.querySelector('.menu-links a[href="login.html"]');assert.ok(link);assert.equal(link.hidden,false);assert.equal(link.textContent,'Iniciar sesión');
   if(page==='login')assert.ok(dom.window.document.querySelector('.formulario-acceso a[href="registro.html"]'));
  }finally{dom.window.close()}
 }
});
