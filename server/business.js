import { fail, validateTree, text } from './security.js';
const aromasIniciales = ['Bamboo', 'Manzana y Canela', 'Mandarina y Té Verde', 'Bergamota y Verbena', 'Vainilla', 'Pino', 'Sándalo y Cedro', 'Algas Marinas', 'Sandía', 'Melón y Pepino', 'Lavanda'];
export const defaultEssenceCatalog = () => aromasIniciales.map(nombre => ({nombre, detalle: ''}));
export const emptyState = products => ({ productos: products, esencias: {general: {}}, esenciasCatalogo: defaultEssenceCatalog(), pedidos: [], vistos: [] });
const money = n => Math.round(n * 100) / 100;
function getEssenceCatalog(state) {
  if (Array.isArray(state.esenciasCatalogo)) return state.esenciasCatalogo;
  const catalog = state.esenciasCatalogo || {};
  const names = new Set();
  const list = [];
  for (const group of [catalog.mediana || [], catalog.chica || []]) for (const item of group) {
    if (!names.has(item.nombre)) {
      names.add(item.nombre);
      list.push({nombre: item.nombre, detalle: item.detalle || ''});
    }
  }
  return list.length > 0 ? list : defaultEssenceCatalog();
}
function getEssenceStock(state) {
  if (state.esencias?.general) return state.esencias.general;
  const stock = {};
  const catalog = getEssenceCatalog(state);
  const oldCatalog = state.esenciasCatalogo || {};
  for (let i = 0; i < catalog.length; i++) {
    for (const type of ['mediana', 'chica']) {
      const oldIndex = (oldCatalog[type] || []).findIndex(item => item.nombre === catalog[i].nombre);
      if (oldIndex >= 0 && state.esencias?.[type]?.[oldIndex] !== undefined) stock[i] = state.esencias[type][oldIndex];
    }
  }
  return stock;
}
function ensureEssenceStock(state) {
  if (!state.esencias.general) state.esencias = {...state.esencias, general: getEssenceStock(state)};
  return state.esencias.general;
}
export function validateState(state) {
  validateTree(state);
  if (!state || !Array.isArray(state.productos) || !Array.isArray(state.pedidos) || !Array.isArray(state.vistos) || !state.esencias) fail('Formato de datos inválido.');
  for (const list of [state.productos, state.pedidos]) {
    if (new Set(list.map(x => x.id)).size !== list.length) fail('Hay identificadores repetidos.');
    for (const item of list) if (!Number.isSafeInteger(item.id) || item.id < 1) fail('Identificador inválido.');
  }
  for (const product of state.productos) {
    text(product.nombre); text(product.descripcion, 3000, false);
    for (const key of ['precio', 'stock']) {
      if (typeof product[key] === 'number') {
        if (!Number.isFinite(product[key]) || product[key] < 0 || (key === 'stock' && !Number.isInteger(product[key]))) fail('Precio o stock inválido.');
      } else text(product[key], 100);
    }
  }
  const catalog = getEssenceCatalog(state);
  if (!Array.isArray(catalog)) fail('Catálogo de esencias inválido.');
  for (const item of catalog) {
    text(item.nombre, 120);
    text(item.detalle || '', 1000, false);
  }
  for (const [index, count] of Object.entries(getEssenceStock(state))) {
    if (!catalog[index] || !(typeof count === 'string' || Number.isInteger(count) && count >= 0)) fail('Stock de esencia inválido.');
  }
  for (const order of state.pedidos) {
    if (!order.cliente || !order.entrega || !Array.isArray(order.productos) || !Number.isFinite(order.total) || order.total < 0) fail('Pedido inválido.');
    for (const line of order.productos) if (!Number.isInteger(line.cantidad) || line.cantidad < 1) fail('Cantidad inválida.');
  }
}
export function checkout(state, body, user, id) {
  validateTree(body);
  const aromas = getEssenceCatalog(state).map(item => item.nombre);
  if (!Array.isArray(body.productos) || body.productos.length < 1 || body.productos.length > 100) fail('El carrito está vacío o es demasiado grande.');
  const delivery = body.entrega;
  if (!delivery || !['Retiro', 'Envío', 'Retiro en local', 'Retiro en persona'].includes(delivery.metodo)) fail('Elegí una forma de entrega.');
  if (delivery.metodo === 'Envío') for (const field of ['departamento', 'direccion', 'ciudad', 'codigoPostal']) text(delivery[field]);
  const lines = body.productos.map(item => {
    if (!Number.isInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > 1000) fail('Cantidad inválida.');
    const variant = item.tipoLatita;
    const product = state.productos.find(p => p.id === (variant ? (variant === 'mediana' ? 4 : 5) : item.id));
    if (!product || typeof product.precio !== 'number') fail('Este producto necesita cotización. Contactanos antes de pedirlo.');
    let nombre = product.nombre;
    let stockOwner = product, stockKey = 'stock';
    if (variant) {
      if (!Number.isInteger(item.indiceEsencia) || !aromas[item.indiceEsencia]) fail('Esencia inválida.');
      nombre = `Latita ${variant === 'mediana' ? 'Mediana' : 'Chica'} - ${aromas[item.indiceEsencia]}`;
      stockOwner = ensureEssenceStock(state); stockKey = item.indiceEsencia;
    } else if ([4, 5].includes(product.id)) fail('Elegí la esencia de la latita.');
    if (typeof stockOwner[stockKey] === 'number') {
      if (stockOwner[stockKey] < item.cantidad) fail(`No hay stock suficiente de ${nombre}.`, 409);
      stockOwner[stockKey] -= item.cantidad;
    } else if (stockOwner[stockKey] === 'No' || stockOwner[stockKey] === '0') {
      fail(`No hay stock suficiente de ${nombre}.`, 409);
    }
    return {id: product.id, nombre, precio: product.precio, cantidad: item.cantidad, subtotal: money(product.precio * item.cantidad), ...(variant ? {tipoLatita: variant, indiceEsencia: item.indiceEsencia} : {})};
  });
  const subtotal = money(lines.reduce((sum, line) => sum + line.subtotal, 0));
  const medio = body.pago?.medio || '';
  if (!['', 'Efectivo', 'Transferencia bancaria', 'Mercado Pago'].includes(medio)) fail('Medio de pago inválido.');
  // Mismo redondeo a pesos que en la venta manual del administrador.
  const ajuste = medio === 'Mercado Pago' ? Math.round(subtotal * 0.10) : 0;
  const total = money(subtotal + ajuste);
  const now = new Date();
  const order = {id, fecha: now.toLocaleString('es-UY', {timeZone: 'America/Montevideo'}), fechaISO: now.toLocaleDateString('en-CA', {timeZone: 'America/Montevideo'}), estado: 'Nuevo', origen: 'Web', cargadoPor: {nombre: user.nombre, email: user.email, rol: user.rol}, cliente: {nombre: user.nombre, email: user.email, telefono: user.telefono}, productos: lines, total, entrega: delivery, pago: {medio, estado: 'Pendiente', subtotal, ajuste, total}};
  state.pedidos.push(order);
  return order;
}
