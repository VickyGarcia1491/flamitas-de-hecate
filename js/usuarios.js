
function obtenerUsuarioActivo() { return datosServidor.usuario; }
function protegerPagina() { if (!obtenerUsuarioActivo()) { window.location = 'login.html'; return false; } return true; }
async function cerrarSesion() { await api('/api/logout', 'POST', {}); window.location = 'login.html'; }
async function enviarAcceso(evento, registro) {
 evento.preventDefault();
 const suffix = registro ? 'Registro' : 'Login';
 const mensaje = document.querySelector('#mensaje' + suffix);
 const boton = evento.target.querySelector('[type=submit]'); boton.disabled = true;
 try {
  const datos = {email: document.querySelector('#email'+suffix).value, password: document.querySelector('#password'+suffix).value};
  if (registro) { datos.nombre = document.querySelector('#nombreRegistro').value; datos.telefono = document.querySelector('#telefonoRegistro').value; }
  await api(registro ? '/api/register' : '/api/login', 'POST', datos);
  window.location = 'index.html';
 } catch(error) { mensaje.textContent = error.message; } finally { boton.disabled = false; }
}
function iniciarUsuarios() {
 document.querySelector('#formRegistro')?.addEventListener('submit', e => enviarAcceso(e,true));
 document.querySelector('#formLogin')?.addEventListener('submit', e => enviarAcceso(e,false));
 document.querySelector('#btnCerrarSesion')?.addEventListener('click', cerrarSesion);
 mostrarUsuarioEnMenu();
}
// Muestra datos del usuario en el menú y ajusta links según el rol.
function mostrarUsuarioEnMenu() {
 // Netlify puede convertir enlaces HTML en rutas sin extensión.
 document.querySelectorAll("a[href]").forEach(a => {
  const match=/^(?:\.\/|\/)?(login|admin|mi-cuenta)(?:\.html)?\/?$/.exec(a.getAttribute("href"));
  if(match)a.setAttribute("href",match[1]+".html");
 });
 const usuario = obtenerUsuarioActivo();
 const visible = (selector, mostrar) => document.querySelectorAll(selector).forEach(elemento => {
  elemento.hidden = !mostrar;
  if (elemento.parentElement?.tagName === 'LI') elemento.parentElement.hidden = !mostrar;
 });
 visible('a[href="login.html"]', !usuario);
 visible('a[href="admin.html"]', usuario?.rol === 'admin');
 visible('a[href="mi-cuenta.html"]', !!usuario && usuario.rol !== 'admin');
 visible('#btnCerrarSesion', !!usuario);
 visible('#linkContacto', usuario?.rol !== 'admin');
 const nombre = document.querySelector('#nombreUsuario');
 if (nombre) nombre.textContent = usuario?.nombre || '';
 // Inicio y contacto también ofrecen un destino útil al usuario que ya ingresó.
 const menu = document.querySelector('.menu-links');
 const destino = usuario?.rol === 'admin' ? 'admin.html' : 'mi-cuenta.html';
 if (usuario && menu && !menu.querySelector('a[href="' + destino + '"]')) {
  const item = document.createElement('li');
  const enlace = document.createElement('a');
  enlace.href = destino; enlace.textContent = usuario.rol === 'admin' ? 'Admin' : 'Mi cuenta';
  item.append(enlace); menu.append(item);
 }
}
