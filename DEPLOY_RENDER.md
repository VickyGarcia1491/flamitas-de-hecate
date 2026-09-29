# Subir Flamitas a Render, paso a paso

## Qué está preparado

La web ahora necesita un servidor Node.js y una base PostgreSQL. Ya no se usa localStorage para operar: los productos, el stock, los pedidos y las consultas se guardan en PostgreSQL. El carrito existe temporalmente mientras la página está abierta. Las cuentas usan contraseñas con hash y sesiones en cookies HttpOnly.

El archivo `render.yaml` crea y conecta el servicio web y la base de datos. Las tablas y los 10 productos originales se crean automáticamente durante el primer arranque. Los reinicios no reemplazan los datos existentes. Las fotos que agregues desde el panel se guardan con el producto en la base, hasta 2 MB por imagen; las fotos originales siguen en `img`.

**Todavía no se creó una base en tu cuenta de Render ni se publicó la web.** Eso sucede cuando completes los pasos siguientes. No compartas tu contraseña de Render ni la contraseña de administrador en el chat.

## 1. Recuperar datos del navegador anterior

Antes de borrar datos del navegador o cambiar de computadora:

1. Usá el mismo navegador y la misma dirección donde abrías la tienda anteriormente. Si era con Live Server, mantené el mismo puerto y dirección (por ejemplo, `http://127.0.0.1:5500`).
2. En esa dirección, abrí `migracion.html` y pulsá **Descargar datos antiguos**.
3. Guardá `flamitas-datos-antiguos.json` fuera de la carpeta que vas a subir a GitHub. Contiene datos de clientes.
4. Si la herramienta dice que no encuentra datos, no significa que se perdieron: probablemente estás en otra dirección, puerto o navegador. No limpies el almacenamiento. Si usabas archivos `file:///`, cada archivo puede tener almacenamiento diferente: abrí la página original y usá el código de `scripts/exportar-datos-antiguos.txt` desde la consola de esa página.

Las cuentas antiguas deberán registrarse nuevamente con el mismo email para consultar sus pedidos. No trasladamos las contraseñas que estaban guardadas como texto. La cuenta administradora se creará con el correo y la contraseña que elijas en Render.

Si no tenías pedidos ni cambios reales, podés omitir esta parte y empezar con el catálogo original.

## 2. Subir el proyecto a GitHub

1. Creá una cuenta en [GitHub](https://github.com) si todavía no tenés.
2. Elegí **New repository**, nombre `flamitas-web`, visibilidad **Private**, y **Create repository**.
3. Elegí **uploading an existing file** (o **Add file → Upload files**).
4. Arrastrá las carpetas `css`, `fonts`, `img`, `js`, `server`, `scripts`, `test`, todos los archivos `.html`, `package.json`, `package-lock.json`, `render.yaml`, `.gitignore`, `.env.example` y esta guía. Deben quedar directamente en la raíz del repositorio, sin una carpeta adicional alrededor.
5. No subas `node_modules`, archivos `.env`, respaldos JSON ni exportaciones con datos personales. `.env.example` es una plantilla sin secretos y sí se puede subir.
6. Pulsá **Commit changes**.

Si GitHub indica que hay demasiados archivos o algún archivo supera el límite de carga, hacé la carga en varias tandas conservando las carpetas o usá GitHub Desktop para agregar esta carpeta, hacer Commit y Publish repository. No subas un ZIP como sustituto del código: Render necesita ver `render.yaml` y `package.json` en la raíz.

## 3. Crear la web y PostgreSQL en Render

1. Entrá a [tu panel de Render](https://dashboard.render.com).
2. Elegí **New + → Blueprint**.
3. Conectá GitHub y autorizá el acceso al repositorio `flamitas-web`.
4. Seleccioná ese repositorio y la rama que contiene los archivos, normalmente `main`.
5. Render leerá `render.yaml`. Deberías ver **flamitas-web** y **flamitas-db**.
6. Completá las variables que te pide:
   - `ADMIN_EMAIL`: tu correo para ingresar al panel de Flamitas.
   - `ADMIN_PASSWORD`: una contraseña nueva y única, de 12 a 128 caracteres. Guardala en tu gestor de contraseñas.
7. Revisá los planes y pulsá **Deploy Blueprint** o **Apply** según la pantalla.
8. Esperá a que la base esté disponible y el servicio web figure **Live**.
9. Abrí el enlace `https://...onrender.com` que Render muestra en el servicio web.

No es necesario copiar la URL de la base: `DATABASE_URL` se conecta automáticamente por la red interna. La base y la web están configuradas en la misma región y el acceso público a PostgreSQL queda cerrado.

**Planes:** este archivo usa los planes gratuitos para empezar sin contratar un plan de pago. Según [Render, PostgreSQL gratis vence a los 30 días](https://render.com/docs/free). No sirve como base permanente de tu negocio. Antes de operar de forma permanente, elegí un plan PostgreSQL de pago y actualizá también `plan` en `render.yaml` con el identificador de ese plan. Revisá el precio mostrado por Render antes de contratarlo. El servidor web gratuito también puede dormirse por inactividad, por lo que la primera visita puede tardar.

## 4. Entrar e importar

1. En la web nueva abrí `/login.html` e ingresá con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
2. Desde el panel, abrí **Importar datos antiguos / Descargar respaldo / Consultas**.
3. Seleccioná `flamitas-datos-antiguos.json` y revisá las cantidades mostradas.
4. Pulsá **Importar estos datos** y confirmá. La importación guarda catálogo, stock, pedidos y consultas juntos. Solo se permite una importación inicial y se bloquea si ya existen pedidos nuevos para no sobrescribirlos.
5. Volvé al panel y revisá precios, stock y pedidos antes de compartir el enlace con clientes.

Si el archivo tiene identificadores repetidos o datos incompatibles, el servidor rechaza la importación sin guardarla parcialmente. Conservá el original para corregir una copia.

## 5. Comprobar antes de abrir al público

1. Registrá una cuenta de cliente en una ventana privada; la contraseña debe tener al menos 12 caracteres.
2. Agregá un producto y realizá un pedido de prueba.
3. Confirmá que aparece en el panel administrador y que se descontó el stock.
4. Ingresá con ese cliente desde otro dispositivo: su pedido debe aparecer en **Mi cuenta**.
5. Probá el formulario de contacto y revisá **Consultas** en la pantalla de datos.
6. Eliminá el pedido de prueba y corregí su stock manualmente desde el panel: eliminar o cancelar un pedido no repone stock automáticamente.

WhatsApp sigue funcionando mediante un enlace: el pedido se guarda primero, y luego el cliente toca el enlace para enviar el mensaje. Como el código original no tiene un número de negocio, WhatsApp permite elegir el destinatario. No hay cobro automático ni verificación de pagos de Mercado Pago; el administrador confirma el pago después de comprobarlo.

## Actualizaciones, respaldos y problemas

- Para actualizar la web, subí los archivos modificados a la misma rama de GitHub. Render despliega esa versión. No reemplaza el catálogo existente por el catálogo inicial.
- Descargá regularmente el **respaldo comercial** desde el panel. No contiene credenciales ni cuentas. Para una recuperación completa, usá también los respaldos/exportaciones PostgreSQL disponibles en tu plan de Render.
- Si aparece un conflicto de datos, recargá el panel y repetí el cambio: otra sesión o una compra actualizó la base.
- Si la web no inicia, abrí **flamitas-web → Logs**. Verificá que `DATABASE_URL`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` estén configuradas. No publiques los valores de esas variables.
- La contraseña del administrador se usa solo para crear la primera cuenta. Cambiar `ADMIN_PASSWORD` luego no cambia una cuenta existente. Para cambiarla, ejecutá `npm run admin:password` desde un entorno con acceso a la base y con las nuevas variables `ADMIN_EMAIL` y `ADMIN_PASSWORD`; después quitá la contraseña de las variables si ya no la necesitás para futuras instalaciones.
- No abras `index.html` con doble clic para usar la tienda nueva: requiere el servidor. Para desarrollo local, instalá PostgreSQL, creá una base vacía, copiá `.env.example` a `.env`, completá los valores y ejecutá `npm ci` y `npm start`. Abrí `http://localhost:3000`.
- El catálogo completo, pedidos y stock comparten un documento JSONB transaccional. Es una solución para una tienda pequeña; con un historial grande convendrá separar pedidos y productos en tablas e incorporar paginación.

Referencias: [Node y Express en Render](https://render.com/docs/deploy-node-express-app), [Blueprints](https://render.com/docs/blueprint-spec), [limitaciones gratuitas](https://render.com/docs/free).
