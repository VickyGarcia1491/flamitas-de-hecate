// Base compartida de productos y esencias. El servidor guarda estos datos en PostgreSQL
// para que ambas administradoras vean siempre el mismo stock, catálogo y pedidos.
let velas = [];
let carrito = [];
let esenciasLatitaMediana = [];
let esenciasLatitaChica = [];

const esenciasIniciales = [
 "Bamboo",
 "Manzana y Canela",
 "Mandarina y Té Verde",
 "Bergamota y Verbena",
 "Vainilla",
 "Pino",
 "Sándalo y Cedro",
 "Algas Marinas",
 "Sandía",
 "Melón y Pepino",
 "Lavanda"
];

// Crea el catálogo inicial de esencias con espacio para detalle.
function obtenerCatalogoEsenciasInicial() {
 return esenciasIniciales.map(nombre => ({nombre: nombre, detalle: ""}));
}

// Normaliza catálogos antiguos separados por tamaño a una sola lista editable.
function normalizarCatalogoEsencias(catalogo) {
 if (Array.isArray(catalogo)) {
  return catalogo.map(esencia => ({nombre: esencia.nombre, detalle: esencia.detalle || ""}));
 }

 let unicas = [];
 let nombres = new Set();

 for (let grupo of [catalogo?.mediana || [], catalogo?.chica || []]) {
  for (let esencia of grupo) {
   if (!nombres.has(esencia.nombre)) {
    nombres.add(esencia.nombre);
    unicas.push({nombre: esencia.nombre, detalle: esencia.detalle || ""});
   }
  }
 }

 return unicas.length > 0 ? unicas : obtenerCatalogoEsenciasInicial();
}

// Sincroniza las listas visibles de la tienda con el catálogo único del servidor.
function sincronizarCatalogoEsencias() {
 let catalogoAnterior = datosServidor.esenciasCatalogo;
 datosServidor.esenciasCatalogo = normalizarCatalogoEsencias(catalogoAnterior);
 datosServidor.esencias = normalizarStockEsencias(catalogoAnterior, datosServidor.esencias);

 esenciasLatitaMediana = datosServidor.esenciasCatalogo.map(esencia => esencia.nombre);
 esenciasLatitaChica = datosServidor.esenciasCatalogo.map(esencia => esencia.nombre);
}

// Devuelve una copia editable del catálogo de esencias.
function obtenerCatalogoEsenciasGuardado() { return structuredClone(datosServidor.esenciasCatalogo); }

// Guarda el catálogo editable de esencias.
async function guardarCatalogoEsencias(catalogo) { await guardarEstadoServidor({esenciasCatalogo: catalogo}); }

// Convierte stocks antiguos separados por tamaño a un stock único por esencia.
function normalizarStockEsencias(catalogoAnterior, stockAnterior) {
 if (stockAnterior?.general !== undefined) {
  return {general: structuredClone(stockAnterior.general)};
 }

 let stockGeneral = {};
 let catalogoUnico = datosServidor.esenciasCatalogo;
 let catalogoViejo = Array.isArray(catalogoAnterior) ? {mediana: catalogoAnterior, chica: []} : catalogoAnterior || {};

 for (let i = 0; i < catalogoUnico.length; i++) {
  let nombre = catalogoUnico[i].nombre;
  let valor = buscarStockViejoPorNombre(nombre, catalogoViejo, stockAnterior);
  if (valor !== undefined) stockGeneral[i] = valor;
 }

 return {general: stockGeneral};
}

// Busca el valor anterior de una esencia cuando venía guardada por tipo de latita.
function buscarStockViejoPorNombre(nombre, catalogoViejo, stockAnterior) {
 for (let tipo of ["mediana", "chica"]) {
  let grupo = catalogoViejo?.[tipo] || [];
  for (let i = 0; i < grupo.length; i++) {
   if (grupo[i].nombre === nombre && stockAnterior?.[tipo]?.[i] !== undefined) return stockAnterior[tipo][i];
  }
 }
 return undefined;
}

function obtenerStockEsenciasGuardado() { return structuredClone(datosServidor.esencias); }
function obtenerStockEsencia(tipo, indice) { return datosServidor.esencias.general?.[indice] ?? 'Consultar'; }
// Devuelve el detalle descriptivo de una esencia si existe.
function obtenerDetalleEsencia(tipo, indice) { return datosServidor.esenciasCatalogo?.[indice]?.detalle || ""; }
// Escapa textos guardados antes de mostrarlos dentro de HTML dinámico.
function prepararTextoParaHTML(texto) {
 return String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
async function guardarProductosVelas() { await guardarEstadoServidor({productos: velas}); }
async function guardarStockVelas() { await guardarProductosVelas(); }
async function guardarStockEsencias(stock) { await guardarEstadoServidor({esencias: stock}); }
async function actualizarStockEsencia(tipo, indice, cantidad) {
 const stock = obtenerStockEsenciasGuardado(); stock.general[indice] = cantidad;
 await guardarStockEsencias(stock);
}
