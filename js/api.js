// Escapar texto antes de insertarlo en HTML o atributos.
function escaparHTML(value) {
 return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
let datosServidor = {usuario: null, productos: [], esencias: {mediana: {}, chica: {}}, pedidos: [], vistos: [], version: 0};
async function api(url, method = 'GET', body, timeoutMs = 75000) {
 const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), timeoutMs);
 try {
 const response = await fetch(url, {method, signal: controller.signal, credentials: 'same-origin', headers: {'Content-Type': 'application/json', 'X-Flamitas': '1'}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
 const data = await response.json().catch(() => {
  const mensajes = {400: 'El servicio rechazó la solicitud (HTTP 400). No se pudo confirmar el guardado. Si persiste, compartí este código con soporte.', 404: 'La versión del servidor todavía no admite este cambio (HTTP 404). Falta actualizar el servidor.', 401: 'La sesión venció o el sitio requiere acceso. Volvé a ingresar.', 403: 'El servidor no autorizó este cambio.', 413: 'El cambio supera el tamaño que admite el servidor.', 429: 'Hay demasiadas solicitudes. Esperá un momento antes de intentar otra vez.'};
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
function enviarCambiosEstado(data) {
 const body = {version: datosServidor.version, data: {...data}};
 let url = '/api/admin/state';
 if (Array.isArray(data.productos)) {
  const previous = new Map(datosServidor.productos.map(p=>[p.id,p]));
  const ids = new Set(data.productos.map(p=>p.id));
  const upsert = [];
  for (const product of data.productos) {
   const old = previous.get(product.id);
   const change = {id: product.id};
   for (const key of Object.keys(product)) if (!old || JSON.stringify(product[key]) !== JSON.stringify(old[key])) change[key]=product[key];
   if (!old || Object.keys(change).length>1) upsert.push(change);
  }
  body.productChanges = {upsert, remove: [...previous.keys()].filter(id=>!ids.has(id))};
  delete body.data.productos;
  // Un servidor viejo responde 404: nunca aparentar que guardó cambios que ignoró.
  url += '/changes';
 }
 return api(url, 'PUT', body);
}
function guardarEstadoServidor(cambios) {
 // Capturar la intención antes de esperar, sin compartir objetos mutables con el formulario.
 const calcular = typeof cambios === 'function' ? cambios : null;
 const copia = calcular ? null : structuredClone(cambios);
 // No copiar fotos e historial completos para una edición de otro campo.
 const base = calcular ? null : Object.fromEntries(Object.keys(copia).map(key => [key, JSON.stringify(datosServidor[key])]));
 const operacion = colaGuardados.then(async () => {
 if (estadoNecesitaRevision) throw new Error(ultimoErrorGuardado + ' Revisá los datos del servidor con el botón Recargar panel antes de guardar de nuevo.');
 try {
  // No mezclar dos ediciones distintas de la misma colección basadas en datos viejos.
  for (const key of Object.keys(copia || {})) {
   if (base[key] !== JSON.stringify(datosServidor[key])) throw Object.assign(new Error('Este dato cambió mientras esperabas. Revisá su valor actual antes de editarlo.'), {sinEnvio: true});
  }
  let data = calcular ? structuredClone(calcular(datosServidor)) : copia;
  // El servidor combina estos campos con el estado actual dentro de la transacción.
  // Marcar leído o cambiar un pedido no debe volver a subir las fotos del catálogo.
  let result;
  try { result = await enviarCambiosEstado(data); }
  catch (error) {
   // Un 409 confirma que no se guardó. Solo las operaciones por intención pueden
   // recalcularse sobre la versión nueva, y deben detectar cambios en el mismo dato.
   if (error.status !== 409 || !calcular) throw error;
   await cargarDatosServidor();
   data = structuredClone(calcular(datosServidor));
   result = await enviarCambiosEstado(data);
  }
  datosServidor = {...datosServidor, ...data, version: result.version};
  if (result.productos) {
   datosServidor.productos = result.productos;
   datosServidor.esencias = result.esencias;
   if (typeof velas !== 'undefined') velas = structuredClone(result.productos);
   if (typeof actualizarVistaProductos === 'function') actualizarVistaProductos();
  }
  ultimoErrorGuardado = '';
  document.querySelector('#avisoGuardadoServidor')?.remove();
 } catch(error) {
  ultimoErrorGuardado = error.message;
  estadoNecesitaRevision = !error.sinEnvio && ![400, 401, 403, 413, 422, 429].includes(error.status);
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
 texto.textContent = mensaje + ' Tus campos siguen visibles. Si tenés una venta sin confirmar, conservá sus datos y comprobá el historial antes de repetirla.';
 const boton = document.createElement('button'); boton.type='button'; boton.textContent='Recargar panel';
 boton.addEventListener('click',()=>window.location.reload());
 aviso.append(texto,boton);
}
window.addEventListener('unhandledrejection', event => { event.preventDefault(); alert(event.reason?.message || 'No se pudo guardar. Intentá nuevamente.'); });

// Confirmaciones breves sin interrumpir la compra. Los errores conservan sus avisos persistentes.
let temporizadorConfirmacion;
function mostrarConfirmacion(texto) {
 let aviso = document.querySelector('#confirmacionCompra');
 if (!aviso) { aviso = document.createElement('div'); aviso.id='confirmacionCompra'; aviso.setAttribute('role','status'); aviso.setAttribute('aria-live','polite'); document.body.append(aviso); }
 aviso.textContent=texto; aviso.hidden=false; clearTimeout(temporizadorConfirmacion);
 temporizadorConfirmacion=setTimeout(()=>{aviso.hidden=true;},5000);
}
