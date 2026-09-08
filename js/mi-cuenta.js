// Inicia la página de cuenta cuando termina de cargar.


// Protege la cuenta y muestra datos del cliente activo.
function iniciarMiCuenta() {
    if (!protegerPagina()) return;

    if (obtenerUsuarioActivo().rol === "admin") {
        window.location = "admin.html";
        return;
    }

    mostrarDatosCuenta();
    mostrarHistorialCuenta();
}

// Muestra nombre, email y teléfono del usuario cliente.
function mostrarDatosCuenta() {
    let usuario = obtenerUsuarioActivo();
    let contenedor = document.querySelector("#datosCuentaCliente");

    contenedor.innerHTML = `
        <p><strong>Nombre:</strong> ${usuario.nombre}</p>
        <p><strong>Mail:</strong> ${usuario.email}</p>
        <p><strong>Teléfono:</strong> ${usuario.telefono}</p>
    `;
}

// Muestra solo los pedidos realizados por el cliente activo.
function mostrarHistorialCuenta() {
    let usuario = obtenerUsuarioActivo();
    let pedidos = obtenerPedidosCuenta();
    let html = "";

    for (let i = pedidos.length - 1; i >= 0; i--) {
        if (pedidos[i].cliente.email === usuario.email) {
            html = html + armarPedidoCuenta(pedidos[i]);
        }
    }

    if (html === "") {
        html = "<p class='admin-vacio'>Todavía no tenés pedidos registrados.</p>";
    }

    document.querySelector("#historialCuentaCliente").innerHTML = html;
}

// Lee únicamente los pedidos autorizados por el servidor para esta cuenta.
function obtenerPedidosCuenta() { return datosServidor.pedidos; }

// Arma una tarjeta de pedido para la cuenta del cliente.
function armarPedidoCuenta(pedido) {
    let productos = "";
    let estado = pedido.estado === undefined ? "Nuevo" : pedido.estado;
    let pago = obtenerTextoPagoCuenta(pedido);

    for (let i = 0; i < pedido.productos.length; i++) {
        productos = productos + `<li>${pedido.productos[i].nombre} x${pedido.productos[i].cantidad} - $${pedido.productos[i].subtotal}</li>`;
    }

    return `
        <article class="pedido-cuenta">
            <div class="pedido-admin-encabezado">
                <h3>Pedido #${pedido.id}</h3>
                <span>${pedido.fecha}</span>
            </div>
            <p><strong>Estado:</strong> ${estado}</p>
            <p><strong>Entrega:</strong> ${pedido.entrega.metodo}</p>
            <p><strong>Pago:</strong> ${pago}</p>
            <ul>${productos}</ul>
            <p><strong>Total:</strong> $${pedido.total}</p>
        </article>
    `;
}

// Prepara el texto de pago aunque el pedido haya sido creado con una versión anterior.
function obtenerTextoPagoCuenta(pedido) {
    let texto = "Pendiente";

    if (pedido.pago !== undefined) {
        texto = pedido.pago.estado === undefined ? "Pendiente" : pedido.pago.estado;

        if (pedido.pago.medio !== undefined && pedido.pago.medio !== "") {
            texto = texto + " - " + pedido.pago.medio;
        }
    }

    return texto;
}
