async function iniciarNotificaciones() {
 const activar=document.querySelector('#activarNotificaciones'), desactivar=document.querySelector('#desactivarNotificaciones'), estado=document.querySelector('#estadoNotificaciones');
 if (!activar) return;
 if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
  activar.disabled=true; estado.textContent='Este navegador no admite avisos. Abrí Flamitas desde Chrome en tu Android.'; return;
 }
 const registrar=async()=>{await navigator.serviceWorker.register('/sw.js');return navigator.serviceWorker.ready;};
 const guardar=async(registro)=>{
  const {publicKey}=await api('/api/admin/push/key');
  const bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const subscription=await registro.pushManager.getSubscription() || await registro.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
  await api('/api/admin/push/subscription','POST',subscription.toJSON());
  estado.textContent='Notificaciones activadas en este dispositivo. Al cerrar sesión se desactivan.';
  activar.hidden=true; desactivar.hidden=false;
 };
 activar.addEventListener('click',async()=>{
  activar.disabled=true;
  try {
   const permission=await Notification.requestPermission();
   if(permission!=='granted') {estado.textContent='No se activaron los avisos. Podés permitirlos desde los ajustes de Chrome.';return;}
   await guardar(await registrar());
  } catch(error) {estado.textContent='No pudimos activar las notificaciones. '+error.message;}
  finally {activar.disabled=false;}
 });
 desactivar.addEventListener('click',async()=>{
  desactivar.disabled=true;
  try {
   const registro=await registrar(), subscription=await registro.pushManager.getSubscription();
   if(subscription) {await api('/api/admin/push/unsubscribe','POST',{endpoint:subscription.endpoint});await subscription.unsubscribe();}
   await navigator.clearAppBadge?.();
   estado.textContent='Notificaciones desactivadas en este dispositivo.';activar.hidden=false;desactivar.hidden=true;
  } catch(error) {estado.textContent=error.message;}
  finally {desactivar.disabled=false;}
 });
 navigator.serviceWorker.addEventListener('message',event=>{
  if(event.data?.type==='pedido-nuevo')document.querySelector('#avisoPedidoNuevo').hidden=false;
 });
 document.querySelector('#recargarPorPedido').addEventListener('click',()=>window.location.reload());
 try {
  const registro=await registrar();
  if(Notification.permission==='granted' && await registro.pushManager.getSubscription()) await guardar(registro);
 } catch(error) {estado.textContent='No pudimos comprobar los avisos. Podés reactivarlos con el botón.';}
}
