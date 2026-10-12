import {createHash} from 'node:crypto';
import {fail} from './security.js';
export const imageHash=image=>createHash('md5').update(image).digest('hex');
export const imageUrl=p=>'/api/product-images/'+p.id+'?v='+imageHash(p.imagen);
export const publicProducts=products=>products.map(p=>({...p,imagen:typeof p.imagen==='string'&&/^data:image\/(jpeg|png|webp|gif);base64,/.test(p.imagen)?imageUrl(p):p.imagen}));
export function preserveProductImages(products,previous){
 for(const p of products)if(typeof p.imagen==='string'&&p.imagen.startsWith('/api/product-images/')){
  const old=previous.find(x=>x.id===p.id);
  if(!old || p.imagen !== (old.imagen?.startsWith('data:image/') ? imageUrl(old) : old.imagen))fail('La foto cambió en otra sesión. Actualizá el catálogo.',409);
  p.imagen=old.imagen;
 }
}
// PostgreSQL retira las fotos antes de enviar el catálogo al proceso y al celular.
export const lightStateSql=`SELECT version,jsonb_set(data,'{productos}',COALESCE((SELECT jsonb_agg(CASE WHEN p->>'imagen' ~ '^data:image/(jpeg|png|webp|gif);base64,' THEN jsonb_set(p,'{imagen}',to_jsonb('/api/product-images/'||(p->>'id')||'?v='||md5(p->>'imagen'))) ELSE p END) FROM jsonb_array_elements(data->'productos') p),'[]'::jsonb)) AS data FROM business_state WHERE id=1`;

// Consultar una foto sin materializar todas las filas con sus imágenes.
export const productImageSql = "SELECT jsonb_path_query_first(data, '$.productos[*] ? (@.id == $id)', jsonb_build_object('id', $1::numeric))->>'imagen' AS image FROM business_state WHERE id=1";
export function createImageReader(db) {
 let tail=Promise.resolve();
 let pending=0;
 const inFlight=new Map();
 return function readImage(id) {
  if(inFlight.has(id))return inFlight.get(id);
  if(pending>=32)return Promise.reject(Object.assign(new Error('Las fotos están ocupadas. Intentá nuevamente en un momento.'),{status:503}));
  pending++;
  const result=tail.then(async()=>{
   const stored=await db.query('SELECT image FROM product_images WHERE product_id=$1',[id]);
   if(stored.rows[0])return stored.rows[0].image;
   const response=await db.query(productImageSql,[id]);
   return response.rows[0]?.image;
  });
  // Un error no debe dejar bloqueadas las siguientes solicitudes.
  tail=result.then(()=>undefined,()=>undefined);
  const tracked=result.finally(()=>{pending--;inFlight.delete(id);});
  inFlight.set(id,tracked);
  return tracked;
 };
}

// El llamador debe mantener una transacción: foto y referencia se guardan juntas.
export async function storeProductImages(client,products) {
 let count=0;
 for(const p of products) {
  if(typeof p.imagen==='string'&&p.imagen.startsWith('data:image/')) {
   await client.query('INSERT INTO product_images(product_id,image,hash) VALUES($1,$2,$3) ON CONFLICT(product_id) DO UPDATE SET image=EXCLUDED.image,hash=EXCLUDED.hash',[p.id,p.imagen,imageHash(p.imagen)]);
   p.imagen=imageUrl(p);count++;
  } else if(p.imagen?.startsWith('/api/product-images/')) {
   const saved=(await client.query('SELECT hash FROM product_images WHERE product_id=$1',[p.id])).rows[0];
   if(!saved||p.imagen!=='/api/product-images/'+p.id+'?v='+saved.hash)fail('No se encontró la foto original. No se guardaron los cambios.',409);
  } else {
   await client.query('DELETE FROM product_images WHERE product_id=$1',[p.id]);
  }
 }
 return count;
}
export async function hydrateProductImages(client,products) {
 for(const p of products)if(p.imagen?.startsWith('/api/product-images/')) {
  const saved=(await client.query('SELECT image FROM product_images WHERE product_id=$1',[p.id])).rows[0];
  if(!saved||p.imagen!==imageUrl({id:p.id,imagen:saved.image}))fail('No se pudo completar el respaldo de las fotos.',503);
  p.imagen=saved.image;
 }
}
export async function migrateProductImages(client) {
 const current=(await client.query('SELECT data,version FROM business_state WHERE id=1 FOR UPDATE')).rows[0];
 const count=await storeProductImages(client,current.data.productos);
 if(count)await client.query('UPDATE business_state SET data=$1,version=version+1 WHERE id=1',[JSON.stringify(current.data)]);
 return count;
}

// Ejecutar antes de aceptar tráfico; repetir el arranque no duplica las fotos.
export async function migrateProductImagesTransaction(db) {
 const client=await db.connect();
 let discard;
 try {
  await client.query('BEGIN');
  const count=await migrateProductImages(client);
  await client.query('COMMIT');
  return count;
 } catch(error) {
  try { await client.query('ROLLBACK'); } catch(rollbackError) { discard=rollbackError; }
  throw error;
 } finally { client.release(discard); }
}
