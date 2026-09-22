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


function obtenerStockEsenciasGuardado() { return structuredClone(datosServidor.esencias); }
function indiceEsenciaGeneral(tipo, indice) {
 const nombre = (tipo === 'mediana' ? esenciasLatitaMediana : esenciasLatitaChica)[indice];
 const catalogo = datosServidor.esenciasCatalogo;
 return Array.isArray(catalogo) ? catalogo.findIndex(esencia => esencia.nombre === nombre) : -1;
}
function obtenerStockEsencia(tipo, indice) {
 if (tipo === 'general') return obtenerStockInternoEsenciasGuardado().general[indice] ?? 'Consultar';
 if (datosServidor.esencias.general) return datosServidor.esencias.general[indiceEsenciaGeneral(tipo,indice)] ?? 'Consultar';
 return datosServidor.esencias[tipo]?.[indice] ?? 'Consultar';
}

// Vista editable del stock interno. Leer el panel nunca migra ni guarda datos.
function obtenerCatalogoEsenciasGuardado() {
 const catalogo = datosServidor.esenciasCatalogo;
 if (Array.isArray(catalogo)) return structuredClone(catalogo);
 const grupos = catalogo || {
  mediana: esenciasLatitaMediana.map(nombre => ({nombre, detalle: ''})),
  chica: esenciasLatitaChica.map(nombre => ({nombre, detalle: ''}))
 };
 return structuredClone([...(grupos.mediana || []), ...(grupos.chica || [])]);
}
function obtenerStockInternoEsenciasGuardado() {
 const stock = obtenerStockEsenciasGuardado();
 if (stock.general) return stock;
 // Preservar ambos grupos y todos sus valores; convertir solo al guardar una esencia.
 const catalogo = datosServidor.esenciasCatalogo;
 const medianas = Array.isArray(catalogo) ? catalogo.length : (catalogo?.mediana?.length ?? esenciasLatitaMediana.length);
 stock.general = {};
 for (let i = 0; i < obtenerCatalogoEsenciasGuardado().length; i++) {
  const tipo = i < medianas ? 'mediana' : 'chica';
  const indice = tipo === 'mediana' ? i : i - medianas;
  stock.general[i] = stock[tipo]?.[indice] ?? 'Consultar';
 }
 return stock;
}
async function guardarProductosVelas() { await guardarEstadoServidor({productos: velas}); }
async function guardarStockVelas() { await guardarProductosVelas(); }
async function guardarStockEsencias(stock) { await guardarEstadoServidor({esencias: stock}); }
async function actualizarStockEsencia(tipo, indice, cantidad) {
 const stock = obtenerStockEsenciasGuardado();
 if (stock.general) {
  const general = indiceEsenciaGeneral(tipo,indice);
  if (general < 0) throw new Error('Esta esencia no existe en el catálogo general. No se modificó el stock.');
  stock.general[general] = cantidad;
 } else { stock[tipo][indice] = cantidad; }
 await guardarStockEsencias(stock);
}
