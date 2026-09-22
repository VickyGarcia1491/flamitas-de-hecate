# Publicar Flamitas sin la pantalla de espera de Render

La portada y los archivos públicos se sirven desde Netlify. Las peticiones `/api/*`
se envían internamente al servidor existente `https://flamitas-web.onrender.com`.
El navegador conserva el nuevo dominio, incluidas sus cookies de sesión HttpOnly.
No se cambian las cuentas, contraseñas ni los datos de la base.

## Publicación manual (sin conectar GitHub)

1. Ejecutá `npm run build:static` en esta carpeta. Ya se generó una primera versión.
2. Entrá a https://app.netlify.com y elegí el plan Free.
3. Usá la opción de desplegar un sitio manualmente y arrastrá **solo la carpeta
   public-static**. Incluye `_redirects`, necesario para conectar con Render.
4. Comprobá que la visibilidad del proyecto sea pública para que puedan verlo tus clientes.
5. Abrí el enlace `https://...netlify.app` que te asignen. Ese será el enlace que
   debés compartir y usar en favoritos. El enlace anterior de Render conserva su pantalla de espera.
6. Entrá con tu cuenta habitual y comprobá catálogo, sesión al recargar, panel y cierre de sesión.
   Probá también un pedido y verificá que aparezca una sola vez en el panel.

Si publicás desde GitHub, `netlify.toml` configura el comando `npm run build:static`
y la carpeta de publicación `public-static`. No cambies el servicio web de Render
a sitio estático: todavía ejecuta las cuentas y pedidos. No hace falta modificar
las variables de Render ni poner credenciales en Netlify.

## Lo que cambia

La portada aparece sin esperar al servidor. Un aviso de Flamitas acompaña la
conexión. Mientras tanto se puede navegar; los formularios esperan para evitar
envíos accidentales. Si Render sigue iniciando, se repite solo la lectura inicial,
hasta cuatro intentos de 25 segundos con pausas de dos segundos. Después se ofrece
un botón para reintentar. Nunca se repite automáticamente una compra o guardado.

En el dominio nuevo tendrás que iniciar sesión otra vez. Los usuarios y pedidos
siguen en la misma base. Abrir los archivos con Live Server no activa el proxy;
para desarrollo local usá `npm start` y `http://localhost:3000`.

## Actualizaciones y límites

Después de modificar el frontend, volvé a generar y publicar `public-static`.
Los cambios del servidor se publican en Render como antes. Si cambia su dirección,
actualizá la URL en `scripts/build-static.js` y generá nuevamente el sitio.
El plan Free tiene límites de uso. Esta separación elimina la pantalla de Render
en el nuevo enlace, pero no elimina el tiempo de arranque de las operaciones ni
resuelve una base de datos pausada o vencida.

Documentación: https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/
y https://www.netlify.com/pricing/.
