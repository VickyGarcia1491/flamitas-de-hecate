
async function optimizarFotoProducto(file) {
 if(!file||!/^image\/(jpeg|png|webp|gif)$/.test(file.type))throw new Error('Elegí una foto JPG, PNG, WEBP o GIF.');
 if(file.size>20*1024*1024)throw new Error('Elegí una foto de hasta 20 MB.');
 const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('No pudimos leer esa foto.'));r.readAsDataURL(file);});
 {
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('No pudimos abrir esa foto. Probá con otra imagen.'));i.src=url;});
  if(!img.naturalWidth||!img.naturalHeight)throw new Error('La foto está vacía.');
  const scale=Math.min(1,1200/img.naturalWidth,1200/img.naturalHeight);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('No pudimos preparar la foto en este navegador.');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  for(const quality of [.84,.74,.64]){
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
   if(blob&&blob.size<=350*1024)return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('No pudimos preparar la foto.'));r.readAsDataURL(blob);});
  }
  throw new Error('La foto sigue siendo demasiado pesada. Elegí una de menor tamaño.');
 }
}
