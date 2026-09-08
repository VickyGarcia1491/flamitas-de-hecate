const catalogoOriginal = [
  {
    "id": 1,
    "nombre": "Vela Clásica",
    "descripcion": "Diseño simple. Elegí aroma, color y los detalles que la hacen única",
    "precio": 350,
    "imagen": "vela1.jpeg",
    "stock": 5
  },
  {
    "id": 2,
    "nombre": "Osito Corazón",
    "descripcion": "Diseño delicado que combina ternura y detalle. Perfecta para regalar y decorar",
    "precio": 430,
    "imagen": "vela2.jpeg",
    "stock": 3
  },
  {
    "id": 3,
    "nombre": "Cocoteros",
    "descripcion": "300gr de cera de soja, naranjas, canela y anis estrellado. El aspecto rústicoque viste cualquier sitio del hogar",
    "precio": 700,
    "imagen": "vela3.jpeg",
    "stock": 4
  },
  {
    "id": 4,
    "nombre": "Latita Mediana",
    "descripcion": "80gr de cera de soja. Sus esencias son Bamboo, Manzana y Canela, Mandarina y Té Verde, Bergamota y Verbena, Vainilla, Pino, Sándalo y Cedro.",
    "precio": 280,
    "imagen": "Latita bamboo.jpeg",
    "stock": "Consultar"
  },
  {
    "id": 5,
    "nombre": "Latita Chicas",
    "descripcion": "60gr de cera de soja. Sus esencias son Algas Marinas, Sandia, Melón y Pepino, Lavanda",
    "precio": 240,
    "imagen": "Latita colores 4.jpeg",
    "stock": "Consultar"
  },
  {
    "id": 6,
    "nombre": "Velas de Miel",
    "descripcion": "Envuelve los espacios con una energía cálida. Vienen en par pero puedes consultar por más cantidades",
    "precio": 100,
    "imagen": "Velas de miel.jpeg",
    "stock": 26
  },
  {
    "id": 7,
    "nombre": "Velón de Miel",
    "descripcion": "Diseño tipo colmena, con relieve detallado y natural. 100% miel.",
    "precio": 280,
    "imagen": "Velon de miel - panal.jpeg",
    "stock": 4
  },
  {
    "id": 8,
    "nombre": "Flores Solitarias",
    "descripcion": "Estas hermosas flores para decorar son perfectas cuando el regalo es un detalle simple y delicado",
    "precio": 150,
    "imagen": "Velitas individuales.jpeg",
    "stock": 17
  },
  {
    "id": 9,
    "nombre": "Wax Melts y Hornitos",
    "descripcion": "Transforma cualquier espacio con aromas envolventes. Incluye hornito cerámico y melts aromáticos",
    "precio": 400,
    "imagen": "Wax Melts.jpeg",
    "stock": 10
  },
  {
    "id": 10,
    "nombre": "Boxes de Hécate",
    "descripcion": "Podes personalizar tu Box como más te guste y nosotras la armamos",
    "precio": "Consultar",
    "imagen": "Flamita's box.jpeg",
    "stock": "A definir"
  }
];
let archivoImportar;
const estadoMigracion = document.querySelector('#estado');
function descargarJSON(nombre, data) {
 const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:'application/json'}));
 const enlace = document.createElement('a'); enlace.href = url; enlace.download = nombre; enlace.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
}
document.querySelector('#exportarLocal').addEventListener('click', async () => {
 try {
  const leer = (key,fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  let productos = leer('productosFlamitas', null);
  const hayDatos = ['productosFlamitas','stockFlamitas','stockEsenciasFlamitas','pedidosFlamitas','consultasFlamitas'].some(key => localStorage.getItem(key) !== null);
  if (!hayDatos) throw new Error('No encontramos datos antiguos en esta dirección. Revisá el navegador y la dirección original.');
  const stock = leer('stockFlamitas', {});
  productos = productos || catalogoOriginal.map(p => ({...p, stock: stock[p.id] ?? p.stock}));
  const data = {format:'flamitas-business-v1', productos, esencias:leer('stockEsenciasFlamitas',{mediana:{},chica:{}}), pedidos:leer('pedidosFlamitas',[]), vistos:leer('pedidosVistosFlamitas',[]), consultas:leer('consultasFlamitas',[])};
  descargarJSON('flamitas-datos-antiguos.json',data); estadoMigracion.textContent = 'Exportado. Guardá este archivo en un lugar privado.';
 } catch(error) { estadoMigracion.textContent = error.message; }
});
document.querySelector('#archivo').addEventListener('change', async event => {
 try {
  archivoImportar = null; document.querySelector('#importar').disabled = true;
  const file = event.target.files[0]; if (!file || file.size > 25000000) throw new Error('Elegí un archivo JSON de menos de 25 MB.');
  const data = JSON.parse(await file.text());
  if (data.format !== 'flamitas-business-v1' || !Array.isArray(data.productos) || !Array.isArray(data.pedidos)) throw new Error('Formato de archivo incorrecto.');
  archivoImportar = data;
  document.querySelector('#resumen').textContent = `${data.productos.length} productos\n${data.pedidos.length} pedidos\n${data.consultas?.length || 0} consultas\nLas cuentas antiguas no se importan.`;
  document.querySelector('#importar').disabled = false;
 } catch(error) { estadoMigracion.textContent = error.message; }
});
document.querySelector('#importar').addEventListener('click', async event => {
 if (!archivoImportar || !confirm('¿Importar este catálogo, stock, pedidos y consultas en la base nueva?')) return;
 event.target.disabled = true;
 try { await api('/api/admin/import','POST',archivoImportar); estadoMigracion.textContent = 'Datos importados. Ya podés volver al panel.'; }
 catch(error) { estadoMigracion.textContent = error.message; event.target.disabled = false; }
});
document.querySelector('#respaldo').addEventListener('click', async () => {
 try { descargarJSON('flamitas-respaldo-'+new Date().toISOString().slice(0,10)+'.json',await api('/api/admin/backup')); }
 catch(error) { estadoMigracion.textContent = error.message; }
});
document.querySelector('#consultas').addEventListener('click', async () => {
 try { const data = await api('/api/admin/backup'); document.querySelector('#listaConsultas').textContent = data.consultas.length ? data.consultas.map(c => `${c.fecha}\n${c.nombre} · ${c.email} · ${c.telefono}\n${c.mensaje}`).join('\n\n') : 'Todavía no hay consultas.'; }
 catch(error) { estadoMigracion.textContent = error.message; }
});
