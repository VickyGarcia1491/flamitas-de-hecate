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
    for(const a of w.document.querySelectorAll('a[href="admin.html"], a[href="login.html"]'))assert.equal(a.hidden,true);
    vm.runInContext(await readFile('js/usuarios.js','utf8'),dom.getInternalVMContext());w.mostrarUsuarioEnMenu();
    for(const a of w.document.querySelectorAll('a[href="admin.html"]'))assert.equal(a.hidden,user?.rol!=='admin');
    for(const a of w.document.querySelectorAll('a[href="login.html"]'))assert.equal(a.hidden,!!user);
    if(user && w.document.querySelector('.menu-links'))assert.ok(w.document.querySelector('.menu-links a[href="'+(user.rol==='admin'?'admin.html':'mi-cuenta.html')+'"]'));
   }finally{dom.window.close();}
  }
 }
});
