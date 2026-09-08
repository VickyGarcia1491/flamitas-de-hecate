let datosServidor = {usuario: null, productos: [], esencias: {mediana: {}, chica: {}}, pedidos: [], vistos: [], version: 0};
async function api(url, method = 'GET', body) {
 const response = await fetch(url, {method, credentials: 'same-origin', headers: {'Content-Type': 'application/json', 'X-Flamitas': '1'}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
 const data = await response.json().catch(() => ({error: 'El servidor no respondió correctamente.'}));
 if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
 return data;
}
async function cargarDatosServidor() {
 datosServidor = await api('/api/bootstrap');
 if (typeof velas !== 'undefined') velas = structuredClone(datosServidor.productos);
}
let guardandoEstado = false;
async function guardarEstadoServidor(cambios) {
 if (guardandoEstado) throw new Error('Esperá a que termine el guardado anterior.');
 guardandoEstado = true;
 try {
  const data = {productos: datosServidor.productos, esencias: datosServidor.esencias, pedidos: datosServidor.pedidos, vistos: datosServidor.vistos, ...cambios};
  const result = await api('/api/admin/state', 'PUT', {version: datosServidor.version, data});
  datosServidor = {...datosServidor, ...structuredClone(data), version: result.version};
 } catch(error) {
  // Bloquear cambios posteriores evita sobrescribir un estado rechazado o desactualizado.
  document.querySelectorAll('input,button,select,textarea').forEach(el => el.disabled = true);
  throw new Error(error.message + ' Recargá la página antes de continuar.');
 } finally { guardandoEstado = false; }
}
window.addEventListener('unhandledrejection', event => { event.preventDefault(); alert(event.reason?.message || 'No se pudo guardar. Intentá nuevamente.'); });
