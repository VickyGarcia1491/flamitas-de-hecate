import {createHash} from 'node:crypto';
import {fail} from './security.js';
export const imageHash=image=>createHash('md5').update(image).digest('hex');
export const imageUrl=p=>'/api/product-images/'+p.id+'?v='+imageHash(p.imagen);
export const publicProducts=products=>products.map(p=>({...p,imagen:typeof p.imagen==='string'&&/^data:image\/(jpeg|png|webp|gif);base64,/.test(p.imagen)?imageUrl(p):p.imagen}));
export function preserveProductImages(products,previous){
 for(const p of products)if(typeof p.imagen==='string'&&p.imagen.startsWith('/api/product-images/')){
  const old=previous.find(x=>x.id===p.id);
  if(!old||!old.imagen?.startsWith('data:image/')||p.imagen!==imageUrl(old))fail('La foto cambió en otra sesión. Actualizá el catálogo.',409);
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
