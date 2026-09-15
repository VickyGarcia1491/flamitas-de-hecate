import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { checkout, emptyState } from '../server/business.js';
import { validateState } from '../server/business.js';
const seed = JSON.parse(await readFile('server/seed.json','utf8'));
test('Admin: una venta espera al guardado de la bandeja y usa la nueva versión', async () => {
 const ui=await page('admin',{nombre:'Admin',email:'admin@example.com',telefono:'',rol:'admin'});
 try {
  const fetchOriginal=ui.win.fetch;
  let liberar;
  const espera=new Promise(resolve=>liberar=resolve);
  let llamadas=0;
  ui.win.fetch=async(url,options)=>{ llamadas++; if(llamadas===1) await espera; return fetchOriginal(url,options); };
  const bandeja=ui.win.guardarPedidosVistos([55]);
  await Promise.resolve();
  ui.win.agregarProductoVentaManual();
  const venta=ui.win.guardarVentaManual({preventDefault(){}});
  await Promise.resolve();
  assert.equal(llamadas,1);
  liberar(); await bandeja; await venta;
  assert.equal(ui.writes.length,2);
  assert.equal(ui.writes[1].version,2);
  assert.deepEqual(ui.writes[1].data.vistos,[55]);
  assert.equal(ui.writes[1].data.pedidos.length,1);
  assert.match(ui.win.document.querySelector('#mensajeVentaManual').textContent,/Venta manual guardada/);
 } finally {ui.close();}
});
test('Admin: producto sin foto ni descripción y venta sin campos de selección obligatorios', async () => {
 const ui = await page('admin',{nombre:'Admin',email:'admin@example.com',telefono:'',rol:'admin'});
 try {
  const doc = ui.win.document;
  assert.equal(doc.querySelector('#fotoProductoAdmin').required,false);
  assert.equal(doc.querySelector('#detalleProductoAdmin').required,false);
  doc.querySelector('#nombreProductoAdmin').value='Nueva vela';
  doc.querySelector('#precioProductoAdmin').value='120';
  doc.querySelector('#stockProductoAdminNuevo').value='2';
  await ui.win.agregarProductoAdmin({preventDefault(){}});
  const data=ui.writes.at(-1).data;
  assert.equal(data.productos.at(-1).imagen,'');
  assert.equal(data.productos.at(-1).descripcion,'');
  validateState(data);
  const search=doc.querySelector('#buscarProductoVentaManual');
  search.value='clasica'; search.dispatchEvent(new ui.win.Event('input'));
  assert.equal(doc.querySelector('#productoVentaManual').options.length,1);
  assert.equal(doc.querySelector('#productoVentaManual').value,'1');
  ui.win.agregarProductoVentaManual();
  search.value='inexistente'; search.dispatchEvent(new ui.win.Event('input'));
  assert.equal(doc.querySelector('#formVentaManual').checkValidity(),true);
  await ui.win.guardarVentaManual({preventDefault(){}});
  assert.equal(ui.writes.at(-1).data.pedidos[0].cliente.nombre,'Consumidor final');
  assert.equal(doc.querySelector('#camposEnvioManual').hidden,true);
  doc.querySelector('#entregaVentaManual').value='Envío';
  doc.querySelector('#entregaVentaManual').dispatchEvent(new ui.win.Event('change'));
  assert.equal(doc.querySelector('#camposEnvioManual').hidden,false);
 } finally {ui.close();}
});
test('Admin: un fallo de red muestra error y conserva los productos de la venta', async () => {
 const ui=await page('admin',{nombre:'Admin',email:'admin@example.com',telefono:'',rol:'admin'});
 try {
  ui.win.agregarProductoVentaManual();
  ui.win.fetch=async()=>{throw new Error('Sin conexión');};
  await ui.win.guardarVentaManual({preventDefault(){}});
  assert.match(ui.win.document.querySelector('#mensajeVentaManual').textContent,/No se pudo confirmar/);
  assert.equal(ui.run('productosVentaManual.length'),1);
  assert.equal(ui.run('velas[0].stock'),seed[0].stock);
  assert.equal(ui.win.document.querySelector('#clienteVentaManual').disabled,false);
  assert.ok(ui.win.document.querySelector('#avisoGuardadoServidor button'));
  await ui.win.guardarVentaManual({preventDefault(){}});
  assert.match(ui.win.document.querySelector('#mensajeVentaManual').textContent,/Recargar panel/);
 } finally {ui.close();}
});
test('Mercado Pago: resumen, servidor y WhatsApp coinciden; cambiar medio elimina ajuste', async () => {
 const user = {nombre:'Ana',email:'ana@example.com',telefono:'',rol:'cliente'};
 const ui = await page('tienda',user);
 try {
  ui.run('carrito = [{id:2,nombre:"Osito Corazón",precio:430,cantidad:1},{id:"latita-mediana-2",tipoLatita:"mediana",indiceEsencia:2,nombre:"Latita Mediana",precio:280,cantidad:2}]');
  const select = ui.win.document.querySelector('#medioPagoEntrega');
  for (const medio of ['Mercado Pago','Efectivo','Transferencia bancaria','', 'Mercado Pago']) {
   select.value = medio; select.dispatchEvent(new ui.win.Event('change'));
   const total = medio === 'Mercado Pago' ? 1089 : 990;
   assert.equal(ui.win.document.querySelector('#totalPedidoCheckout').textContent, 'Total: $'+total);
   assert.equal(ui.win.document.querySelector('#resumenPedidoCheckout').textContent.includes('Ajuste Mercado Pago 10%'),medio === 'Mercado Pago');
   const pedido = checkout(emptyState(structuredClone(seed)),{productos:[{id:2,cantidad:1},{tipoLatita:'mediana',indiceEsencia:2,cantidad:2}],entrega:{metodo:'Retiro'},pago:{medio,ajuste:0,total:1}},user,1);
   assert.equal(pedido.total,total); assert.equal(pedido.pago.subtotal,990);
   assert.equal(pedido.pago.ajuste,total-990); assert.equal(pedido.pago.total,total);
   const mensaje = decodeURIComponent(ui.win.armarMensajePedidoGuardado(pedido));
   assert.ok(mensaje.includes('Total: $'+total));
   assert.equal(mensaje.includes('Ajuste Mercado Pago 10%: $99'),medio === 'Mercado Pago');
  }
 } finally {ui.close();}
});
async function page(name,user) {
 const html = await readFile(name+'.html','utf8');
 const dom = new JSDOM(html,{url:'http://localhost/'+name+'.html',runScripts:'outside-only'});
 const win = dom.window, errors = [], writes = [];
 win.structuredClone = structuredClone;
 win.alert = message => errors.push(message); win.confirm = () => true;
 let state = {usuario:user,productos:structuredClone(seed),esencias:{mediana:{},chica:{}},pedidos:[],vistos:[],version:1};
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
