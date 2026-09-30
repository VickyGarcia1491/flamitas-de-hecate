// Espera a que cargue la página de inicio antes de activar el menú.
window.addEventListener("load", inicio);

// Prepara el menú hamburguesa y cierra el menú cuando se toca un enlace.
function inicio() {

    // BOTON MENU HAMBURGUESA
    document.querySelector("#menuToggle")?.addEventListener("click", toggleMenu);

    document.querySelector('#menuLinks')?.addEventListener('click', event => {
        if (event.target.closest('a')) cerrarMenu();
    });
    // LINKS DEL MENU
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') cerrarMenu();
    });
}


// ---------------- MENU ----------------

// Abre o cierra el menú hamburguesa en pantallas chicas.
function toggleMenu() {
    let menu = document.querySelector("#menuLinks");

    if (!menu) return;
    // Si tiene la clase active → la saco
    if (menu.classList.contains("active")) {
        menu?.classList.remove("active");
    } else {
        menu.classList.add("active");
    }
    document.querySelector('#menuToggle')?.setAttribute('aria-expanded', String(menu.classList.contains('active')));
}


// Cierra el menú hamburguesa después de tocar un enlace.
function cerrarMenu() {
    let menu = document.querySelector("#menuLinks");
    menu?.classList.remove("active");
    document.querySelector('#menuToggle')?.setAttribute('aria-expanded', 'false');
}
