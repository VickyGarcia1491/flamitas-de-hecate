// Botón de ojo para mostrar u ocultar contraseñas.
// Archivo propio y sin código en línea: el CSP del servidor solo permite scripts de este origen.
// Se carga después de iniciar.js para que el botón no quede desactivado mientras conecta.

// Crea el ícono SVG: ojo abierto para "mostrar" y ojo tachado para "ocultar".
function crearIconoPassword(visible) {
 const ns = 'http://www.w3.org/2000/svg';
 const svg = document.createElementNS(ns, 'svg');
 svg.setAttribute('viewBox', '0 0 24 24');
 svg.setAttribute('aria-hidden', 'true');
 svg.setAttribute('focusable', 'false');
 const trazos = ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'];
 if (visible) trazos.push('M4 4l16 16');
 for (const d of trazos) {
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d);
  svg.append(path);
 }
 return svg;
}

// Refleja en el botón si la contraseña está visible.
function actualizarBotonPassword(boton, visible) {
 boton.setAttribute('aria-pressed', String(visible));
 boton.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
 boton.title = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
 boton.replaceChildren(crearIconoPassword(visible));
}

// Alterna el tipo del campo conservando foco y posición del cursor.
function alternarPassword(campo, boton) {
 const inicio = campo.selectionStart, fin = campo.selectionEnd, direccion = campo.selectionDirection;
 const visible = campo.type === 'password';
 campo.type = visible ? 'text' : 'password';
 actualizarBotonPassword(boton, visible);
 // Con mouse o toque el campo nunca pierde el foco; con teclado el foco queda en el botón.
 if (boton.dataset.campoEnfocado === 'true') campo.focus();
 boton.dataset.campoEnfocado = '';
 if (inicio !== null && fin !== null) {
  try { campo.setSelectionRange(inicio, fin, direccion || 'none'); } catch {}
 }
}

// Agrega el botón a cada campo de contraseña que todavía no lo tenga.
function prepararMostrarPassword(raiz = document) {
 for (const campo of raiz.querySelectorAll('input[type="password"]')) {
  if (campo.dataset.mostrarPassword) continue;
  campo.dataset.mostrarPassword = 'listo';
  const contenedor = document.createElement('span');
  contenedor.className = 'campo-password';
  campo.before(contenedor);
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'btn-mostrar-password';
  if (campo.id) boton.setAttribute('aria-controls', campo.id);
  actualizarBotonPassword(boton, false);
  contenedor.append(campo, boton);
  // Evita que el clic le quite el foco al campo mientras se escribe.
  boton.addEventListener('mousedown', evento => {
   boton.dataset.campoEnfocado = String(document.activeElement === campo);
   evento.preventDefault();
  });
  boton.addEventListener('click', () => alternarPassword(campo, boton));
  // Al vaciar el formulario la contraseña vuelve a quedar oculta.
  campo.form?.addEventListener('reset', () => {
   campo.type = 'password';
   actualizarBotonPassword(boton, false);
  });
 }
}

prepararMostrarPassword();
