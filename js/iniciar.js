window.addEventListener('load', async () => {
 try {
  await cargarDatosServidor();
  if (typeof iniciarUsuarios === 'function') iniciarUsuarios();
  if (typeof iniciarAdmin === 'function') iniciarAdmin();
  if (typeof inicioTienda === 'function') inicioTienda();
  if (typeof iniciarMiCuenta === 'function') iniciarMiCuenta();
  if (typeof iniciarContacto === 'function') iniciarContacto();
 } catch(error) {
  const aviso = document.createElement('p'); aviso.setAttribute('role','alert'); aviso.textContent = 'No pudimos conectar con la tienda. Recargá la página para reintentar. ' + error.message;
  document.body.prepend(aviso);
 }
});

// Permite instalar la web como app en celulares, tablets y computadoras compatibles.
if ('serviceWorker' in navigator) {
 window.addEventListener('load', () => {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
 });
}
