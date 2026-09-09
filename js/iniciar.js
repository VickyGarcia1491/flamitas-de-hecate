window.addEventListener('load', async () => {
 try {
  await cargarDatosServidor();
  prepararMenuResponsive();
  if (typeof iniciarUsuarios === 'function') iniciarUsuarios();
  if (typeof iniciarAdmin === 'function') iniciarAdmin();
  if (typeof inicioTienda === 'function') inicioTienda();
  if (typeof iniciarMiCuenta === 'function') iniciarMiCuenta();
  if (typeof iniciarContacto === 'function') iniciarContacto();
 } catch(error) {
  const aviso = document.createElement('p'); aviso.setAttribute('role','alert'); aviso.textContent = 'No pudimos conectar con la tienda. Recargá la página para reintentar. ' + error.message;
  document.body.prepend(aviso);
 }
});

// Activa el menú hamburguesa en todas las páginas y mantiene separadas las acciones del usuario.
function prepararMenuResponsive() {
 const nav = document.querySelector('.menu nav');
 const links = document.querySelector('.menu .menu-links');
 if (!nav || !links || links.dataset.menuPreparado === 'true') return;

 let toggle = document.querySelector('#menuToggle');
 if (!toggle) {
  toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'menuToggle';
  toggle.className = 'menu-toggle';
  toggle.setAttribute('aria-label', 'Abrir menú');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  nav.insertBefore(toggle, links);
 }

 links.id = links.id || 'menuLinks';
 links.dataset.menuPreparado = 'true';
 toggle.setAttribute('aria-controls', links.id);
 toggle.setAttribute('aria-expanded', 'false');

 const cerrarMenu = () => {
  links.classList.remove('active');
  toggle.classList.remove('active');
  toggle.setAttribute('aria-expanded', 'false');
 };

 toggle.addEventListener('click', () => {
  const abierto = !links.classList.contains('active');
  links.classList.toggle('active', abierto);
  toggle.classList.toggle('active', abierto);
  toggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
 });

 links.addEventListener('click', event => {
  if (event.target.closest('a, button')) {
   cerrarMenu();
  }
 });
}

// Permite instalar la web como app en celulares, tablets y computadoras compatibles.
if ('serviceWorker' in navigator) {
 window.addEventListener('load', () => {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
 });
}
