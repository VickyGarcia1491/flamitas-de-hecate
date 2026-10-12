# Actualización de Flamitas — 12 de octubre de 2026

## Preparación verificada
- Respaldo Custom de PostgreSQL 18 creado el 12/10/2026 a las 17:37, conservado fuera de Git.
- Restaurado por la propietaria en flamitas_prueba_2026_10_12: 7 usuarios, 17 productos, 12 pedidos, un estado financiero y cero comprobantes.
- Migración probada desde ese mismo archivo en una base aislada: 16 fotos separadas, 17 imágenes decodificadas, rollback e idempotencia verificados. El estado y los bytes originales se conservan.
- Estado de negocio: 19.648.251 bytes antes, 11.547 después; esta reducción no es una medición de velocidad del alojamiento.
- El servidor web y PostgreSQL ya tienen planes pagos contratados por la propietaria. render.yaml refleja 0.5c-512mb y 0.5c-1g, y la IP autorizada para el respaldo. No se amplía el acceso a otras IP.

## Cambios de esta publicación
- El arranque crea product_images y migra las fotos dentro de una transacción antes de aceptar tráfico. Si falla, revierte y no arranca. Reiniciar no duplica imágenes.
- Las fotos históricas se conservan sin recomprimir; las nuevas subidas se reducen a un máximo de 1200 px y 350 KiB. La optimización usa WebP y aplana transparencia y animación.
- Los cambios de productos mantienen la foto y su referencia en la misma transacción. Los respaldos completos deben incluir product_images.
- Recuperación ante fallos de conexión, límites del pool y entrega de notificaciones fuera de la respuesta del pedido.
- Los reintentos de compras conservan su identificador en la misma pestaña tras una recarga. Revisar Mis pedidos antes de repetir desde otro dispositivo.
- Finanzas adapta las tablas al celular para que sus botones queden visibles.
- La corrección de los enlaces de Tienda ya estaba publicada en 961e1f2.

## Verificación y límites
- Pruebas locales de permisos, pedidos, stock, comprobantes, finanzas, fotos y desconexiones.
- Antes de dar la publicación por terminada: verificar health, catálogo, todas las fotos y navegación en Render.
- No hacer compras reales ni marcar pagos como parte de una prueba automática de producción.
- No revertir a código anterior a esta migración sin preparar la compatibilidad con las fotos separadas; restaurar un respaldo antiguo puede perder operaciones nuevas.
- El dominio propio todavía no está contratado. Las pruebas locales no garantizan disponibilidad continua del alojamiento.
