
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {initialize} from '../server/app.js';
import {migrateProductImages,migrateProductImagesTransaction,hydrateProductImages,storeProductImages,createImageReader} from '../server/product-images.js';
test('Migrar fotos conserva bytes, reduce el estado, es idempotente y revierte ante error',async()=>{
 const pg=new PGlite();const query=(s,a)=>!a&&s.includes('CREATE TABLE')?pg.exec(s):pg.query(s,a);const db={query};
 try {
  await initialize(db,{ADMIN_EMAIL:'test@example.com',ADMIN_PASSWORD:'test-password-123'});
  const state=(await query('SELECT data FROM business_state WHERE id=1')).rows[0].data;
  const photo='data:image/jpeg;base64,'+Buffer.alloc(900000,5).toString('base64');
  state.productos[0].imagen=photo;
  await query('UPDATE business_state SET data=$1 WHERE id=1',[JSON.stringify(state)]);
  await query('BEGIN');assert.equal(await migrateProductImages(db),1);await query('ROLLBACK');
  assert.equal((await query('SELECT count(*)::int AS n FROM product_images')).rows[0].n,0);
  assert.equal((await query('SELECT data FROM business_state WHERE id=1')).rows[0].data.productos[0].imagen,photo);
  await query('BEGIN');assert.equal(await migrateProductImages(db),1);await query('COMMIT');
  const after=(await query('SELECT data FROM business_state WHERE id=1')).rows[0].data;
  assert.ok(JSON.stringify(after).length<20000);
  assert.equal(await createImageReader(db)(String(after.productos[0].id)),photo);
  await query('BEGIN');assert.equal(await migrateProductImages(db),0);await query('COMMIT');
  const restored=structuredClone(after);await hydrateProductImages(db,restored.productos);assert.deepEqual(restored,state);
  const broken=structuredClone(after.productos);broken[0].imagen=broken[0].imagen.replace(/v=.*/,'v='+'0'.repeat(32));
  await assert.rejects(storeProductImages(db,broken),e=>e.status===409);
 }finally{await pg.close();}
});

test('Arranque migra atómicamente, puede repetirse y revierte inserciones fallidas',async()=>{
 const pg=new PGlite();const query=(s,a)=>!a&&s.includes('CREATE TABLE')?pg.exec(s):pg.query(s,a);
 let failInsert=true,releases=0;
 const db={query,connect:async()=>({query:async(s,a)=>{
  const result=await query(s,a);
  if(failInsert&&s.startsWith('INSERT INTO product_images'))throw Object.assign(Error('Injected disconnect'),{code:'ECONNRESET'});
  return result;
 },release(){releases++;}})};
 try{
  await initialize(db,{ADMIN_EMAIL:'test@example.com',ADMIN_PASSWORD:'test-password-123'});
  const state=(await query('SELECT data FROM business_state WHERE id=1')).rows[0].data;
  state.productos[0].imagen='data:image/png;base64,AQID';
  await query('UPDATE business_state SET data=$1 WHERE id=1',[JSON.stringify(state)]);
  await assert.rejects(migrateProductImagesTransaction(db),e=>e.code==='ECONNRESET');
  assert.equal((await query('SELECT count(*)::int n FROM product_images')).rows[0].n,0);
  assert.deepEqual((await query('SELECT data FROM business_state WHERE id=1')).rows[0].data,state);
  failInsert=false;
  assert.equal(await migrateProductImagesTransaction(db),1);
  assert.equal(await migrateProductImagesTransaction(db),0);
  const restored=(await query('SELECT data FROM business_state WHERE id=1')).rows[0].data;
  await hydrateProductImages(db,restored.productos);assert.deepEqual(restored,state);
  assert.equal(releases,3);
 }finally{await pg.close();}
});
