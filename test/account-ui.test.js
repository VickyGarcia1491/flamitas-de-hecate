import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const seed = JSON.parse(await readFile('server/seed.json', 'utf8'));
const malicioso = '<img src=x onerror="window.hackeado=1">';

// Carga una página con sus scripts reales, sin red: iniciar.js se reemplaza por las llamadas de inicio.
async function pagina(name, usuario, rutas = {}) {
 const html = await readFile(name + '.html', 'utf8');
 const dom = new JSDOM(html, {url: 'http://localhost/' + name + '.html', runScripts: 'outside-only'});
 const win = dom.window, llamadas = [];
 win.structuredClone = structuredClone; win.alert = () => {}; win.confirm = () => true;
 const estado = {usuario, productos: structuredClone(seed), esencias: {mediana: {}, chica: {}}, pedidos: [], vistos: [], version: 1};
 win.fetch = async (url, options = {}) => {
  llamadas.push({url, method: options.method, body: options.body && JSON.parse(options.body)});
  if (rutas[url]) return {ok: true, json: async () => structuredClone(await rutas[url](options))};
  if (url === '/api/receipts') return {ok: true, json: async () => []};
  return {ok: true, json: async () => structuredClone(estado)};
 };
 for (const match of html.matchAll(/<script src="(?:\.\/)?([^"]+)"/g)) {
  if (match[1] !== 'js/iniciar.js') vm.runInContext(await readFile(match[1], 'utf8'), dom.getInternalVMContext());
 }
 await vm.runInContext('cargarDatosServidor()', dom.getInternalVMContext());
 win.iniciarUsuarios?.();
 await win.iniciarAdmin?.();
 win.iniciarMiCuenta?.();
 await win.iniciarComprobantes?.();
 return {win, doc: win.document, llamadas, close: () => win.close()};
}

test('Ojito: alterna el tipo del campo, conserva foco y cursor y no envía el formulario', async () => {
 for (const [name, id] of [['login', 'passwordLogin'], ['registro', 'passwordRegistro']]) {
  const dom = new JSDOM(await readFile(name + '.html', 'utf8'), {runScripts: 'outside-only', url: 'http://localhost/' + name + '.html'});
  try {
   const win = dom.window, doc = win.document;
   vm.runInContext(await readFile('js/mostrar-password.js', 'utf8'), dom.getInternalVMContext());
   const campo = doc.getElementById(id), boton = campo.parentElement.querySelector('.btn-mostrar-password');
   let envios = 0; campo.form.addEventListener('submit', e => { envios++; e.preventDefault(); });
   assert.equal(campo.type, 'password', 'oculta por defecto');
   assert.equal(boton.type, 'button');
   assert.equal(boton.getAttribute('aria-pressed'), 'false');
   assert.equal(boton.getAttribute('aria-label'), 'Mostrar contraseña');
   assert.equal(boton.getAttribute('aria-controls'), id);
   assert.ok(boton.querySelector('svg[aria-hidden="true"]'), 'ícono SVG');
   assert.equal(boton.textContent.trim(), '', 'sin emoji ni texto visible');
   assert.equal(doc.querySelector('label[for="' + id + '"]').control, campo, 'la etiqueta sigue asociada');

   // Con mouse: el campo mantiene el foco y la selección.
   campo.value = 'secreta123'; campo.focus(); campo.setSelectionRange(2, 5);
   const presion = new win.MouseEvent('mousedown', {bubbles: true, cancelable: true});
   boton.dispatchEvent(presion);
   assert.equal(presion.defaultPrevented, true);
   boton.click();
   assert.equal(campo.type, 'text');
   assert.equal(boton.getAttribute('aria-pressed'), 'true');
   assert.equal(boton.getAttribute('aria-label'), 'Ocultar contraseña');
   assert.equal(doc.activeElement, campo);
   assert.deepEqual([campo.selectionStart, campo.selectionEnd], [2, 5]);
   assert.equal(campo.value, 'secreta123');

   // Con teclado: el foco queda en el botón y vuelve a ocultar.
   boton.focus(); boton.click();
   assert.equal(campo.type, 'password');
   assert.equal(boton.getAttribute('aria-pressed'), 'false');
   assert.equal(doc.activeElement, boton);
   assert.deepEqual([campo.selectionStart, campo.selectionEnd], [2, 5]);
   assert.equal(envios, 0, 'el botón no envía el formulario');

   // Ejecutar dos veces no duplica botones; vaciar el formulario vuelve a ocultar.
   win.prepararMostrarPassword();
   assert.equal(doc.querySelectorAll('.btn-mostrar-password').length, 1);
   boton.click(); campo.form.reset();
   assert.equal(campo.type, 'password');
   assert.equal(boton.getAttribute('aria-pressed'), 'false');
  } finally { dom.window.close(); }
 }
});

test('Mi cuenta: escapa datos, edita perfil sin email y cambia contraseña con ojitos', async () => {
 const usuario = {id: 2, nombre: malicioso, email: 'ana@example.com', telefono: '<b>099</b>', rol: 'cliente'};
 const ui = await pagina('mi-cuenta', usuario, {
  '/api/account': options => ({...usuario, ...JSON.parse(options.body)}),
  '/api/account/password': () => ({ok: true})
 });
 try {
  const datos = ui.doc.querySelector('#datosCuentaCliente');
  assert.equal(datos.querySelector('img'), null);
  assert.equal(datos.querySelector('b'), null);
  assert.match(datos.textContent, /<img src=x/);
  assert.equal(ui.win.hackeado, undefined);
  assert.ok(ui.doc.querySelector('#bloquePedidosCuenta'), 'clientes ven sus pedidos');
  assert.equal(ui.doc.querySelectorAll('#formPasswordCuenta .btn-mostrar-password').length, 3);

  ui.doc.querySelector('#nombreCuenta').value = 'Ana María';
  ui.doc.querySelector('#telefonoCuenta').value = '098';
  await ui.win.guardarDatosCuenta({preventDefault() {}, target: ui.doc.querySelector('#formDatosCuenta')});
  const perfil = ui.llamadas.find(l => l.url === '/api/account');
  assert.deepEqual(perfil.body, {nombre: 'Ana María', telefono: '098'});
  assert.equal(perfil.method, 'PUT');
  assert.match(datos.textContent, /Ana María/);

  ui.doc.querySelector('#passwordActualCuenta').value = 'vela-azul';
  ui.doc.querySelector('#passwordNuevaCuenta').value = 'vela-verde';
  ui.doc.querySelector('#passwordConfirmarCuenta').value = 'vela-roja';
  const formulario = ui.doc.querySelector('#formPasswordCuenta');
  await ui.win.cambiarPasswordCuenta({preventDefault() {}, target: formulario});
  assert.match(ui.doc.querySelector('#mensajePasswordCuenta').textContent, /no coinciden/);
  assert.equal(ui.llamadas.some(l => l.url === '/api/account/password'), false);
  ui.doc.querySelector('#passwordConfirmarCuenta').value = 'vela-verde';
  await ui.win.cambiarPasswordCuenta({preventDefault() {}, target: formulario});
  assert.deepEqual(ui.llamadas.find(l => l.url === '/api/account/password').body, {actual: 'vela-azul', nueva: 'vela-verde'});
  assert.equal(ui.doc.querySelector('#passwordNuevaCuenta').value, '');
 } finally { ui.close(); }
});

test('Mi cuenta de administradora: solo datos y contraseña, sin pedidos ni comprobantes', async () => {
 const ui = await pagina('mi-cuenta', {id: 1, nombre: 'Admin', email: 'admin@example.com', telefono: '', rol: 'admin'});
 try {
  assert.equal(ui.win.location.pathname, '/mi-cuenta.html');
  assert.equal(ui.doc.querySelector('#bloquePedidosCuenta'), null);
  assert.equal(ui.doc.querySelector('#panelComprobantes'), null);
  assert.equal(ui.llamadas.some(l => l.url === '/api/receipts'), false);
  assert.equal(ui.doc.querySelector('#passwordNuevaCuenta').minLength, 12);
  assert.ok(ui.doc.querySelector('#formDatosCuenta'));
  assert.equal(ui.doc.querySelector('a[href="admin.html"]').hidden, false, 'acceso al panel');
 } finally { ui.close(); }
});

test('Panel: lista de usuarios de solo lectura, escapada y tolerante a fechas nulas', async () => {
 const usuarios = [
  {id: 3, nombre: malicioso, email: 'x"@example.com', telefono: '<i>1</i>', rol: 'cliente', created_at: '2026-11-10T15:00:00.000Z'},
  {id: 1, nombre: 'Admin', email: 'admin@example.com', telefono: '', rol: 'admin', created_at: null}
 ];
 const ui = await pagina('admin', {id: 1, nombre: 'Admin', email: 'admin@example.com', telefono: '', rol: 'admin'}, {'/api/admin/users': () => usuarios});
 try {
  ui.doc.querySelector('[data-seccion="usuarios"]').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.ok(ui.doc.querySelector('#seccionUsuarios').classList.contains('active'));
  const filas = [...ui.doc.querySelectorAll('#listaUsuarios tbody tr')];
  assert.equal(filas.length, 2);
  assert.equal(ui.doc.querySelector('#listaUsuarios img, #listaUsuarios i'), null);
  assert.equal(ui.win.hackeado, undefined);
  assert.deepEqual([...filas[0].cells].map(c => c.textContent.trim()), [malicioso, 'x"@example.com', '<i>1</i>', 'Cliente', '10/11/2026']);
  assert.deepEqual([...filas[1].cells].map(c => c.textContent.trim()), ['Admin', 'admin@example.com', '—', 'Administradora', '—']);
  assert.equal(filas[0].cells[0].dataset.label, 'Nombre');
  assert.equal(ui.doc.querySelectorAll('#listaUsuarios input, #listaUsuarios button, #listaUsuarios form').length, 0, 'solo lectura');
  assert.equal(ui.llamadas.filter(l => l.url === '/api/admin/users').every(l => !l.method || l.method === 'GET'), true);
  assert.equal(ui.doc.querySelector('a[href="mi-cuenta.html"]').hidden, false, 'acceso a Mi cuenta');
 } finally { ui.close(); }
});

test('Panel: los datos del cliente de un pedido se muestran como texto', async () => {
 const pedido = {id: 50, estado: 'Nuevo', fecha: '10/11/2026', fechaISO: '2026-11-10', cliente: {nombre: malicioso, email: '<u>a@b.c</u>', telefono: '<s>1</s>'}, productos: [], entrega: {metodo: 'Retiro'}, total: 0};
 const ui = await pagina('admin', {id: 1, nombre: 'Admin', email: 'admin@example.com', telefono: '', rol: 'admin'}, {'/api/bootstrap': () => ({usuario: {rol: 'admin'}, productos: seed, esencias: {mediana: {}, chica: {}}, pedidos: [pedido], vistos: [], version: 1})});
 try {
  for (const selector of ['#contenedorPedidos', '#dashboardListaPedidos']) {
   const contenedor = ui.doc.querySelector(selector);
   assert.match(contenedor.textContent, /<img src=x/);
   assert.equal(contenedor.querySelector('img, u, s'), null);
  }
  assert.equal(ui.win.hackeado, undefined);
 } finally { ui.close(); }
});
