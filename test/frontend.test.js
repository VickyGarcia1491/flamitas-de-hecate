import { applyProductChanges } from '../server/business.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { checkout, emptyState } from '../server/business.js';
import { validateState } from '../server/business.js';
const seed = JSON.parse(await readFile('server/seed.json','utf8'));
const pedidoNotificacion = {id:90,estado:'Nuevo',fechaISO:'2026-09-21',cliente:{nombre:'Prueba',email:'prueba@example.com'},productos:[],entrega:{metodo:'Retiro'},total:0};
test('Pedidos: cambios rápidos de dos pedidos se guardan en secuencia sin pisarse', async () => {
 const ui=await page('admin',{nombre:'Admin',rol:'admin'},{pedidos:[pedidoNotificacion,{...pedidoNotificacion,id:91}]});
 try {
  const original=ui.win.fetch; let liberar;
  const espera=new Promise(resolve=>liberar=resolve); let calls=0;
  ui.win.fetch=async(...args)=>{if(++calls===1)await espera;return original(...args);};
  const primero=ui.win.cambiarEstadoPedido(90,'Entregado');
  const segundo=ui.win.cambiarEstadoPedido(91,'Cancelado');
  await Promise.resolve(); liberar(); await Promise.all([primero,segundo]);
  assert.deepEqual(ui.win.obtenerPedidos().map(p=>p.estado),['Entregado','Cancelado']);
  assert.equal(ui.win.document.querySelector('#avisoGuardadoServidor'),null);
  assert.equal(ui.win.document.querySelectorAll('.pedido-admin').length,0);
  const filtro=ui.win.document.querySelector('#filtroEstadoPedidos');
  filtro.value='Entregado'; filtro.dispatchEvent(new ui.win.Event('change'));
  assert.match(ui.win.document.querySelector('#contenedorPedidos').textContent,/Pedido #90/);
  assert.equal(ui.win.document.querySelectorAll('.pedido-admin').length,1);
  filtro.value='Cancelado'; filtro.dispatchEvent(new ui.win.Event('change'));
  assert.match(ui.win.document.querySelector('#contenedorPedidos').textContent,/Pedido #91/);
 } finally {ui.close();}
});
test('Pedidos: pagina diez tarjetas y conserva todo el historial', async () => {
 const ui=await page('admin',{nombre:'Admin',rol:'admin'},{pedidos:Array.from({length:23},(_,i)=>({...pedidoNotificacion,id:100+i}))});
 try {
  assert.equal(ui.win.document.querySelectorAll('.pedido-admin').length,10);
  ui.win.document.querySelector('#pedidosSiguiente').click();
  assert.equal(ui.win.document.querySelectorAll('.pedido-admin').length,10);
  ui.win.document.querySelector('#pedidosSiguiente').click();
  assert.equal(ui.win.document.querySelectorAll('.pedido-admin').length,3);
  assert.equal(ui.win.obtenerPedidos().length,23);
  assert.equal(ui.writes.length,0);
 } finally {ui.close();}
});
test('Estado: refresca tras conflicto externo sin sobrescribir otro estado del mismo pedido', async () => {
 for(const changed of [false,true]) {
  const ui=await page('admin',{nombre:'Admin',rol:'admin'},{pedidos:[pedidoNotificacion]});
  try {
   let puts=0;
   const original=ui.win.fetch;
   ui.win.fetch=async(url,options)=>{
    if(options.method==='PUT' && ++puts===1)return {ok:false,status:409,json:async()=>({error:'Versión anterior'})};
    if(options.method==='GET')return {ok:true,json:async()=>({usuario:{rol:'admin'},version:8,productos:seed,esencias:{mediana:{},chica:{}},vistos:[],pedidos:[{...pedidoNotificacion,estado:changed?'Cancelado':'Nuevo'}]})};
    return original(url,options);
   };
   await ui.win.cambiarEstadoPedido(90,'Entregado');
   assert.equal(puts,changed?1:2);
   assert.equal(ui.win.obtenerPedidos()[0].estado,changed?'Cancelado':'Entregado');
  } finally {ui.close();}
 }
});
test('Bandeja: abre aun si falla marcar leído y mantiene las notificaciones', async () => {
 const ui=await page('admin',{nombre:'Admin',rol:'admin'},{pedidos:[pedidoNotificacion]});
 try {
  ui.win.fetch=async()=>{throw new Error('Fallo de conexión de prueba');};
  await ui.win.mostrarPedidosPendientesDesdeBandeja();
  assert.match(ui.win.document.querySelector('#contenedorPedidos').textContent,/Pedido #90/);
  assert.equal(ui.win.obtenerPedidosPendientesNoVistos().length,1);
  assert.match(ui.win.document.querySelector('#avisoGuardadoServidor').textContent,/Fallo de conexión de prueba/);
  await ui.win.cambiarEstadoPedido(90,'Entregado');
  assert.equal(ui.win.obtenerPedidos()[0].estado,'Nuevo');
  assert.equal(ui.win.document.querySelector('#contenedorPedidos select').value,'Nuevo');
  assert.match(ui.win.document.querySelector('#avisoGuardadoServidor').textContent,/Fallo de conexión de prueba/);
 } finally {ui.close();}
});
test('Bandeja y estado envían solo lo editado; un rechazo explícito no bloquea cambios siguientes', async () => {
 const ui=await page('admin',{nombre:'Admin',rol:'admin'},{pedidos:[pedidoNotificacion]});
 try {
  const fetchOriginal=ui.win.fetch;
  ui.win.fetch=async()=>({ok:false,status:413,json:async()=>({error:'Solicitud demasiado grande'})});
  await ui.win.mostrarPedidosPendientesDesdeBandeja();
  ui.win.fetch=fetchOriginal;
  await ui.win.mostrarPedidosPendientesDesdeBandeja();
  assert.deepEqual(Object.keys(ui.writes.at(-1).sentData),['vistos']);
  await ui.win.cambiarEstadoPedido(90,'Entregado');
  assert.deepEqual(Object.keys(ui.writes.at(-1).sentData),['pedidos']);
  assert.equal(ui.win.obtenerPedidos()[0].estado,'Entregado');
  assert.deepEqual(ui.writes.at(-1).data.productos,seed);
 } finally {ui.close();}
});
test('Productos: tres desplegables, alta por tipo y edición de un solo producto', async () => {
 const ui = await page('admin',{nombre:'Admin',email:'admin@example.com',rol:'admin'});
 try {
  const doc=ui.win.document;
  assert.equal(doc.querySelectorAll('#seccionProductos table').length,0);
  assert.equal(doc.querySelectorAll('#seccionProductos details').length,3);
  assert.equal(doc.querySelector('.producto-admin-edicion').open,true); assert.ok([...doc.querySelectorAll('#seccionProductos details:not(.producto-admin-edicion)')].every(item=>!item.open));
  const selector=doc.querySelector('#selectorProductoAdmin');
  assert.equal(selector.options.length,seed.length);
  selector.value='2'; selector.dispatchEvent(new ui.win.Event('change'));
  assert.equal(doc.querySelector('#nombreEditar1'),null);
  doc.querySelector('#stockEditar2').value='12';
  await ui.win.guardarEdicionProductoAdmin(2,null);
  assert.equal(ui.writes.at(-1).data.productos.find(p=>p.id===2).stock,12);
  assert.equal(doc.querySelector('#selectorProductoAdmin').value,'2');
  assert.equal(doc.querySelector('.producto-admin-edicion').open,true);
  const type=doc.querySelector('#tipoAltaProducto');
  type.value='esencia'; type.dispatchEvent(new ui.win.Event('change'));
  assert.equal(doc.querySelector('#precioProductoAdmin').disabled,true);
  assert.equal(doc.querySelector('#stockEsenciaNueva').disabled,false);
  doc.querySelector('#nombreProductoAdmin').value='Cedro nuevo';
  doc.querySelector('#stockEsenciaNueva').value='Queda poco';
  await ui.win.agregarProductoAdmin({preventDefault(){}});
  const data=ui.writes.at(-1).data;
  assert.equal(data.productos.length,seed.length);
  assert.equal(data.esenciasCatalogo.at(-1).nombre,'Cedro nuevo');
  assert.equal(data.esencias.general[11],'Queda poco');
  validateState(data);
  assert.equal(doc.querySelector('#selectorEsenciaAdmin').value,'11');
  assert.equal(type.value,'vela');
  assert.equal(doc.querySelector('#precioProductoAdmin').disabled,false);
 } finally {ui.close();}
});

test('Esencias: abrir no guarda; editar nombre conserva cantidades y datos de ambos formatos', async () => {
 for (const initial of [
  {esencias:{mediana:{0:8},chica:{0:3}}},
  {esenciasCatalogo:[{nombre:'Bamboo',detalle:'Natural'},{nombre:'Lavanda',detalle:''}],esencias:{general:{0:8,1:'No'}}}
 ]) {
  const ui=await page('admin',{nombre:'Admin',email:'admin@example.com',rol:'admin'},initial);
  try {
   assert.equal(ui.writes.length,0);
   const doc=ui.win.document;
   assert.equal(doc.querySelector('#stockEsencia0').value,'8');
   doc.querySelector('#nombreEsencia0').value='Bamboo actualizado';
   await ui.win.guardarEsenciaAdmin(0);
   const data=ui.writes.at(-1).data;
   assert.equal(data.esencias.general[0],8);
   assert.equal(data.esenciasCatalogo[0].nombre,'Bamboo actualizado');
   if (initial.esencias.chica) {
    assert.equal(data.esencias.general[7],3);
    assert.deepEqual(data.esencias.chica,initial.esencias.chica);
   } else assert.equal(data.esencias.general[1],'No');
   assert.deepEqual(data.productos,seed);
   validateState(data);
  } finally {ui.close();}
 }
});

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
async function page(name,user,initial = {}) {
 const html = await readFile(name+'.html','utf8');
 const dom = new JSDOM(html,{url:'http://localhost/'+name+'.html',runScripts:'outside-only'});
 const win = dom.window, errors = [], writes = [];
 win.structuredClone = structuredClone;
 win.alert = message => errors.push(message); win.confirm = () => true;
 let state = {usuario:user,productos:structuredClone(seed),esencias:{mediana:{},chica:{}},pedidos:[],vistos:[],version:1,...initial};
 win.fetch = async (url,options) => {
  if (url.startsWith('/api/admin/state')) {const body=JSON.parse(options.body); if(body.productChanges) body.data.productos=applyProductChanges(state.productos,body.productChanges); state = {...state,...body.data,version:state.version+1}; writes.push({...body,sentData:body.data,data:structuredClone(state)}); return {ok:true,json:async()=>({version:state.version})};}
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

test('Editar un pedido no mezcla alertas de esencias con productos vendidos',async()=>{
 const ui=await page('admin',{nombre:'Admin',rol:'admin'},{esencias:{general:{0:'No'}},esenciasCatalogo:[{nombre:'Bamboo',detalle:''}]});
 try{
  ui.run('productosPedidoEditando=[{id:1,nombre:"Vela",precio:350,cantidad:2}]');
  const lines=ui.win.prepararProductosPedidoEditado();assert.equal(lines.length,1);assert.equal(lines[0].cantidad,2);assert.equal(lines[0].id,1);
 }finally{ui.close()}
});
test('Venta manual no recorta a cero un stock insuficiente ni guarda la venta',async()=>{
 const ui=await page('admin',{nombre:'Admin',rol:'admin'});
 try{
  ui.run('productosVentaManual=[{id:1,nombre:"Vela",precio:350,cantidad:2},{id:1,nombre:"Vela",precio:340,cantidad:4}]');
  await ui.win.guardarVentaManual({preventDefault(){}});
  assert.equal(ui.writes.length,0);assert.equal(ui.run('velas[0].stock'),5);
  assert.match(ui.win.document.querySelector('#mensajeVentaManual').textContent,/stock suficiente/);
 }finally{ui.close()}
});
test('Producto rechazado conserva los campos escritos sin contaminar el catálogo en memoria',async()=>{
 const ui=await page('admin',{nombre:'Admin',rol:'admin'});
 try{
  ui.win.document.querySelector('#stockEditar1').value='-1';
  ui.win.fetch=async()=>({ok:false,status:400,json:async()=>({error:'Stock inválido'})});
  await assert.rejects(ui.win.guardarEdicionProductoAdmin(1,null),/Stock inválido/);
  assert.equal(ui.run('velas[0].stock'),5);assert.equal(ui.win.document.querySelector('#stockEditar1').value,'-1');
 }finally{ui.close()}
});
test('Carrito recuperado actualiza precios, limita cantidades y no inventa stock al quitar',async()=>{
 const ui=await page('tienda',{nombre:'Ana',rol:'cliente'});
 try{
  ui.win.sessionStorage.setItem('carritoPendienteFlamitas',JSON.stringify([{id:1,nombre:'Viejo',precio:1,cantidad:99}]));
  ui.win.recuperarCarritoPendiente();assert.equal(ui.run('carrito[0].cantidad'),5);assert.equal(ui.run('carrito[0].precio'),350);
  ui.win.quitarDelCarrito(0);assert.equal(ui.run('velas[0].stock'),5);
  ui.win.sessionStorage.setItem('carritoPendienteFlamitas','{roto');assert.doesNotThrow(()=>ui.win.recuperarCarritoPendiente());
  assert.equal(ui.run('carrito.length'),0);
 }finally{ui.close()}
});
test('Latitas muestran precio actual y comparten stock terminado entre esencias',async()=>{
 const productos=structuredClone(seed);productos.find(p=>p.id===4).precio=390;productos.find(p=>p.id===4).stock=2;
 const ui=await page('tienda',{nombre:'Ana',rol:'cliente'},{productos,esencias:{general:{0:99,1:99}},esenciasCatalogo:[{nombre:'Bamboo',detalle:''},{nombre:'Manzana y Canela',detalle:''}]});
 try{
  ui.win.abrirModalLatitas();assert.match(ui.win.document.querySelector('#contenedorEsenciasLatitas').textContent,/390/);
  ui.win.agregarProductoAlCarrito({id:'latita-mediana-0',nombre:'Latita',precio:390,tipoLatita:'mediana',indiceEsencia:0},2);
  assert.equal(ui.win.puedeAgregarEsencia('mediana',1,1,ui.win.obtenerStockEsencia('mediana',1)),false);
  assert.equal(ui.win.puedeAgregarEsencia('mediana',1,0.5,99),false);
 }finally{ui.close()}
});
test('Dirección de entrega y nombre entre comillas se muestran como texto',async()=>{
 const productos=structuredClone(seed);productos[0].nombre='Vela " onload="alert(1)';
 const ui=await page('tienda',{nombre:'Ana',rol:'cliente'},{productos});
 try{
  assert.equal(ui.win.document.querySelector('.producto img').getAttribute('onload'),null);
  ui.win.document.querySelector('#metodoEntrega').value='Envío';
  ui.win.document.querySelector('#direccionEntrega').value='<img src=x onerror=alert(1)>';
  ui.win.actualizarResumenCheckout();assert.equal(ui.win.document.querySelector('#resumenPedidoCheckout img'),null);
  assert.match(ui.win.document.querySelector('#resumenPedidoCheckout').textContent,/<img/);
 }finally{ui.close()}
});
test('Identificador nuevo no reutiliza productos históricos ni IDs de latitas',async()=>{
 const ui=await page('admin',{nombre:'Admin',rol:'admin'},{pedidos:[{...pedidoNotificacion,productos:[{id:55,nombre:'Anterior',cantidad:1}]}]});
 try{assert.equal(ui.win.obtenerNuevoIdProducto(),56)}finally{ui.close()}
});
test('Pedido confirmado sigue confirmado aunque falle la actualización del catálogo',async()=>{
 const ui=await page('tienda',{nombre:'Ana',rol:'cliente'});
 try{
  ui.win.agregarAlCarrito(1);const alerts=[];ui.win.alert=x=>alerts.push(x);
  ui.win.fetch=async(url)=>{
   if(url==='/api/orders')return {ok:true,json:async()=>({id:900,productos:[{nombre:'Vela',cantidad:1,subtotal:350}],total:350,pago:{subtotal:350,ajuste:0,medio:'Efectivo'},entrega:{metodo:'Retiro'}})};
   throw Error('Servidor no responde');
  };
  ui.win.document.querySelector('#metodoEntrega').value='Retiro';
  await ui.win.enviarPedidoWhatsApp({preventDefault(){},target:ui.win.document.querySelector('#formEntrega')});
  assert.equal(ui.run('carrito.length'),0);assert.match(alerts.at(-1),/pedido quedó guardado/);
  assert.ok(ui.win.document.querySelector('#formEntrega a[href^="https://wa.me/"]'));
 }finally{ui.close()}
});

test('Administrador renovado: búsqueda, cambios pendientes y confirmación de guardado',async()=>{
 const ui=await page('admin',{nombre:'Admin',rol:'admin'});
 try {
 const doc=ui.win.document;const search=doc.querySelector('#buscarProductoAdmin');
 search.value='zz-no-existe';search.dispatchEvent(new ui.win.Event('input'));assert.equal(doc.querySelectorAll('.resultado-producto').length,0);
 search.value='';search.dispatchEvent(new ui.win.Event('input'));assert.equal(doc.querySelectorAll('.resultado-producto').length,seed.length);
 const input=doc.querySelector('#nombreEditar1');input.value='Nombre de prueba';input.dispatchEvent(new ui.win.Event('input',{bubbles:true}));
 assert.match(doc.querySelector('#estadoEdicionProducto').textContent,/sin guardar/);
 ui.win.confirm=()=>false;doc.querySelector('[data-producto="2"]').click();assert.equal(doc.querySelector('#selectorProductoAdmin').value,'1');assert.equal(input.value,'Nombre de prueba');
 doc.querySelector('#guardarProducto1').click();assert.equal(input.disabled,true);
 for(let i=0;i<30 && !doc.querySelector('#estadoEdicionProducto').textContent.includes('Cambios guardados');i++)await new Promise(r=>setTimeout(r,10));
 assert.equal(doc.querySelector('#estadoEdicionProducto').textContent,'Cambios guardados');assert.equal(doc.querySelector('#nombreEditar1').disabled,false);assert.equal(ui.writes.at(-1).data.productos[0].nombre,'Nombre de prueba');
 doc.querySelector('#nombreEditar1').value='Conservar ante fallo';ui.win.fetch=async()=>{throw new Error('Fallo simulado')};doc.querySelector('#guardarProducto1').click();
 for(let i=0;i<30 && !doc.querySelector('#estadoEdicionProducto').textContent.includes('No se pudo guardar');i++)await new Promise(r=>setTimeout(r,10));
 assert.match(doc.querySelector('#estadoEdicionProducto').textContent,/No se pudo guardar/);assert.equal(doc.querySelector('#nombreEditar1').value,'Conservar ante fallo');assert.equal(doc.querySelector('#guardarProducto1').disabled,false);
 }finally{ui.close()}
});

test('Transferencia: datos exactos, enlaces opcionales y copia con alternativa ante error',async()=>{
 const ui=await page('tienda',{nombre:'Ana',email:'ana@example.com',rol:'cliente'});
 try {
 const d=ui.win.document;ui.win.iniciarTransferencia();const medio=d.querySelector('#medioPagoEntrega');
 assert.equal(d.querySelector('#datosTransferencia').hidden,true);
 medio.value='Transferencia bancaria';medio.dispatchEvent(new ui.win.Event('change'));
 assert.equal(d.querySelector('#datosTransferencia').hidden,false);assert.equal(d.querySelector('#cuentaTransferencia').textContent,'1001076725768');
 const banco=d.querySelector('#bancoTransferencia');assert.equal(d.querySelector('#abrirBancoTransferencia').hasAttribute('href'),false);
 banco.value='11';banco.dispatchEvent(new ui.win.Event('change'));assert.equal(d.querySelector('#abrirBancoTransferencia').href,'https://www.prexcard.com/');assert.equal(d.querySelector('#abrirBancoTransferencia').target,'_blank');
 banco.value='otro';banco.dispatchEvent(new ui.win.Event('change'));assert.equal(d.querySelector('#abrirBancoTransferencia').hidden,true);assert.equal(d.querySelector('#abrirBancoTransferencia').hasAttribute('href'),false);
 let copied;Object.defineProperty(ui.win.navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text}}});
 await ui.win.copiarTransferencia(false);assert.equal(copied,'1001076725768');
 await ui.win.copiarTransferencia(true);assert.match(copied,/Silvia Andrea Rosales Gatto/);assert.match(copied,/UYU/);
 ui.win.navigator.clipboard.writeText=async()=>{throw Error('denied')};await ui.win.copiarTransferencia(false);assert.match(d.querySelector('#estadoCopiaTransferencia').textContent,/Seleccioná y copiá/);
 medio.value='Efectivo';medio.dispatchEvent(new ui.win.Event('change'));assert.equal(d.querySelector('#datosTransferencia').hidden,true);assert.equal(d.querySelector('#estadoPagoEntrega').value,'Pendiente');assert.equal(ui.writes.length,0);
 }finally{ui.close()}
});
test('Transferencia: conserva instrucciones tras guardar y reinicia referencia para otra compra',async()=>{
 const ui=await page('tienda',{nombre:'Ana',rol:'cliente'});
 try {const d=ui.win.document;const pedido={id:77,total:350,pago:{medio:'Transferencia bancaria',estado:'Pendiente'}};
 ui.win.mostrarTransferenciaPedidoGuardado(pedido);assert.equal(d.querySelector('#transferenciaPedidoGuardado').hidden,false);assert.match(d.querySelector('#instruccionTransferencia').textContent,/Pedido #77/);assert.equal(pedido.pago.estado,'Pendiente');
 ui.win.abrirModalEntrega();assert.equal(d.querySelector('#transferenciaPedidoGuardado').hidden,true);assert.ok(d.querySelector('#formEntrega #datosTransferencia'));assert.doesNotMatch(d.querySelector('#instruccionTransferencia').textContent,/#77/);
 }finally{ui.close()}
});

test('Gastos: cuotas mensuales conservan centavos y ajustan fin de mes',async()=>{const ui=await page('admin',{nombre:'Admin',rol:'admin'});try{const w=ui.win,d=w.document;const f=d.querySelector('#formGasto');f.elements.total.value='100';f.elements.mode.value='cuotas';f.elements.count.value='3';f.elements.firstDue.value='2026-01-31';w.prepararCuotas();const rows=[...d.querySelectorAll('#cuotasGasto fieldset')];assert.equal(rows.length,3);assert.equal(rows[1].querySelector('[data-cuota=due]').value,'2026-02-28');assert.equal(rows[2].querySelector('[data-cuota=due]').value,'2026-03-31');assert.equal(rows.reduce((n,r)=>n+Math.round(Number(r.querySelector('[data-cuota=amount]').value)*100),0),10000);assert.ok(rows.every(r=>r.querySelector('[data-cuota=paidAt]').value===''));w.mostrarSeccionAdmin('gastos');assert.equal(d.querySelector('#seccionGastos').classList.contains('active'),true);}finally{ui.close()}});

test('Gastos: formulario guarda cuotas y conserva campos si el servidor rechaza',async()=>{const ui=await page('admin',{nombre:'Admin',rol:'admin'});try{const w=ui.win,d=w.document;let state={start:null,opening:null,expenses:[],movements:[]},version=1,fail=false;w.api=async(url,method,body)=>{if(method==='PUT'){if(fail)throw Error('Conflicto de prueba');state=structuredClone(body.data);return {version:++version}}return {version,data:structuredClone(state),summary:{configured:false,collected:0,paid:0,result:null,balance:null,pending:0,overdue:0,next30:0,afterCommitments:null,contributions:0,withdrawals:0,refunds:0,reimbursements:0}}};w.iniciarFinanzas();await new Promise(r=>setTimeout(r,10));const f=d.querySelector('#formGasto');f.elements.description.value='Cera de prueba';f.elements.total.value='100';w.prepararCuotas();await w.guardarGasto({preventDefault(){},target:f});assert.equal(state.expenses.length,1);assert.equal(state.expenses[0].installments[0].amount,100);assert.match(d.querySelector('#listaGastos').textContent,/Cera de prueba/);w.editarGasto(state.expenses[0]);f.elements.description.value='Conservar campo';fail=true;await w.guardarGasto({preventDefault(){},target:f});assert.equal(f.elements.description.value,'Conservar campo');assert.match(d.querySelector('#mensajeFinanzas').textContent,/Conflicto/);assert.equal(f.elements.description.disabled,false);}finally{ui.close()}});

test('Por cobrar: recordatorio configurable, sin mezcla de caja y pendientes',async()=>{const ui=await page('admin',{nombre:'Admin',rol:'admin'});try{const w=ui.win,d=w.document;w.api=async()=>({pending:[{id:1,cliente:'Ana',date:'2026-01-01',total:350,medio:'Efectivo'}],toCollect:350,cash:100,unregisteredPaid:0});w.iniciarCobros();await new Promise(r=>setTimeout(r,10));assert.match(d.querySelector('#resumenCobros').textContent,/Dinero por cobrar/);assert.match(d.querySelector('#resumenCobros').textContent,/Dinero en caja/);assert.ok(d.querySelector('#avisoSeguimientoCobros'));d.querySelector('#avisoSeguimientoCobros button:last-child').click();await w.cargarCobros();assert.equal(d.querySelector('#avisoSeguimientoCobros'),null);d.querySelector('#frecuenciaCobros').value='0';d.querySelector('#frecuenciaCobros').dispatchEvent(new w.Event('change'));assert.equal(w.localStorage.getItem('flamitasCobrosHoras'),'0');w.mostrarSeccionAdmin('cobros');assert.ok(d.querySelector('#seccionCobros').classList.contains('active'));}finally{ui.close()}});

test('Finanzas: cuatro pestañas, pago directo y resumen mensual sin duplicar gastos',async()=>{const ui=await page('admin',{nombre:'Admin',rol:'admin'});try{const w=ui.win,d=w.document;let state={start:'2026-01-01',opening:100,expenses:[{id:'expense-test',description:'Feria',category:'Ferias',supplier:'',date:'2026-01-01',total:50,installments:[{due:'2026-01-01',amount:50,paidAt:null}]}],movements:[{id:'movement-test',type:'cobro',date:'2026-01-02',amount:100,description:'Venta'}]};w.api=async(url,method,body)=>{if(method==='PUT'){state=structuredClone(body.data);return {version:2}}return {version:1,data:structuredClone(state),toCollect:25,history:[],summary:{balance:100,next30:50,collected:100,paid:0,result:100,pending:50,configured:true}}};w.iniciarFinanzas();await new Promise(r=>setTimeout(r,10));assert.equal(d.querySelectorAll('#resumenFinanzas article').length,4);assert.equal(d.querySelector('#editorGasto').open,false);d.querySelector('[data-fin-tab="2"]').click();assert.equal(d.querySelector('[data-fin-panel="2"]').hidden,false);assert.equal(d.querySelector('[data-fin-panel="1"]').hidden,true);w.prompt=()=> '2026-01-10';await w.pagarCuotaFinanzas('expense-test',0);assert.equal(state.expenses[0].installments[0].paidAt,'2026-01-10');const month=w.resumenMensualFinanzas('2026-01');assert.equal(month.result,50);assert.equal(month.rows.length,2);d.querySelector('#mesMovimientos').value='2026-01';d.querySelector('#tipoMovimientos').value='gasto';w.renderPanelFinanzas();assert.match(d.querySelector('#listaMovimientos').textContent,/Feria/);assert.doesNotMatch(d.querySelector('#listaMovimientos').textContent,/Venta/);}finally{ui.close()}});

test('Productos: eliminar limpia pendientes del anterior y restaurar valor permite cambiar',async()=>{
 const ui=await page('admin',{nombre:'Admin',rol:'admin'});
 try{const w=ui.win,d=w.document;let confirmations=0;w.confirm=()=>{confirmations++;return true};
 const field=d.querySelector('#nombreEditar1');const original=field.value;field.value='Cambio temporal';field.dispatchEvent(new w.Event('input',{bubbles:true}));
 field.value=original;field.dispatchEvent(new w.Event('input',{bubbles:true}));assert.match(d.querySelector('#estadoEdicionProducto').textContent,/Sin cambios/);assert.equal(ui.run('productoAdminSucio'),false);
 field.value='Edición que se descarta al eliminar';field.dispatchEvent(new w.Event('input',{bubbles:true}));await w.eliminarProductoAdmin(1);
 assert.equal(ui.run('productoAdminSucio'),false);assert.match(d.querySelector('#estadoEdicionProducto').textContent,/Sin cambios/);
 const select=d.querySelector('#selectorProductoAdmin');select.value=select.options[1].value;select.dispatchEvent(new w.Event('change'));assert.equal(confirmations,1);assert.equal(ui.run('productoAdminSeleccionadoId'),Number(select.value));
 }finally{ui.close()}
});
