# Probar Flamitas en la computadora

Abrir esta carpeta en la terminal y ejecutar `npm run dev` (si faltan dependencias, primero `npm ci`).

- Inicio: http://127.0.0.1:4174/index.html
- Acceso: http://127.0.0.1:4174/login.html
- Usuario exclusivo de pruebas: admin@flamitas.test
- Contraseña exclusiva de pruebas: Flamitas-local-2026!

Este servidor utiliza el mismo código de la aplicación, con una base local de ejemplo en .local-dev, excluida de Git. No lee .env ni utiliza Render o Supabase. Los cambios se conservan al reiniciar. No usar datos personales reales. Las notificaciones push no se envían.

Para probar productos: ingresar, abrir Productos y stock, cambiar nombre, descripción, precio o stock, guardar y recargar. Confirmar que se conserva el cambio. También se puede registrar un cliente de prueba para probar pedidos.

GitHub Desktop muestra los archivos de esta carpeta en Changes. Un commit guarda una versión local; Push origin la sube y puede disparar las publicaciones automáticas. Mantener los cambios locales hasta aprobar la publicación. Live Server sirve para diseño, pero no ejecuta la API para guardar productos.
