// Espera a que cargue la página de inicio antes de activar el menú.
window.addEventListener("load", inicio);

// Prepara el menú hamburguesa y cierra el menú cuando se toca un enlace.
function inicio() {

    // BOTON MENU HAMBURGUESA
    document.querySelector("#menuToggle")?.addEventListener("click", toggleMenu);

    // LINKS DEL MENU
    let links = document.querySelectorAll("#menuLinks a");

    for (let i = 0; i < links.length; i++) {
        links[i].addEventListener("click", cerrarMenu);
    }
}


// ---------------- MENU ----------------

// Abre o cierra el menú hamburguesa en pantallas chicas.
function toggleMenu() {
    let menu = document.querySelector("#menuLinks");

    // Si tiene la clase active → la saco
    if (menu.classList.contains("active")) {
        menu.classList.remove("active");
    } else {
        menu.classList.add("active");
    }
}


// Cierra el menú hamburguesa después de tocar un enlace.
function cerrarMenu() {
    let menu = document.querySelector("#menuLinks");
    menu.classList.remove("active");
}
