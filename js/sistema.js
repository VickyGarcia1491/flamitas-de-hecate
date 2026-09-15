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
function obtenerStockEsencia(tipo, indice) { return datosServidor.esencias[tipo]?.[indice] ?? 'Consultar'; }
async function guardarProductosVelas() { await guardarEstadoServidor({productos: velas}); }
async function guardarStockVelas() { await guardarProductosVelas(); }
async function guardarStockEsencias(stock) { await guardarEstadoServidor({esencias: stock}); }
async function actualizarStockEsencia(tipo, indice, cantidad) {
 const stock = obtenerStockEsenciasGuardado(); stock[tipo][indice] = cantidad;
 await guardarStockEsencias(stock);
}
