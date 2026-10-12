
import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const code=readFileSync('js/tienda.js','utf8');
function context(storage,api){const scope={crypto:{randomUUID:()=>Math.random().toString()},carrito:[{id:1,cantidad:1}],obtenerUsuarioActivo:()=>({email:'test@example.com'}),sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},api};vm.createContext(scope);vm.runInContext(code,scope);return scope;}
test('Recargar después de perder la respuesta conserva la identidad del pedido',async()=>{
 const storage=new Map();let first;
 const one=context(storage,async(u,m,b)=>{first=b.requestId;throw Error('Respuesta perdida');});
 await assert.rejects(one.guardarPedido({entrega:{metodo:'Retiro'}}));
 const two=context(storage,async(u,m,b)=>{assert.equal(b.requestId,first);return {id:123};});
 assert.equal((await two.guardarPedido({entrega:{metodo:'Retiro'}})).id,123);
 assert.equal(storage.has('flamitasCompraEnCurso:test@example.com'),false);
 assert.equal(storage.has('carritoPendienteFlamitas'),false);
});
test('No reutiliza una solicitud incierta para un carrito diferente; un rechazo permite corregir',async()=>{
 const storage=new Map();let sent=0;
 const one=context(storage,async()=>{sent++;throw Error('Sin conexión');});
 await assert.rejects(one.guardarPedido({entrega:{metodo:'Retiro'}}));
 one.carrito[0].cantidad=2;
 await assert.rejects(one.guardarPedido({entrega:{metodo:'Retiro'}}),/compra sin confirmar/);assert.equal(sent,1);
 const two=context(new Map(),async()=>{throw Object.assign(Error('Sin stock'),{status:409});});
 await assert.rejects(two.guardarPedido({}));
 two.api=async()=>({id:124});two.carrito[0].cantidad=2;
 assert.equal((await two.guardarPedido({})).id,124);
});
