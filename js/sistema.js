// El catálogo y el stock se cargan desde PostgreSQL al iniciar la página.
let velas = [];
let carrito = [];
// Lista de esencias disponibles para las latitas medianas.
let esenciasLatitaMediana = [];

esenciasLatitaMediana.push("Bamboo");
esenciasLatitaMediana.push("Manzana y Canela");
esenciasLatitaMediana.push("Mandarina y Té Verde");
esenciasLatitaMediana.push("Bergamota y Verbena");
esenciasLatitaMediana.push("Vainilla");
esenciasLatitaMediana.push("Pino");
esenciasLatitaMediana.push("Sándalo y Cedro");

// Lista de esencias disponibles para las latitas chicas.
let esenciasLatitaChica = [];

esenciasLatitaChica.push("Algas Marinas");
esenciasLatitaChica.push("Sandía");
esenciasLatitaChica.push("Melón y Pepino");
esenciasLatitaChica.push("Lavanda");

// Crea el catálogo inicial de esencias con espacio para detalle.
function obtenerCatalogoEsenciasInicial() {
 return {
  mediana: esenciasLatitaMediana.map(nombre => ({nombre: nombre, detalle: ""})),
  chica: esenciasLatitaChica.map(nombre => ({nombre: nombre, detalle: ""}))
 };
}

// Sincroniza las listas visibles con el catálogo compartido del servidor.
function sincronizarCatalogoEsencias() {
 if (datosServidor.esenciasCatalogo === undefined || datosServidor.esenciasCatalogo.mediana === undefined || datosServidor.esenciasCatalogo.chica === undefined) {
  datosServidor.esenciasCatalogo = obtenerCatalogoEsenciasInicial();
 }

 esenciasLatitaMediana = datosServidor.esenciasCatalogo.mediana.map(esencia => esencia.nombre);
 esenciasLatitaChica = datosServidor.esenciasCatalogo.chica.map(esencia => esencia.nombre);
}

// Devuelve una copia editable del catálogo de esencias.
function obtenerCatalogoEsenciasGuardado() { return structuredClone(datosServidor.esenciasCatalogo); }

// Guarda el catálogo editable de esencias.
async function guardarCatalogoEsencias(catalogo) { await guardarEstadoServidor({esenciasCatalogo: catalogo}); }

function obtenerStockEsenciasGuardado() { return structuredClone(datosServidor.esencias); }
function obtenerStockEsencia(tipo, indice) { return datosServidor.esencias[tipo]?.[indice] ?? 'Consultar'; }
// Devuelve el detalle descriptivo de una esencia si existe.
function obtenerDetalleEsencia(tipo, indice) { return datosServidor.esenciasCatalogo?.[tipo]?.[indice]?.detalle || ""; }
async function guardarProductosVelas() { await guardarEstadoServidor({productos: velas}); }
async function guardarStockVelas() { await guardarProductosVelas(); }
async function guardarStockEsencias(stock) { await guardarEstadoServidor({esencias: stock}); }
async function actualizarStockEsencia(tipo, indice, cantidad) {
 const stock = obtenerStockEsenciasGuardado(); stock[tipo][indice] = cantidad;
 await guardarStockEsencias(stock);
}
