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
