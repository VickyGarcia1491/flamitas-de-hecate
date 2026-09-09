
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
 prepararBotonesMostrarPassword();
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
    let menuLinks = document.querySelector(".menu .menu-links");
    let menu = document.querySelector(".menu nav");

    if (menuLinks !== null) {
        menuLinks.appendChild(saludo);
    } else if (menu !== null) {
        menu.appendChild(saludo);
    }
}

// Agrega un botón de ojo para mostrar u ocultar la contraseña al escribir.
function prepararBotonesMostrarPassword() {
    let campos = document.querySelectorAll('input[type="password"]');

    for (let i = 0; i < campos.length; i++) {
        let campo = campos[i];
        if (campo.parentElement.classList.contains("password-wrapper")) continue;

        let wrapper = document.createElement("div");
        wrapper.className = "password-wrapper";
        campo.parentNode.insertBefore(wrapper, campo);
        wrapper.appendChild(campo);

        let boton = document.createElement("button");
        boton.type = "button";
        boton.className = "password-toggle";
        boton.setAttribute("aria-label", "Mostrar contraseña");
        boton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        boton.addEventListener("click", function () {
            let mostrar = campo.type === "password";
            campo.type = mostrar ? "text" : "password";
            boton.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
            boton.classList.toggle("active", mostrar);
        });
        wrapper.appendChild(boton);
    }
}

// Usa solo el primer nombre para que el saludo no ocupe demasiado espacio.
function obtenerPrimerNombreUsuario(nombreCompleto) {
    let partes = String(nombreCompleto).trim().split(" ");
    return partes[0];
}
