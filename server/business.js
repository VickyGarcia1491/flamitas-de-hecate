import { fail, validateTree, text } from './security.js';
export const emptyState = products => ({ productos: products, esencias: {mediana: {}, chica: {}}, pedidos: [], vistos: [] });
const aromas = { mediana: ['Bamboo', 'Manzana y Canela', 'Mandarina y Té Verde', 'Bergamota y Verbena', 'Vainilla', 'Pino', 'Sándalo y Cedro'], chica: ['Algas Marinas', 'Sandía', 'Melón y Pepino', 'Lavanda'] };
const money = n => Math.round(n * 100) / 100;
export function validateState(state) {
  validateTree(state);
  if (!state || !Array.isArray(state.productos) || !Array.isArray(state.pedidos) || !Array.isArray(state.vistos)) fail('Formato de datos inválido.');
  const mapa = valor => valor && typeof valor === 'object' && !Array.isArray(valor);
  if (!mapa(state.esencias) || !(mapa(state.esencias.general) || mapa(state.esencias.mediana) && mapa(state.esencias.chica))) fail('Formato de stock de esencias inválido.');
  if (state.esenciasCatalogo !== undefined) {
    if (!Array.isArray(state.esenciasCatalogo) && !mapa(state.esenciasCatalogo)) fail('Catálogo de esencias inválido.');
    const grupos = Array.isArray(state.esenciasCatalogo) ? [state.esenciasCatalogo] : [state.esenciasCatalogo.mediana, state.esenciasCatalogo.chica];
    for (const grupo of grupos) {
      if (!Array.isArray(grupo)) fail('Catálogo de esencias inválido.');
      for (const item of grupo) { if (!item || typeof item !== 'object') fail('Esencia inválida.'); text(item.nombre,120); text(typeof item.detalle === 'string' ? item.detalle.replace(/\r?\n/g, ' ') : item.detalle || '',1000,false); }
    }
  }
  for (const list of [state.productos, state.pedidos]) {
    if (new Set(list.map(x => x?.id)).size !== list.length) fail('Hay identificadores repetidos.');
    for (const item of list) if (!item || !Number.isSafeInteger(item.id) || item.id < 1) fail('Identificador inválido.');
  }
  for (const product of state.productos) {
    text(product.nombre); text(typeof product.descripcion === 'string' ? product.descripcion.replace(/\r?\n/g, ' ') : product.descripcion, 3000, false);
    for (const key of ['precio', 'stock']) {
      if (typeof product[key] === 'number') {
        if (!Number.isFinite(product[key]) || product[key] < 0 || (key === 'stock' && !Number.isInteger(product[key]))) fail('Precio o stock inválido.');
      } else text(product[key], 100);
    }
  }
  if (state.esencias.general) for (const [index, count] of Object.entries(state.esencias.general)) {
    if (!/^\d+$/.test(index) || !(typeof count === 'string' || Number.isInteger(count) && count >= 0)) fail('Stock de esencia inválido.');
    if (Array.isArray(state.esenciasCatalogo) && !state.esenciasCatalogo[Number(index)]) fail('Stock sin esencia correspondiente.');
  }
  for (const type of Object.keys(aromas)) for (const [index, count] of Object.entries(state.esencias[type] || {})) {
    if (!aromas[type][index] || !(typeof count === 'string' || Number.isInteger(count) && count >= 0)) fail('Stock de esencia inválido.');
  }
  for (const order of state.pedidos) {
    if (!order.cliente || !order.entrega || !Array.isArray(order.productos) || !Number.isFinite(order.total) || order.total < 0) fail('Pedido inválido.');
    for (const line of order.productos) if (!line || !Number.isInteger(line.cantidad) || line.cantidad < 1) fail('Cantidad inválida.');
  }
}
export function checkout(state, body, user, id) {
  validateTree(body);
  if (!Array.isArray(body.productos) || body.productos.length < 1 || body.productos.length > 100) fail('El carrito está vacío o es demasiado grande.');
  const delivery = body.entrega;
  if (!delivery || !['Retiro', 'Envío', 'Retiro en local', 'Retiro en persona'].includes(delivery.metodo)) fail('Elegí una forma de entrega.');
  if (delivery.metodo === 'Envío') for (const field of ['departamento', 'direccion', 'ciudad', 'codigoPostal']) text(delivery[field]);
  const lines = body.productos.map(item => {
    if (!item || !Number.isInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > 1000) fail('Cantidad inválida.');
    const variant = item.tipoLatita;
    const product = state.productos.find(p => p.id === (variant ? (variant === 'mediana' ? 4 : 5) : item.id));
    if (!product || typeof product.precio !== 'number') fail('Este producto necesita cotización. Contactanos antes de pedirlo.');
    let nombre = product.nombre;
    let stockOwner = product, stockKey = 'stock';
    if (variant) {
      if (!aromas[variant] || !Number.isInteger(item.indiceEsencia) || !aromas[variant][item.indiceEsencia]) fail('Esencia inválida.');
      nombre = `Latita ${variant === 'mediana' ? 'Mediana' : 'Chica'} - ${aromas[variant][item.indiceEsencia]}`;
      // El stock general es de insumos internos; las latitas descuentan el producto terminado.
      if (!state.esencias.general) { stockOwner = state.esencias[variant]; stockKey = item.indiceEsencia; }
    } else if ([4, 5].includes(product.id)) fail('Elegí la esencia de la latita.');
    if (typeof stockOwner[stockKey] === 'number') {
      if (stockOwner[stockKey] < item.cantidad) fail(`No hay stock suficiente de ${nombre}.`, 409);
      stockOwner[stockKey] -= item.cantidad;
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
  const order = {id, fecha: now.toLocaleString('es-UY', {timeZone: 'America/Montevideo'}), fechaISO: now.toLocaleDateString('en-CA', {timeZone: 'America/Montevideo'}), estado: 'Nuevo', origen: 'Web', cliente: {nombre: user.nombre, email: user.email, telefono: user.telefono}, productos: lines, total, entrega: delivery, pago: {medio, estado: 'Pendiente', subtotal, ajuste, total}};
  state.pedidos.push(order);
  return order;
}

// Ajusta solo pedidos existentes: las ventas nuevas ya descuentan al crearse.
// Borrar historial no equivale a cancelar una venta.
export function reconcileOrderStock(previous, next) {
 const deltas = new Map();
 const oldOrders = new Map(previous.pedidos.map(order => [order.id, order]));
 function add(order, sign) {
  if (order.estado === 'Cancelado') return;
  for (const line of order.productos) {
   const identity = JSON.stringify([line.id ?? line.nombre, line.tipoLatita || '', line.indiceEsencia ?? '']);
   const key = identity + (order.cliente.email === 'Venta manual' ? ':manual' : ':web');
   const entry = deltas.get(key) || {line, manual: order.cliente.email === 'Venta manual', quantity: 0};
   entry.quantity += sign * line.cantidad;
   deltas.set(key, entry);
  }
 }
 for (const order of next.pedidos) {
  const old = oldOrders.get(order.id);
  if (old) { add(old, 1); add(order, -1); }
 }
 const changes = new Map();
 for (const {line, manual, quantity} of deltas.values()) {
  if (!quantity) continue;
  let product;
  if (line.tipoLatita) product = next.productos.find(p => p.id === (line.tipoLatita === 'mediana' ? 4 : 5));
  else if (line.id !== undefined) product = next.productos.find(p => p.id === line.id);
  else {
   const matches = next.productos.filter(p => p.nombre === line.nombre);
   if (matches.length === 1) product = matches[0];
  }
  if (!product) fail('No se puede identificar el producto del pedido para ajustar su stock: ' + line.nombre, 422);
  let owner = product, field = 'stock', key = 'producto:' + product.id;
  if (line.tipoLatita && !manual && !previous.esencias.general) {
   if (!aromas[line.tipoLatita]?.[line.indiceEsencia]) fail('Esencia inválida.', 422);
   owner = next.esencias[line.tipoLatita]; field = line.indiceEsencia;
   key = line.tipoLatita + ':' + field;
  }
  if (!owner || typeof owner[field] !== 'number') continue;
  const change = changes.get(key) || {owner, field, quantity: 0, name: line.nombre};
  change.quantity += quantity; changes.set(key, change);
 }
 // Validar todo antes de aplicar; la API guarda pedido y stock en una transacción.
 for (const change of changes.values()) {
  if (change.owner[change.field] + change.quantity < 0) fail('No hay stock suficiente de ' + change.name + '. No se modificó el pedido.', 422);
 }
 for (const change of changes.values()) change.owner[change.field] += change.quantity;
 return changes.size > 0;
}

// Guardar únicamente campos modificados; conservar las fotos no editadas en la base.
export function applyProductChanges(products, patch) {
 if (!patch || !Array.isArray(patch.upsert) || !Array.isArray(patch.remove)) fail('Cambios de productos inválidos.');
 const allowed = new Set(['id','nombre','descripcion','precio','stock','imagen']);
 const ids = new Set();
 for (const item of patch.upsert) {
  if (!item || !Number.isSafeInteger(item.id) || item.id < 1 || ids.has(item.id) || Object.keys(item).some(k=>!allowed.has(k))) fail('Cambios de productos inválidos.');
  ids.add(item.id);
 }
 for (const id of patch.remove) {
  if (!Number.isSafeInteger(id) || id < 1 || ids.has(id)) fail('Cambios de productos inválidos.');
  ids.add(id);
 }
 validateTree(patch);
 const result = structuredClone(products).filter(p=>!patch.remove.includes(p.id));
 for (const item of patch.upsert) {
  const index=result.findIndex(p=>p.id===item.id);
  if (index < 0) result.push(structuredClone(item));
  else result[index]={...result[index],...structuredClone(item)};
 }
 return result;
}
