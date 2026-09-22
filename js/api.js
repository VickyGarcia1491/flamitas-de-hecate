let datosServidor = {usuario: null, productos: [], esencias: {mediana: {}, chica: {}}, pedidos: [], vistos: [], version: 0};
async function api(url, method = 'GET', body, timeoutMs = 75000) {
 const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), timeoutMs);
 try {
 const response = await fetch(url, {method, signal: controller.signal, credentials: 'same-origin', headers: {'Content-Type': 'application/json', 'X-Flamitas': '1'}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
 const data = await response.json().catch(() => {
  const mensajes = {401: 'La sesión venció o el sitio requiere acceso. Volvé a ingresar.', 403: 'El servidor no autorizó este cambio.', 413: 'El cambio supera el tamaño que admite el servidor.', 429: 'Hay demasiadas solicitudes. Esperá un momento antes de intentar otra vez.'};
  throw Object.assign(new Error(mensajes[response.status] || 'La tienda todavía no está disponible. Intentá nuevamente en un momento.'), {status: response.status});
 });
 if (!response.ok) throw Object.assign(new Error(data.error || 'No se pudo completar la operación.'), {status: response.status});
 return data;
 } catch(error) {
  if (controller.signal.aborted) throw new Error('El servidor tardó demasiado. No pudimos confirmar si el cambio se guardó.');
  throw error;
 } finally { clearTimeout(timeout); }
}
async function cargarDatosServidor(timeoutMs) {
 const datos = await api('/api/bootstrap', 'GET', undefined, timeoutMs);
 if (!datos || !Array.isArray(datos.productos) || !Object.hasOwn(datos, 'usuario')) throw new Error('La tienda todavía no está disponible.');
 datosServidor = datos;
 if (typeof velas !== 'undefined') velas = structuredClone(datosServidor.productos);
}
let colaGuardados = Promise.resolve();
let estadoNecesitaRevision = false;
let ultimoErrorGuardado = '';
function guardarEstadoServidor(cambios) {
 // Capturar la intención antes de esperar, sin compartir objetos mutables con el formulario.
 const copia = structuredClone(cambios);
 const base = structuredClone(datosServidor);
 const operacion = colaGuardados.then(async () => {
 if (estadoNecesitaRevision) throw new Error(ultimoErrorGuardado + ' Revisá los datos del servidor con el botón Recargar panel antes de guardar de nuevo.');
 try {
  // No mezclar dos ediciones distintas de la misma colección basadas en datos viejos.
  for (const key of Object.keys(copia)) {
   if (JSON.stringify(base[key]) !== JSON.stringify(datosServidor[key])) throw new Error('Estos datos cambiaron durante otro guardado.');
  }
  const data = {productos: datosServidor.productos, esencias: datosServidor.esencias, esenciasCatalogo: datosServidor.esenciasCatalogo, pedidos: datosServidor.pedidos, vistos: datosServidor.vistos, ...copia};
  // El servidor combina estos campos con el estado actual dentro de la transacción.
  // Marcar leído o cambiar un pedido no debe volver a subir las fotos del catálogo.
  const result = await api('/api/admin/state', 'PUT', {version: datosServidor.version, data: copia});
  datosServidor = {...datosServidor, ...structuredClone(data), version: result.version};
  ultimoErrorGuardado = '';
  document.querySelector('#avisoGuardadoServidor')?.remove();
 } catch(error) {
  ultimoErrorGuardado = error.message;
  estadoNecesitaRevision = ![400, 401, 403, 413, 422, 429].includes(error.status);
  mostrarAvisoGuardado(error.message);
  throw new Error(error.message + (estadoNecesitaRevision ? ' Revisá los datos guardados antes de repetir el cambio.' : ' El servidor rechazó el cambio.'));
 }
 });
 colaGuardados = operacion.catch(() => {});
 return operacion;
}
function mostrarAvisoGuardado(mensaje) {
 let aviso = document.querySelector('#avisoGuardadoServidor');
 if (!aviso) {
  aviso = document.createElement('div'); aviso.id = 'avisoGuardadoServidor'; aviso.setAttribute('role','alert');
  document.body.prepend(aviso);
 }
 aviso.replaceChildren();
 const texto = document.createElement('p');
 texto.textContent = mensaje + ' El formulario sigue visible. Antes de recargar, anotá los datos de la venta; después comprobá si ya figura en Pedidos para no duplicarla.';
 const boton = document.createElement('button'); boton.type='button'; boton.textContent='Recargar panel';
 boton.addEventListener('click',()=>window.location.reload());
 aviso.append(texto,boton);
}
window.addEventListener('unhandledrejection', event => { event.preventDefault(); alert(event.reason?.message || 'No se pudo guardar. Intentá nuevamente.'); });
