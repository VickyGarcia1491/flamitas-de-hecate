// Recuperación de contraseña: pedir el enlace y elegir una contraseña nueva.
// El token llega en el fragmento (#), nunca viaja al servidor en la URL y se quita
// de la barra de direcciones apenas se lee para que no quede en el historial.
let tokenRecuperacion = document.querySelector('#formRestablecer') ? leerTokenRecuperacion() : '';

function leerTokenRecuperacion() {
 const token = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
 if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
 return /^[a-f0-9]{64}$/.test(token) ? token : '';
}

function iniciarRecuperacion() {
 document.querySelector('#formRecuperar')?.addEventListener('submit', pedirEnlaceRecuperacion);
 const restablecer = document.querySelector('#formRestablecer');
 if (!restablecer) return;
 restablecer.addEventListener('submit', guardarPasswordRecuperada);
 if (!tokenRecuperacion) document.querySelector('#mensajeRestablecer').textContent = 'El enlace no es válido o venció. Pedí uno nuevo.';
}

// La respuesta es siempre la misma, exista o no la cuenta.
async function pedirEnlaceRecuperacion(evento) {
 evento.preventDefault();
 const mensaje = document.querySelector('#mensajeRecuperar');
 const boton = evento.target.querySelector('[type=submit]');
 boton.disabled = true; mensaje.textContent = '';
 try {
  const respuesta = await api('/api/password-reset/request', 'POST', {email: document.querySelector('#emailRecuperar').value});
  mensaje.textContent = respuesta.mensaje;
 } catch (error) { mensaje.textContent = error.message; }
 finally { boton.disabled = false; }
}

async function guardarPasswordRecuperada(evento) {
 evento.preventDefault();
 const mensaje = document.querySelector('#mensajeRestablecer');
 const nueva = document.querySelector('#passwordRestablecer').value;
 mensaje.textContent = '';
 if (!tokenRecuperacion) { mensaje.textContent = 'El enlace no es válido o venció. Pedí uno nuevo.'; return; }
 if (nueva !== document.querySelector('#passwordConfirmarRestablecer').value) { mensaje.textContent = 'Las contraseñas nuevas no coinciden.'; return; }
 const boton = evento.target.querySelector('[type=submit]');
 boton.disabled = true;
 try {
  await api('/api/password-reset/complete', 'POST', {token: tokenRecuperacion, nueva});
  tokenRecuperacion = '';
  evento.target.reset();
  window.location = 'login.html?restablecida=1';
 } catch (error) { mensaje.textContent = error.message; boton.disabled = false; }
}
