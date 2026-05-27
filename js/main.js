window.addEventListener("load", inicio);

function inicio() {

    // BOTON MENU HAMBURGUESA
    document.querySelector("#menuToggle").addEventListener("click", toggleMenu);

    // LINKS DEL MENU
    let links = document.querySelectorAll("#menuLinks a");

    for (let i = 0; i < links.length; i++) {
        links[i].addEventListener("click", cerrarMenu);
    }
}


// ---------------- MENU ----------------

function toggleMenu() {
    let menu = document.querySelector("#menuLinks");

    // Si tiene la clase active → la saco
    if (menu.classList.contains("active")) {
        menu.classList.remove("active");
    } else {
        menu.classList.add("active");
    }
}


function cerrarMenu() {
    let menu = document.querySelector("#menuLinks");
    menu.classList.remove("active");
}