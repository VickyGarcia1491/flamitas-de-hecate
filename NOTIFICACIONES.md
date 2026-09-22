# Avisos de nuevos pedidos

El pedido se guarda primero. Después se envía un aviso genérico a los dispositivos de las administradoras que activaron las notificaciones. No se incluye información personal en la pantalla bloqueada. Los fallos temporales se reintentan hasta cinco veces mientras el servidor está activo; un fallo de envío no cancela la compra.

## Publicación y activación

1. Publicar todos los cambios en GitHub. Esperar a que Render termine el despliegue del servidor y Netlify el del sitio.
2. Cada administradora abre `https://flamitasdehecate.netlify.app` en Chrome de su Android e inicia sesión. Usar o instalar la aplicación desde esa dirección.
3. En **Inicio admin → Avisos de pedidos en tu celular**, tocar **Activar notificaciones** y permitirlas. Hacerlo en cada teléfono.
4. Cerrar la aplicación sin cerrar sesión y realizar un pedido de prueba desde otra cuenta. Comprobar que llega el aviso y abre el pedido.

Cerrar sesión desactiva los avisos de esa sesión. También existe un botón para desactivarlos. El punto o número sobre el icono depende del teléfono y su lanzador; no todos muestran un contador. Los permisos del sistema, el ahorro de batería y la conexión pueden afectar la entrega. Render gratuito conserva sus posibles demoras de arranque.

Las claves Web Push se generan automáticamente y permanecen en PostgreSQL. No hace falta copiarlas a Netlify ni configurar una API de WhatsApp. No borrar `push_config`: cambiar esas claves exige volver a suscribir los teléfonos.

## WhatsApp

Tras guardar el pedido, el cliente puede tocar el enlace para enviarlo al **+598 97 605 718**. WhatsApp abre un mensaje preparado y el cliente debe tocar **Enviar**. No es un envío automático y no utiliza la API paga de WhatsApp.

Las pruebas automatizadas usan un emisor simulado. La recepción real con la aplicación cerrada debe comprobarse en Android después de publicar.
