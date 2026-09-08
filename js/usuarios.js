
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
  const usuario = await api(registro ? '/api/register' : '/api/login', 'POST', datos);
  window.location = usuario.rol === 'admin' ? 'admin.html' : 'tienda.html';
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
    let usuario = obtenerUsuarioActivo();

    if (document.querySelector("#nombreUsuario") !== null && usuario !== null) {
        document.querySelector("#nombreUsuario").textContent = usuario.nombre;
    }

    if (document.querySelector("#linkAdmin") !== null) {
        if (usuario === null || usuario.rol !== "admin") {
            document.querySelector("#linkAdmin").style.display = "none";
        }
    }

    if (document.querySelector("#linkContacto") !== null) {
        if (usuario !== null && usuario.rol === "admin") {
            document.querySelector("#linkContacto").style.display = "none";
        }
    }

    if (document.querySelector("#linkMiCuenta") !== null) {
        if (usuario !== null && usuario.rol === "admin") {
            document.querySelector("#linkMiCuenta").style.display = "none";
        }
    }
}
