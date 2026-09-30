# Gastos y saldo (UYU)

Sección privada para administradoras, con datos independientes del catálogo y una versión que evita sobrescribir cambios simultáneos.

1. Configurar fecha inicial y saldo disponible al comienzo de ese día. El importe es editable. No precargar automáticamente ventas como saldo.
2. Registrar cobros de pedidos pagados con su fecha real, o cobros externos. Un pedido solo puede vincularse a un cobro. Los pagos confirmados desde esta actualización se registran automáticamente; los anteriores se revisan manualmente. No registrar otra vez cobros incluidos en el saldo inicial.
3. Cargar gastos con importe final, categoría, proveedor y fecha. Preparar una cuota para contado o varias mensuales, con fechas e importes editables. La suma debe coincidir con el total. Una fecha de pago vacía significa pendiente.
4. Registrar aportes, retiros, devoluciones a clientes y reintegros de proveedores por separado.

El saldo es: inicial + cobros + aportes + reintegros - gastos pagados - retiros - devoluciones. Solo cuentan movimientos desde la fecha inicial hasta el día consultado. Las cuotas pendientes incluyen obligaciones anteriores aún no pagadas. Los próximos 30 días incluyen vencidas. El saldo tras compromisos descuenta todas las cuotas pendientes, sin suponer ventas futuras.

Resultado de caja = cobros - devoluciones - gastos pagados + reintegros. No es ganancia contable: no calcula costo de mercadería vendida, consumo de inventario, amortización ni impuestos automáticamente. Las compras de insumos no alteran el stock.

Al cancelar o modificar una venta no se borra un cobro ya registrado: revisar si corresponde registrar una devolución o editar el movimiento. El saldo es confiable solo si están completos los movimientos; no está conectado a bancos. Eliminar registros recalcula el saldo y requiere confirmación.

Despliegue: actualizar backend con server/finance.js y schema.sql, además del sitio estático. La inicialización crea finance_state sin cambiar datos anteriores. Se publica junto con Por cobrar.

## Cobros automáticos
Desde esta versión, un pedido nuevo pagado o una transición a Pagado genera su cobro de forma transaccional. No se importan pagos históricos automáticamente: su fecha real y su inclusión en saldo inicial deben revisarse. Volver a Pendiente revierte el cobro vinculado; cambiar el total de un pedido pagado ajusta ese cobro. Cancelar un pedido pagado conserva el ingreso: registrar una devolución cuando se devuelva el dinero.
Recordatorios de seguimiento configurables por dispositivo cada 12, 24 o 48 horas dentro del panel abierto o al volver a entrar; no son avisos push con la app cerrada ni mensajes a clientes.
