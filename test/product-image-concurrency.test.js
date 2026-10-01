
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createImageReader} from '../server/product-images.js';
test('Las fotos simultáneas comparten consultas y nunca consultan en paralelo',async()=>{
 let active=0,max=0,calls=0;
 const reader=createImageReader({query:async(sql,[id])=>{
  calls++;active++;max=Math.max(max,active);
  await new Promise(r=>setTimeout(r,5));active--;
  return {rows:[{image:'photo-'+id}]};
 }});
 const values=await Promise.all(Array.from({length:24},(_,i)=>reader(String(i%8))));
 assert.equal(max,1);assert.equal(calls,8);
 assert.deepEqual(values,Array.from({length:24},(_,i)=>'photo-'+(i%8)));
 assert.equal(await reader('1'),'photo-1');assert.equal(calls,9);
});
test('Un fallo de la base no bloquea fotos posteriores',async()=>{
 let calls=0;const reader=createImageReader({query:async()=>{
  if(++calls===1)throw Error('connection lost');
  return {rows:[{image:'ok'}]};
 }});
 const failed=reader('1');const next=reader('2');
 await assert.rejects(failed,/connection lost/);assert.equal(await next,'ok');
 assert.equal(await reader('1'),'ok');
});
test('La cola de fotos tiene un límite y se libera al terminar',async()=>{
 let release;const blocked=new Promise(r=>{release=r;});
 const reader=createImageReader({query:async()=>{await blocked;return {rows:[]};}});
 const requests=Array.from({length:32},(_,i)=>reader(String(i)));
 await assert.rejects(reader('overflow'),e=>e.status===503);
 release();await Promise.all(requests);
 assert.equal(await reader('new'),undefined);
});
