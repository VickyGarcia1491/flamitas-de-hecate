const CACHE_NAME = "flamitas-app-v3";

const APP_SHELL = [
  "/",
  "/index.html",
  "/tienda.html",
  "/login.html",
  "/registro.html",
  "/contacto.html",
  "/mi-cuenta.html",
  "/admin.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/css/styles.css",
  "/js/api.js",
  "/js/clases.js",
  "/js/usuarios.js",
  "/js/sistema.js",
  "/js/tienda.js",
  "/js/admin.js",
  "/js/main.js",
  "/js/iniciar.js",
  "/img/logo-flamitas-manos.png",
  "/img/app-icon-192.png",
  "/img/app-icon-512.png",
  "/img/carrito-vela.png",
  "/img/fondo-flamitas-web.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Nunca devolver HTML de inicio como si fuera un script o una imagen.
        if (event.request.mode === 'navigate') return (await caches.match('/index.html')) || Response.error();
        return Response.error();
      })
  );
});
