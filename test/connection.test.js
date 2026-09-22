import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import vm from 'node:vm';

const apiSource = await readFile('js/api.js', 'utf8');
const initSource = await readFile('js/iniciar.js', 'utf8');
const bootstrap = {usuario: null, productos: [], esencias: {}, pedidos: [], vistos: [], version: 0};
const tick = () => new Promise(resolve => setImmediate(resolve));
function ui() {
 const dom = new JSDOM('<body><a href="tienda.html">Tienda</a><form><input name="password"><button type="submit">Ingresar</button></form><button id="disabled" disabled>Esperar</button></body>', {url: 'https://flamitas.example/login.html', runScripts: 'outside-only'});
 const win = dom.window;
 vm.runInContext(apiSource, dom.getInternalVMContext());
 return {dom, win, start: () => vm.runInContext(initSource, dom.getInternalVMContext())};
}

test('Conexión: portada visible, formulario protegido y activación al recibir datos', async t => {
 const {dom,win,start} = ui(); t.after(() => win.close());
 let resolver, inicios = 0;
 win.fetch = () => new Promise(resolve => {resolver = resolve;});
 win.iniciarUsuarios = () => {inicios++;};
 start();
 assert.ok(win.document.querySelector('a'));
 assert.match(win.document.querySelector('#avisoConexion').textContent, /Estamos conectando/);
 assert.equal(win.document.querySelector('form button').disabled, true);
 const submit = new win.Event('submit', {bubbles: true, cancelable: true});
 win.document.querySelector('form').dispatchEvent(submit);
 assert.equal(submit.defaultPrevented, true);
 resolver({ok:true,json:async()=>bootstrap}); await tick();
 assert.equal(inicios, 1);
 assert.equal(win.document.querySelector('#avisoConexion'), null);
 assert.equal(win.document.querySelector('form button').disabled, false);
 assert.equal(win.document.querySelector('#disabled').disabled, true);
 await vm.runInContext('conectarTienda()',dom.getInternalVMContext());
 assert.equal(inicios, 1);
});

test('Conexión: HTML de espera se reintenta; fallo final permite recuperar sin duplicar handlers', async t => {
 const {win,start} = ui(); t.after(() => win.close());
 const realTimeout = win.setTimeout.bind(win);
 win.setTimeout = (fn,ms) => realTimeout(fn, ms === 2000 ? 0 : ms);
 let calls=0, inicios=0;
 win.iniciarUsuarios = () => {inicios++;};
 win.fetch = async (_url, options) => {
  calls++; assert.equal(options.method, 'GET');
  return {ok:true,json:async()=>{throw new SyntaxError('Render HTML');}};
 };
 start();
 for (let n=0; n<100 && win.document.querySelector('#avisoConexion').dataset.estado !== 'error'; n++) await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(calls,4);
 assert.equal(inicios,0);
 assert.equal(win.document.querySelector('form button').disabled,true);
 const retry=win.document.querySelector('#avisoConexion button');
 assert.equal(retry.hidden,false);
 win.fetch=async()=>({ok:true,json:async()=>bootstrap});
 retry.click(); retry.click(); await tick();
 assert.equal(inicios,1);
 assert.equal(win.document.querySelector('#avisoConexion'),null);
});

test('API: una escritura fallida se envía una sola vez', async t => {
 const {dom,win}=ui(); t.after(()=>win.close());
 let calls=0;
 win.fetch=async()=>{calls++; throw new Error('Sin conexión');};
 await assert.rejects(vm.runInContext("api('/api/orders','POST',{productos:[]})",dom.getInternalVMContext()), /Sin conexión/);
 assert.equal(calls,1);
});

test('Contacto: doble clic no duplica consultas y el fallo conserva el mensaje', async t => {
 const dom=new JSDOM('<form id="formContacto"><input id="nombreContacto" value="Ana"><input id="telefonoContacto"><input id="emailContacto" value="ana@example.com"><textarea id="mensajeContacto">Consulta de prueba</textarea><button type="submit">Enviar</button></form><p id="mensajeContactoEstado"></p>', {url:'https://flamitas.example/contacto.html',runScripts:'outside-only'});
 const win=dom.window; t.after(()=>win.close());
 let calls=0, reject;
 win.api=()=>{calls++; return new Promise((resolve,no)=>{reject=no;});};
 vm.runInContext(await readFile('js/contacto.js','utf8'),dom.getInternalVMContext());
 const event={preventDefault(){},target:win.document.querySelector('form')};
 const first=win.enviarConsultaContacto(event);
 await win.enviarConsultaContacto(event);
 assert.equal(calls,1);
 reject(new Error('Sin conexión')); await first;
 assert.equal(win.document.querySelector('#mensajeContacto').value,'Consulta de prueba');
 assert.equal(win.document.querySelector('button').disabled,false);
 assert.match(win.document.querySelector('#mensajeContactoEstado').textContent,/Sin conexión/);
});
