// La página pública ya es visible mientras el servidor se conecta.
let tiendaLista = false;
let conexionEnCurso = false;
const controlesPendientes = [...document.querySelectorAll('button, input[type="submit"]')]
 .filter(control => !control.disabled && control.id !== 'menuToggle');
controlesPendientes.forEach(control => { control.disabled = true; });
// Evita envíos nativos (incluido Enter en el login) antes de instalar los handlers.
document.addEventListener('submit', evento => {
 if (!tiendaLista) { evento.preventDefault(); evento.stopImmediatePropagation(); }
}, true);
const avisoConexion = document.createElement('aside');
avisoConexion.id = 'avisoConexion';
avisoConexion.setAttribute('role', 'status');
avisoConexion.setAttribute('aria-live', 'polite');
const textoConexion = document.createElement('p');
const reintentarConexion = document.createElement('button');
reintentarConexion.type = 'button';
reintentarConexion.textContent = 'Volver a conectar';
reintentarConexion.hidden = true;
avisoConexion.append(textoConexion, reintentarConexion);
document.body.prepend(avisoConexion);

async function conectarTienda() {
 if (conexionEnCurso || tiendaLista) return;
 conexionEnCurso = true;
 reintentarConexion.hidden = true;
 avisoConexion.dataset.estado = 'conectando';
 textoConexion.textContent = 'Estamos conectando la tienda… Podés recorrer Flamitas mientras esperamos.';
 try {
  // Solo repetimos la lectura inicial; nunca una compra, registro o guardado.
  for (let intento = 0; ; intento++) {
   try { await cargarDatosServidor(25000); break; }
   catch (error) {
    if (intento >= 3 || (error.status >= 400 && error.status < 500)) throw error;
    textoConexion.textContent = 'La tienda está tardando un poquito. Seguimos conectando…';
    await new Promise(resolve => setTimeout(resolve, 2000));
   }
  }
 } catch (error) {
  avisoConexion.dataset.estado = 'error';
  textoConexion.textContent = 'No pudimos conectar con la tienda. Revisá tu conexión y volvé a intentar.';
  reintentarConexion.hidden = false;
  conexionEnCurso = false;
  return;
 }
 try {
  controlesPendientes.forEach(control => { control.disabled = false; });
  if (typeof iniciarUsuarios === 'function') iniciarUsuarios();
  if (typeof iniciarAdmin === 'function') iniciarAdmin();
  if (typeof inicioTienda === 'function') inicioTienda();
  if (typeof iniciarMiCuenta === 'function') iniciarMiCuenta();
  if (typeof iniciarContacto === 'function') iniciarContacto();
  tiendaLista = true;
  avisoConexion.remove();
 } catch(error) {
  controlesPendientes.forEach(control => { control.disabled = true; });
  textoConexion.textContent = 'No pudimos preparar esta página. Recargala para volver a intentar.';
 } finally { conexionEnCurso = false; }
}
reintentarConexion.addEventListener('click', conectarTienda);
conectarTienda();

// Permite instalar la web como app en celulares, tablets y computadoras compatibles.
if ('serviceWorker' in navigator) {
 window.addEventListener('load', () => {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
 });
}
