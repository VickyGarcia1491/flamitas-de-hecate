import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reconcileOrderStock} from '../server/business.js';
const initial = () => ({productos:[{id:1,nombre:'Vela',stock:3},{id:4,nombre:'Latita',stock:7}],esencias:{mediana:{0:4},chica:{}},pedidos:[{id:10,estado:'Nuevo',cliente:{email:'cliente@example.com'},productos:[{id:1,nombre:'Vela',cantidad:2}]}]});
test('Cancelar repone una vez y reactivar descuenta',()=>{
 const old=initial(), canceled=structuredClone(old); canceled.pedidos[0].estado='Cancelado';
 reconcileOrderStock(old,canceled); assert.equal(canceled.productos[0].stock,5);
 const again=structuredClone(canceled); reconcileOrderStock(canceled,again); assert.equal(again.productos[0].stock,5);
 const active=structuredClone(again); active.pedidos[0].estado='Nuevo'; reconcileOrderStock(again,active); assert.equal(active.productos[0].stock,3);
});
test('Editar cantidades, reemplazar producto y cambiar solo el pago',()=>{
 const old=initial(),next=structuredClone(old);next.pedidos[0].productos[0].cantidad=4;
 reconcileOrderStock(old,next);assert.equal(next.productos[0].stock,1);
 const replaced=structuredClone(next); replaced.pedidos[0].productos=[{id:4,nombre:'Latita',cantidad:2}];
 reconcileOrderStock(next,replaced);assert.equal(replaced.productos[0].stock,5);assert.equal(replaced.productos[1].stock,5);
 const payment=structuredClone(replaced);payment.pedidos[0].pago={estado:'Pagado'};
 assert.equal(reconcileOrderStock(replaced,payment),false);
});
test('Sin stock rechaza todos los ajustes, incluso al reactivar',()=>{
 const old=initial();old.pedidos[0].estado='Cancelado';const next=structuredClone(old);next.pedidos[0].estado='Nuevo';next.pedidos[0].productos[0].cantidad=9;
 assert.throws(()=>reconcileOrderStock(old,next),/No hay stock/);assert.equal(next.productos[0].stock,3);
});
test('Latitas: conserva stock por esencia antiguo y producto terminado actual',()=>{
 for(const general of [false,true]){
  const old=initial();if(general)old.esencias.general={0:10};
  old.pedidos[0].productos=[{id:4,nombre:'Latita',tipoLatita:'mediana',indiceEsencia:0,cantidad:2}];
  const next=structuredClone(old);next.pedidos[0].estado='Cancelado';reconcileOrderStock(old,next);
  assert.equal(next.productos[1].stock,general?9:7);assert.equal(next.esencias.mediana[0],general?4:6);
  if(general)assert.equal(next.esencias.general[0],10);
 }
});
test('Ventas manuales antiguas por nombre; producto faltante no se ignora',()=>{
 const old=initial();old.pedidos[0].cliente.email='Venta manual';delete old.pedidos[0].productos[0].id;
 const next=structuredClone(old);next.pedidos[0].estado='Cancelado';reconcileOrderStock(old,next);assert.equal(next.productos[0].stock,5);
 const missing=structuredClone(old);missing.productos=[];missing.pedidos[0].estado='Cancelado';assert.throws(()=>reconcileOrderStock(old,missing),/identificar/);
});
test('Editar cancelado, borrar historial y venta nueva no duplican movimientos',()=>{
 const old=initial();old.pedidos[0].estado='Cancelado';const next=structuredClone(old);next.pedidos[0].productos[0].cantidad=5;
 assert.equal(reconcileOrderStock(old,next),false);
 next.pedidos=[];assert.equal(reconcileOrderStock(old,next),false);
 next.pedidos=[{...old.pedidos[0],id:22,estado:'Nuevo'}];assert.equal(reconcileOrderStock(old,next),false);
});
