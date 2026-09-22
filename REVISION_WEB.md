# Revisión de Flamitas

## Cambios comprobados localmente

- Pedidos: los cambios de estado se calculan cuando les llega el turno de guardarse,
  sobre los datos confirmados. Dos pedidos editados rápidamente ya no usan copias
  antiguas de la misma lista. El mismo selector queda bloqueado durante su envío.
- Un conflicto de versión confirmado por el servidor permite releer y recalcular
  el cambio de estado una sola vez. Si otra sesión cambió ese mismo estado, se
  conserva ese cambio y se avisa; no se reintentan escrituras con resultado incierto.
- Bandeja: une los identificadores leídos dentro de la cola y abre aun si falla el guardado.
- Historial: categorías pendientes, entregados, cancelados y todos; diez tarjetas por
  página. Los totales y el CSV usan todos los resultados del filtro, no solo la página.
  Cambiar de categoría no elimina ni mueve datos a otra base.
- Guardado: no copia el catálogo y sus fotos para editar otro campo; envía solo
  las colecciones afectadas. Se retiró el filtro anterior de pendientes ya reemplazado.
- Administración: evita registrar dos veces sus eventos y elimina repintados
  redundantes después de una venta manual. Se conservan productos y esencias compactos.
- Contacto: evita envíos simultáneos y conserva el texto cuando falla la conexión.
- Menú: tolera páginas sin el botón móvil. Caché: no devuelve HTML como si fuera
  JavaScript o una imagen cuando no hay conexión, ni almacena recursos de otros sitios.

## Alcance de la revisión

Se revisaron los scripts de inicio, acceso, administración, tienda, cuenta, contacto,
migración y caché, y el flujo de persistencia del servidor. La comprobación automática
revisa sintaxis, recursos, identificadores HTML y declaraciones de funciones repetidas
entre scripts de cada una de las ocho páginas. No se encontraron duplicados globales.
Las pruebas cubren sesiones, permisos, persistencia, stock, compras, ventas manuales,
conflictos locales y externos, filtros, paginación y contacto. Se verificó el filtro
de pedidos en navegador con datos ficticios locales.

Esto no es una medición de velocidad del servidor publicado: no se modificaron pedidos
reales. Render gratuito puede seguir tardando en arrancar. La API inicial aún carga
el catálogo y el historial permitido completos; la paginación reduce las tarjetas
dibujadas, no esa descarga. Con un historial grande convendrá paginar también la API
y servir las fotos fuera del documento compartido de la base de datos.

## Publicación

Los archivos corregidos se copian al repositorio `flamitas-de-hecate`. Hacer Commit
y Push desde GitHub Desktop; esperar el despliegue de Netlify y recargar el panel.
Esta entrega no requiere cambios de esquema ni variables de entorno.
