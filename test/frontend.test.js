import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const seed = JSON.parse(await readFile('server/seed.json','utf8'));
async function page(name,user) {
 const html = await readFile(name+'.html','utf8');
 const dom = new JSDOM(html,{url:'http://localhost/'+name+'.html',runScripts:'outside-only'});
 const win = dom.window, errors = [], writes = [];
 win.structuredClone = structuredClone;
 win.alert = message => errors.push(message); win.confirm = () => true;
 let state = {usuario:user,productos:structuredClone(seed),esencias:{general:{}},esenciasCatalogo:[],pedidos:[],vistos:[],version:1};
 win.fetch = async (url,options) => {
  if (url === '/api/admin/state') {const body=JSON.parse(options.body); writes.push(body); state = {...state,...body.data,version:state.version+1}; return {ok:true,json:async()=>({version:state.version})};}
  return {ok:true,json:async()=>structuredClone(state)};
 };
 win.addEventListener('error',event=>errors.push(event.error?.message));
 // Ejecutar el mismo orden de scripts sin red ni navegador real.
 for (const match of html.matchAll(/<script src="(?:\.\/)?([^"]+)"/g)) {
  const content = await readFile(match[1],'utf8');
  if (match[1] !== 'js/iniciar.js') vm.runInContext(content,dom.getInternalVMContext());
 }
 await vm.runInContext('cargarDatosServidor()',dom.getInternalVMContext());
 if (win.iniciarUsuarios) win.iniciarUsuarios();
 if (win.iniciarAdmin) await win.iniciarAdmin();
 if (win.inicioTienda) win.inicioTienda();
 if (win.iniciarMiCuenta) win.iniciarMiCuenta();
 return {win,errors,writes,run:code=>vm.runInContext(code,dom.getInternalVMContext()),close:()=>win.close()};
}
test('Pantallas: administrador carga, edita stock y guarda una venta atómica',async()=>{
 const ui = await page('admin',{nombre:'Admin',email:'admin@example.com',telefono:'',rol:'admin'});
 try {
  assert.equal(ui.errors.length,0);
  assert.ok(ui.win.document.querySelector('#contenedorPedidos').textContent.includes('Todavía'));
  ui.win.document.querySelector('#stockEditar1').value = '8';
  await ui.win.guardarEdicionProductoAdmin(1,null);
  assert.equal(ui.writes.at(-1).data.productos[0].stock,8);
  ui.run('productosVentaManual = [{id:1,nombre:"Vela Clásica",precio:350,cantidad:1}]');
  const previous = ui.writes.length;
  await ui.win.guardarVentaManual({preventDefault(){}});
  assert.equal(ui.writes.length,previous+1);
  assert.equal(ui.writes.at(-1).data.pedidos.length,1);
  assert.equal(ui.writes.at(-1).data.productos[0].stock,7);
 } finally {ui.close();}
});
test('Pantallas: tienda y cuenta cargan desde el servidor',async()=>{
 for (const name of ['tienda','mi-cuenta','login','registro']) {
  const ui = await page(name,{nombre:'Ana',email:'ana@example.com',telefono:'099123',rol:'cliente'});
  try {
   assert.equal(ui.errors.length,0);
   if(name === 'tienda') { ui.win.agregarAlCarrito(1); assert.equal(ui.win.obtenerTotalCarrito(),350); }
  } finally {ui.close();}
 }
});
