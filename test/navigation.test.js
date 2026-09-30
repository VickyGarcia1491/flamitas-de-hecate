import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('Menús: carga oculta, sesión cliente, administrador e invitado',async()=>{
 for(const page of ['index','contacto','tienda','mi-cuenta','registro']){
  for(const user of [null,{rol:'cliente',nombre:'Ana'},{rol:'admin',nombre:'Admin'}]){
   const dom=new JSDOM(await readFile(page+'.html','utf8'),{runScripts:'outside-only',url:'https://flamitas.example'});
   try{
    const w=dom.window;w.datosServidor={usuario:user};
    for(const a of w.document.querySelectorAll('a[href="admin.html"]'))assert.equal(a.hidden,true);
    vm.runInContext(await readFile('js/usuarios.js','utf8'),dom.getInternalVMContext());w.mostrarUsuarioEnMenu();
    for(const a of w.document.querySelectorAll('a[href="admin.html"]'))assert.equal(a.hidden,user?.rol!=='admin');
    for(const a of w.document.querySelectorAll('a[href="login.html"]'))assert.equal(a.hidden,!!user);
    if(user && w.document.querySelector('.menu-links'))assert.ok(w.document.querySelector('.menu-links a[href="'+(user.rol==='admin'?'admin.html':'mi-cuenta.html')+'"]'));
   }finally{dom.window.close();}
  }
 }
});

test('Escape no falla sin menú desplegable y los enlaces dinámicos lo cierran',async()=>{
 for(const markup of ['<body></body>','<body><button id="menuToggle"></button><ul id="menuLinks" class="active"></ul></body>']){
  const dom=new JSDOM(markup,{runScripts:'outside-only'});try{
   const win=dom.window;vm.runInContext(await readFile('js/main.js','utf8'),dom.getInternalVMContext());win.inicio();
   assert.doesNotThrow(()=>win.cerrarMenu());assert.doesNotThrow(()=>win.toggleMenu());
   const menu=win.document.querySelector('#menuLinks');if(menu){menu.classList.add('active');const a=win.document.createElement('a');a.href='#cuenta';menu.append(a);a.click();assert.equal(menu.classList.contains('active'),false)}
  }finally{dom.window.close()}
 }
});

test('Menú admite enlaces sin extensión generados por Netlify',async()=>{for(const user of [null,{rol:'cliente',nombre:'Ana'},{rol:'admin',nombre:'Admin'}]){const dom=new JSDOM('<ul class="menu-links"><li><a href="/login">Ingresar</a></li><li><a href="/mi-cuenta" hidden>Cuenta</a></li><li><a href="/admin" hidden>Admin</a></li></ul>',{runScripts:'outside-only'});try{dom.window.datosServidor={usuario:user};vm.runInContext(await readFile('js/usuarios.js','utf8'),dom.getInternalVMContext());dom.window.mostrarUsuarioEnMenu();const d=dom.window.document;assert.equal(d.querySelector('a[href="login.html"]').hidden,!!user);assert.equal(d.querySelector('a[href="admin.html"]').hidden,user?.rol!=='admin');assert.equal(d.querySelectorAll('a[href="'+(user?.rol==='admin'?'admin.html':'mi-cuenta.html')+'"]').length,1);}finally{dom.window.close()}}});

test('Entrada instalada antigua abre Inicio sin impedir navegación a tienda ni notificaciones',async()=>{
 const source=(await readFile('js/main.js','utf8')).split('})();')[0]+'})();';
 for(const [installed,path,started,referrer,expected] of [[true,'/tienda.html',false,'','/index.html'],[true,'/tienda',false,'','/index.html'],[true,'/tienda.html',true,'',null],[false,'/tienda.html',false,'',null],[true,'/admin.html',false,'',null],[true,'/tienda.html',false,'https://flamitas.example/index.html',null]]){
  let redirected=null;const context={window:{matchMedia:()=>({matches:installed})},navigator:{},document:{referrer},location:{pathname:path,replace:v=>redirected=v},sessionStorage:{getItem:()=>started?'1':null,setItem(){}}};vm.runInNewContext(source,context);assert.equal(redirected,expected);
 }
});
test('Login de cliente, administrador y registro abren Inicio conservando carrito',async()=>{
 const source=await readFile('js/usuarios.js','utf8');
 for(const rol of ['admin','cliente'])for(const registro of [false,true]){
  const button={disabled:false};const context={window:{},document:{querySelector:()=>({value:'prueba',textContent:''})},api:async()=>({rol}),sessionStorage:{getItem:()=> '[{"id":1}]',removeItem:()=>assert.fail('No borrar carrito')}};vm.createContext(context);vm.runInContext(source,context);await context.enviarAcceso({preventDefault(){},target:{querySelector:()=>button}},registro);assert.equal(context.window.location,'index.html');assert.equal(button.disabled,false);
 }
});

