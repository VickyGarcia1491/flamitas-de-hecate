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
    const grupos = Array.isArray(state.esenciasCatalogo) ? [state.esenciasCatalogo] : [state.esenciasCatalogo.mediana, state.esenciasCatalogo.chica];
    for (const grupo of grupos) {
      if (!Array.isArray(grupo)) fail('Catálogo de esencias inválido.');
      for (const item of grupo) { text(item.nombre,120); text(item.detalle || '',1000,false); }
    }
  }
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
  if (state.esencias.general) for (const [index, count] of Object.entries(state.esencias.general)) {
    if (!/^\d+$/.test(index) || !(typeof count === 'string' || Number.isInteger(count) && count >= 0)) fail('Stock de esencia inválido.');
    if (Array.isArray(state.esenciasCatalogo) && !state.esenciasCatalogo[Number(index)]) fail('Stock sin esencia correspondiente.');
  }
  for (const type of Object.keys(aromas)) for (const [index, count] of Object.entries(state.esencias[type] || {})) {
    if (!aromas[type][index] || !(typeof count === 'string' || Number.isInteger(count) && count >= 0)) fail('Stock de esencia inválido.');
  }
  for (const order of state.pedidos) {
    if (!order.cliente || !order.entrega || !Array.isArray(order.productos) || !Number.isFinite(order.total) || order.total < 0) fail('Pedido inválido.');
    for (const line of order.productos) if (!Number.isInteger(line.cantidad) || line.cantidad < 1) fail('Cantidad inválida.');
  }
}
export function checkout(state, body, user, id) {
  validateTree(body);
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
