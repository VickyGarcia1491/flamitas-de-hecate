
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

    mostrarSaludoUsuario(usuario);

    if (document.querySelector("#linkAdmin") !== null) {
        if (usuario === null || usuario.rol !== "admin") {
            document.querySelector("#linkAdmin").style.display = "none";
        }
    }

    if (document.querySelector("#linkIngresar") !== null) {
        if (usuario !== null) {
            document.querySelector("#linkIngresar").style.display = "none";
        }
    }

    ocultarLinksLoginSiHayUsuario(usuario);

    if (document.querySelector("#linkContacto") !== null) {
        if (usuario !== null && usuario.rol === "admin") {
            document.querySelector("#linkContacto").style.display = "none";
        }
    }

    if (document.querySelector("#linkMiCuenta") !== null) {
        if (usuario === null || usuario.rol === "admin") {
            document.querySelector("#linkMiCuenta").style.display = "none";
        }
    }

    if (document.querySelector("#btnCerrarSesion") !== null) {
        if (usuario === null) {
            document.querySelector("#btnCerrarSesion").style.display = "none";
        }
    }
}

// Oculta links de ingreso sin id en páginas públicas cuando ya hay sesión.
function ocultarLinksLoginSiHayUsuario(usuario) {
    let linksLogin = document.querySelectorAll('.menu a[href="login.html"]');

    for (let i = 0; i < linksLogin.length; i++) {
        if (usuario !== null) {
            linksLogin[i].style.display = "none";
        }
    }
}

// Muestra un saludo breve para la persona que inició sesión.
function mostrarSaludoUsuario(usuario) {
    let saludo = document.querySelector("#saludoUsuarioMenu");

    if (usuario === null) {
        if (saludo !== null) {
            saludo.remove();
        }
    } else {
        if (saludo === null) {
            saludo = document.createElement("span");
            saludo.id = "saludoUsuarioMenu";
            saludo.className = "saludo-menu";
            ubicarSaludoUsuario(saludo);
        }

        saludo.textContent = "Hola, " + obtenerPrimerNombreUsuario(usuario.nombre);
    }
}

// Ubica el saludo junto a las acciones de cada menú.
function ubicarSaludoUsuario(saludo) {
    let accionesAdmin = document.querySelector(".admin-menu-acciones");
    let menu = document.querySelector(".menu nav");

    if (accionesAdmin !== null) {
        accionesAdmin.prepend(saludo);
    } else if (menu !== null) {
        menu.appendChild(saludo);
    }
}

// Usa solo el primer nombre para que el saludo no ocupe demasiado espacio.
function obtenerPrimerNombreUsuario(nombreCompleto) {
    let partes = String(nombreCompleto).trim().split(" ");
    return partes[0];
}
