// Inicia la página de cuenta cuando termina de cargar.


// Protege la cuenta y muestra datos del usuario activo.
function iniciarMiCuenta() {
    if (!protegerPagina()) return;

    document.querySelector("#formDatosCuenta").addEventListener("submit", guardarDatosCuenta);
    document.querySelector("#formPasswordCuenta").addEventListener("submit", cambiarPasswordCuenta);
    mostrarDatosCuenta();

    // Las administradoras solo editan sus datos acá; pedidos y comprobantes están en el panel.
    if (obtenerUsuarioActivo().rol === "admin") {
        document.querySelector("#bloquePedidosCuenta").remove();
        document.querySelector(".cuenta-cliente").classList.add("cuenta-solo-datos");
        document.querySelector("#passwordNuevaCuenta").minLength = 12;
        document.querySelector("#passwordConfirmarCuenta").minLength = 12;
        document.querySelector("#ayudaPasswordCuenta").textContent = "Entre 12 y 128 caracteres para cuentas de administración. Evitá contraseñas comunes o tu email. Al cambiarla se cierran tus otras sesiones abiertas.";
        return;
    }

    mostrarHistorialCuenta();
}

// Muestra nombre, email y teléfono del usuario activo y completa el formulario.
function mostrarDatosCuenta() {
    let usuario = obtenerUsuarioActivo();
    let contenedor = document.querySelector("#datosCuentaCliente");

    contenedor.innerHTML = `
        <p><strong>Nombre:</strong> ${escaparHTML(usuario.nombre)}</p>
        <p><strong>Mail:</strong> ${escaparHTML(usuario.email)}</p>
        <p><strong>Teléfono:</strong> ${escaparHTML(usuario.telefono)}</p>
    `;
    document.querySelector("#nombreCuenta").value = usuario.nombre || "";
    document.querySelector("#telefonoCuenta").value = usuario.telefono || "";
}

// Guarda nombre y teléfono; el email no se envía porque no es editable.
async function guardarDatosCuenta(evento) {
    evento.preventDefault();
    let mensaje = document.querySelector("#mensajeDatosCuenta");
    let boton = evento.target.querySelector("[type=submit]");
    boton.disabled = true;
    mensaje.textContent = "";

    try {
        let usuario = await api("/api/account", "PUT", {
            nombre: document.querySelector("#nombreCuenta").value,
            telefono: document.querySelector("#telefonoCuenta").value
        });
        datosServidor.usuario = {...datosServidor.usuario, ...usuario};
        mostrarDatosCuenta();
        mostrarUsuarioEnMenu();
        mensaje.textContent = "Tus datos quedaron guardados.";
    } catch (error) {
        mensaje.textContent = error.message;
    } finally {
        boton.disabled = false;
    }
}

// Cambia la contraseña pidiendo la actual; el servidor cierra las otras sesiones.
async function cambiarPasswordCuenta(evento) {
    evento.preventDefault();
    let formulario = evento.target;
    let mensaje = document.querySelector("#mensajePasswordCuenta");
    let nueva = document.querySelector("#passwordNuevaCuenta").value;
    let boton = formulario.querySelector("[type=submit]");
    mensaje.textContent = "";

    if (nueva !== document.querySelector("#passwordConfirmarCuenta").value) {
        mensaje.textContent = "Las contraseñas nuevas no coinciden.";
        return;
    }

    boton.disabled = true;
    try {
        await api("/api/account/password", "POST", {actual: document.querySelector("#passwordActualCuenta").value, nueva});
        formulario.reset();
        mensaje.textContent = "Contraseña cambiada. Cerramos tus otras sesiones; esta sigue abierta.";
    } catch (error) {
        mensaje.textContent = error.message;
    } finally {
        boton.disabled = false;
    }
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

    if (pedido.pago?.estado !== "Pagado" && pedido.estado !== "Cancelado" && datosServidor.comprobantes?.some(r => String(r.order_id) === String(pedido.id) && !r.reviewed_at)) texto = "Comprobante enviado · Pendiente de verificación";
    return texto;
}
