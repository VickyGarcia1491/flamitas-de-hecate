// Inicia el panel administrador cuando la página termina de cargar.


// Guarda temporalmente los productos que se cargan en una venta manual.
let productosVentaManual = [];
// Recuerda qué pedido se está editando dentro del modal.
let pedidoEditandoId = null;
// Guarda temporalmente los productos del pedido que se está editando.
let productosPedidoEditando = [];
// Indica si el historial está mostrando solo pedidos nuevos y pendientes.
let filtroPedidosPendientesActivo = false;
// Recuerda qué producto está abierto en la edición compacta de stock.
let productoAdminSeleccionadoId = null;
// Recuerda si el bloque de modificación de stock está abierto.
let edicionProductoAdminAbierta = false;

// Prepara seguridad, pedidos, productos, stock, venta manual y eventos del admin.
function iniciarAdmin() {
    if (!obtenerUsuarioActivo() || obtenerUsuarioActivo().rol !== "admin") { window.location = "login.html"; return; }
    prepararMenuAdmin();
    prepararAtajosDashboard();
    mostrarDashboardAdmin();
    mostrarPedidosAdmin();
    mostrarProductosAdmin();
    mostrarStockEsenciasAdmin();
    cargarSelectVentaManual();
    mostrarVentaManual();

    document.querySelector("#btnVaciarPedidos").addEventListener("click", vaciarPedidos);
    document.querySelector("#btnBandejaPedidos").addEventListener("click", mostrarPedidosPendientesDesdeBandeja);
    document.querySelector("#btnExportarPedidos").addEventListener("click", exportarPedidosCSV);
    document.querySelector("#formProductoAdmin").addEventListener("submit", agregarProductoAdmin);
    document.querySelector("#btnAgregarVentaManual").addEventListener("click", agregarProductoVentaManual);
    document.querySelector("#formVentaManual").addEventListener("submit", guardarVentaManual);
    document.querySelector("#filtroFechaPedidos").addEventListener("change", mostrarPedidosAdmin);
    document.querySelector("#filtroMesPedidos").addEventListener("change", mostrarPedidosAdmin);
    document.querySelector("#btnLimpiarFiltrosPedidos").addEventListener("click", limpiarFiltrosPedidos);
    document.querySelector("#productoVentaManual").addEventListener("change", actualizarPrecioVentaManual);
    document.querySelector("#medioPagoVentaManual").addEventListener("change", mostrarVentaManual);
    document.querySelector("#cerrarModalEditarPedido").addEventListener("click", cerrarModalEditarPedido);
    document.querySelector("#formEditarPedido").addEventListener("submit", guardarPedidoEditado);
    document.querySelector("#btnAgregarProductoEditarPedido").addEventListener("click", agregarProductoAlPedidoEditando);
    document.querySelector("#productoNuevoEditarPedido").addEventListener("change", actualizarPrecioNuevoPedidoEditando);
    document.querySelector("#editarMedioPagoPedido").addEventListener("change", mostrarProductosPedidoEditando);
}

// Permite entrar al panel solo si el usuario activo es administrador.
function protegerAdmin() {
    let usuario = obtenerUsuarioActivo();

    if (usuario === null) {
        window.location = "login.html";
    } else if (usuario.rol !== "admin") {
        window.location = "tienda.html";
    }
}

// Obtiene una copia de los pedidos cargados desde el servidor.
function obtenerPedidos() { return structuredClone(datosServidor.pedidos); }

// Guarda la lista actualizada de pedidos.
async function guardarPedidos(pedidos) { await guardarEstadoServidor({pedidos}); }

// Muestra el historial de pedidos aplicando filtros y resumen de ventas.
function mostrarPedidosAdmin() {
    let pedidos = obtenerPedidos();
    let pedidosFiltrados = filtrarPedidos(pedidos);
    let html = "";

    if (filtroPedidosPendientesActivo === true) {
        pedidosFiltrados = obtenerPedidosPendientes(pedidosFiltrados);
        html = `
            <div class="aviso-pedidos-pendientes">
                <span>Mostrando pedidos nuevos y pendientes.</span>
                <input type="button" value="Ver todos" id="btnVerTodosPedidos" class="btn-form-admin">
            </div>
        `;
    }

    mostrarResumenVentas(pedidos, pedidosFiltrados);

    if (pedidosFiltrados.length === 0) {
        html = html + "<p class='admin-vacio'>Todavía no hay pedidos registrados.</p>";
    } else {
        for (let i = pedidosFiltrados.length - 1; i >= 0; i--) {
            let pedido = pedidosFiltrados[i];
            let productosHtml = "";
            let estadoPedido = "Nuevo";
            let origenPedido = "Web";

            if (pedido.estado !== undefined) {
                estadoPedido = pedido.estado;
            }

            if (pedido.origen !== undefined) {
                origenPedido = pedido.origen;
            }

            for (let j = 0; j < pedido.productos.length; j++) {
                productosHtml += `
                    <li>${pedido.productos[j].nombre} x${pedido.productos[j].cantidad} - $${pedido.productos[j].subtotal}</li>
                `;
            }

            html += `
                <article class="pedido-admin">
                    <div class="pedido-admin-encabezado">
                        <h3>Pedido #${pedido.id}</h3>
                        <span>${pedido.fecha}</span>
                    </div>

                    <p><strong>Origen:</strong> ${origenPedido}</p>
                    ${mostrarCargadoPor(pedido)}
                    ${mostrarDatosPago(pedido)}

                    <div class="estado-pedido">
                        <label for="estadoPedido${pedido.id}">Estado</label>
                        <select id="estadoPedido${pedido.id}">
                            <option value="Nuevo" ${estadoPedido === "Nuevo" ? "selected" : ""}>Nuevo</option>
                            <option value="En preparación" ${estadoPedido === "En preparación" ? "selected" : ""}>En preparación</option>
                            <option value="Listo para retirar/enviar" ${estadoPedido === "Listo para retirar/enviar" ? "selected" : ""}>Listo para retirar/enviar</option>
                            <option value="Entregado" ${estadoPedido === "Entregado" ? "selected" : ""}>Entregado</option>
                            <option value="Cancelado" ${estadoPedido === "Cancelado" ? "selected" : ""}>Cancelado</option>
                        </select>
                    </div>

                    <p><strong>Cliente:</strong> ${pedido.cliente.nombre}</p>
                    <p><strong>Email:</strong> ${pedido.cliente.email}</p>
                    <p><strong>Teléfono:</strong> ${mostrarDatoOpcional(pedido.cliente.telefono, "Sin teléfono")}</p>

                    <ul>${productosHtml}</ul>

                    <p><strong>Total:</strong> $${pedido.total}</p>
                    <p><strong>Entrega:</strong> ${pedido.entrega.metodo}</p>

                    ${mostrarDatosEnvio(pedido)}

                    <div class="acciones-pedido-admin">
                        <input type="button" value="Editar" id="editarPedido${pedido.id}" class="btn-tabla-admin">
                        <input type="button" value="Eliminar" id="eliminarPedido${pedido.id}" class="btn-tabla-admin btn-eliminar-admin">
                    </div>
                </article>
            `;
        }
    }

    document.querySelector("#contenedorPedidos").innerHTML = html;

    if (document.querySelector("#btnVerTodosPedidos") !== null) {
        document.querySelector("#btnVerTodosPedidos").addEventListener("click", mostrarTodosLosPedidos);
    }

    for (let i = 0; i < pedidosFiltrados.length; i++) {
        document.querySelector("#estadoPedido" + pedidosFiltrados[i].id).addEventListener("change", async function () {
            await cambiarEstadoPedido(pedidosFiltrados[i].id, this.value);
        });

        document.querySelector("#editarPedido" + pedidosFiltrados[i].id).addEventListener("click", async function () {
            editarPedido(pedidosFiltrados[i].id);
        });

        document.querySelector("#eliminarPedido" + pedidosFiltrados[i].id).addEventListener("click", async function () {
            await eliminarPedido(pedidosFiltrados[i].id);
        });
    }
}

// Muestra quién cargó la venta cuando el pedido trae ese dato.
function mostrarCargadoPor(pedido) {
    let html = "";

    if (pedido.cargadoPor !== undefined && pedido.cargadoPor.nombre !== undefined) {
        html = `<p><strong>Cargado por:</strong> ${pedido.cargadoPor.nombre}</p>`;
    }

    return html;
}

// Devuelve solo los pedidos que coinciden con el filtro de día o mes.
function filtrarPedidos(pedidos) {
    let fechaElegida = document.querySelector("#filtroFechaPedidos").value;
    let mesElegido = document.querySelector("#filtroMesPedidos").value;
    let pedidosFiltrados = [];

    for (let i = 0; i < pedidos.length; i++) {
        let fechaPedido = obtenerFechaPedido(pedidos[i]);
        let incluir = true;

        if (fechaElegida !== "" && fechaPedido !== fechaElegida) {
            incluir = false;
        }

        if (mesElegido !== "" && fechaPedido.substring(0, 7) !== mesElegido) {
            incluir = false;
        }

        if (incluir === true) {
            pedidosFiltrados.push(pedidos[i]);
        }
    }

    return pedidosFiltrados;
}

// Obtiene la fecha interna de un pedido para poder filtrarlo.
function obtenerFechaPedido(pedido) {
    let fecha = "";

    if (pedido.fechaISO !== undefined) {
        fecha = pedido.fechaISO.substring(0, 10);
    } else {
        fecha = convertirFechaVisualAISO(pedido.fecha);
    }

    return fecha;
}

// Devuelve la fecha actual en formato local YYYY-MM-DD.
function obtenerFechaLocalISO() {
    let fecha = new Date();
    let anio = fecha.getFullYear();
    let mes = String(fecha.getMonth() + 1).padStart(2, "0");
    let dia = String(fecha.getDate()).padStart(2, "0");

    return anio + "-" + mes + "-" + dia;
}

// Convierte fechas antiguas visibles a formato YYYY-MM-DD.
function convertirFechaVisualAISO(fechaVisual) {
    let fecha = "";
    let partesFecha = String(fechaVisual).split(",")[0].trim().split("/");

    if (partesFecha.length === 3) {
        let dia = partesFecha[0].padStart(2, "0");
        let mes = partesFecha[1].padStart(2, "0");
        let anio = partesFecha[2];

        fecha = anio + "-" + mes + "-" + dia;
    }

    return fecha;
}

// Calcula totales, medios de pago y productos vendidos del resumen.
function mostrarResumenVentas(pedidos, pedidosFiltrados) {
    let hoy = obtenerFechaLocalISO();
    let hayFiltroActivo = document.querySelector("#filtroFechaPedidos").value !== "" || document.querySelector("#filtroMesPedidos").value !== "";
    let totalHoy = 0;
    let totalFiltro = 0;
    let totalEfectivo = 0;
    let totalTransferencia = 0;
    let totalMercadoPago = 0;
    let totalPagoPendiente = 0;
    let cantidadVentas = 0;
    let productosVendidos = {};

    for (let i = 0; i < pedidos.length; i++) {
        if (obtenerFechaPedido(pedidos[i]) === hoy && pedidoCuentaComoVenta(pedidos[i]) === true) {
            totalHoy = totalHoy + Number(pedidos[i].total);
        }
    }

    for (let i = 0; i < pedidosFiltrados.length; i++) {
        if (pedidoCuentaComoVenta(pedidosFiltrados[i]) === true) {
            cantidadVentas = cantidadVentas + 1;
            totalFiltro = totalFiltro + Number(pedidosFiltrados[i].total);
            sumarProductosVendidos(productosVendidos, pedidosFiltrados[i]);

            if (pedidosFiltrados[i].pago !== undefined && pedidosFiltrados[i].pago.medio === "Efectivo") {
                totalEfectivo = totalEfectivo + Number(pedidosFiltrados[i].total);
            } else if (pedidosFiltrados[i].pago !== undefined && pedidosFiltrados[i].pago.medio === "Transferencia bancaria") {
                totalTransferencia = totalTransferencia + Number(pedidosFiltrados[i].total);
            } else if (pedidosFiltrados[i].pago !== undefined && pedidosFiltrados[i].pago.medio === "Mercado Pago") {
                totalMercadoPago = totalMercadoPago + Number(pedidosFiltrados[i].total);
            } else if (obtenerEstadoPagoPedido(pedidosFiltrados[i]) === "Pendiente") {
                totalPagoPendiente = totalPagoPendiente + Number(pedidosFiltrados[i].total);
            }
        }
    }

    document.querySelector("#totalVentasHoy").innerHTML = "Vendido hoy: $" + totalHoy;
    document.querySelector("#totalVentasFiltro").innerHTML = "Total según filtro: $" + totalFiltro;
    document.querySelector("#totalVentasFiltro").style.display = hayFiltroActivo ? "block" : "none";
    document.querySelector("#totalEfectivoFiltro").innerHTML = "Efectivo: $" + totalEfectivo;
    document.querySelector("#totalTransferenciaFiltro").innerHTML = "Transferencia: $" + totalTransferencia;
    document.querySelector("#totalMercadoPagoFiltro").innerHTML = "Mercado Pago: $" + totalMercadoPago;
    document.querySelector("#totalPagoPendienteFiltro").innerHTML = "Pago pendiente: $" + totalPagoPendiente;
    document.querySelector("#cantidadVentasFiltro").innerHTML = "Cantidad de ventas: " + cantidadVentas;
    document.querySelector("#productosVendidosFiltro").innerHTML = armarProductosVendidosHTML(productosVendidos);
}

// Indica si un pedido debe sumar en los totales de ventas.
function pedidoCuentaComoVenta(pedido) {
    return pedido.estado !== "Cancelado";
}

// Acumula cantidades vendidas por nombre de producto.
function sumarProductosVendidos(productosVendidos, pedido) {
    for (let i = 0; i < pedido.productos.length; i++) {
        let nombre = pedido.productos[i].nombre;

        if (productosVendidos[nombre] === undefined) {
            productosVendidos[nombre] = 0;
        }

        productosVendidos[nombre] = productosVendidos[nombre] + Number(pedido.productos[i].cantidad);
    }
}

// Arma la lista visible de productos vendidos para el cierre de caja.
function armarProductosVendidosHTML(productosVendidos) {
    let html = "<p class='admin-vacio'>No hay productos vendidos en este filtro.</p>";
    let nombres = Object.keys(productosVendidos);

    if (nombres.length > 0) {
        html = "<ul>";

        for (let i = 0; i < nombres.length; i++) {
            html = html + "<li>" + nombres[i] + ": " + productosVendidos[nombres[i]] + "</li>";
        }

        html = html + "</ul>";
    }

    return html;
}

// Muestra un texto alternativo cuando un dato está vacío.
function mostrarDatoOpcional(dato, textoVacio) {
    let texto = dato;

    if (dato === undefined || dato === "") {
        texto = textoVacio;
    }

    return texto;
}

// Borra los filtros de día y mes del historial.
function limpiarFiltrosPedidos() {
    document.querySelector("#filtroFechaPedidos").value = "";
    document.querySelector("#filtroMesPedidos").value = "";
    filtroPedidosPendientesActivo = false;
    mostrarPedidosAdmin();
}

// Cambia el estado de un pedido desde el historial.
async function cambiarEstadoPedido(idPedido, nuevoEstado) {
    let pedidos = obtenerPedidos();

    for (let i = 0; i < pedidos.length; i++) {
        if (pedidos[i].id === idPedido) {
            pedidos[i].estado = nuevoEstado;
        }
    }

    await guardarPedidos(pedidos);
    mostrarDashboardAdmin();
    actualizarBandejaPedidos();
    mostrarPedidosAdmin();
}

// Muestra dirección, ciudad y referencia solo si el pedido es con envío.
function mostrarDatosEnvio(pedido) {
    let html = "";

    if (pedido.entrega.metodo === "Envío") {
        html = `
            <p><strong>Departamento:</strong> ${mostrarDatoOpcional(pedido.entrega.departamento, "Sin departamento")}</p>
            <p><strong>Dirección:</strong> ${pedido.entrega.direccion}</p>
            <p><strong>Ciudad o barrio:</strong> ${pedido.entrega.ciudad}</p>
            <p><strong>Código postal:</strong> ${mostrarDatoOpcional(pedido.entrega.codigoPostal, "Sin código postal")}</p>
            <p><strong>Referencia:</strong> ${pedido.entrega.referencia}</p>
        `;
    }

    return html;
}

// Muestra medio de pago, subtotal y ajuste si el pedido tiene esos datos.
function mostrarDatosPago(pedido) {
    let html = "";

    if (pedido.pago !== undefined) {
        html = `
            <p><strong>Medio de pago:</strong> ${obtenerMedioPagoPedido(pedido)}</p>
            <p><strong>Estado del pago:</strong> ${obtenerEstadoPagoPedido(pedido)}</p>
            <p><strong>Subtotal:</strong> $${pedido.pago.subtotal}</p>
        `;

        if (pedido.pago.ajuste > 0) {
            html = html + `<p><strong>Ajuste Mercado Pago:</strong> $${pedido.pago.ajuste}</p>`;
        }
    } else {
        html = "<p><strong>Medio de pago:</strong> Sin definir</p><p><strong>Estado del pago:</strong> Pendiente</p>";
    }

    return html;
}

// Borra todo el historial de pedidos con confirmación previa.
async function vaciarPedidos() {
 if (confirm('¿Querés borrar todos los pedidos guardados?')) {
  await guardarEstadoServidor({pedidos: [], vistos: []});
  mostrarDashboardAdmin(); actualizarBandejaPedidos(); mostrarPedidosAdmin();
 }
}

// Abre el modal de edición para el pedido elegido.
function editarPedido(idPedido) {
    let pedidos = obtenerPedidos();
    let pedido = buscarPedidoPorId(pedidos, idPedido);

    if (pedido !== null) {
        abrirModalEditarPedido(pedido);
    }
}

// Elimina un pedido puntual del historial.
async function eliminarPedido(idPedido) {
    let confirmar = confirm("¿Querés eliminar este pedido del historial?");

    if (confirmar === true) {
        let pedidos = obtenerPedidos();

        for (let i = 0; i < pedidos.length; i++) {
            if (pedidos[i].id === idPedido) {
                pedidos.splice(i, 1);
            }
        }

        await guardarPedidos(pedidos);
        mostrarDashboardAdmin();
        actualizarBandejaPedidos();
        mostrarPedidosAdmin();
    }
}

// Busca un pedido por id dentro de la lista guardada.
function buscarPedidoPorId(pedidos, idPedido) {
    let pedido = null;

    for (let i = 0; i < pedidos.length; i++) {
        if (pedidos[i].id === idPedido) {
            pedido = pedidos[i];
        }
    }

    return pedido;
}

// Devuelve el medio de pago de un pedido si existe.
function obtenerMedioPagoPedido(pedido) {
    let medio = "";

    if (pedido.pago !== undefined && pedido.pago.medio !== "") {
        medio = pedido.pago.medio;
    }

    if (medio === "Pago pendiente" || medio === "") {
        medio = "Sin definir";
    }

    return medio;
}

// Devuelve si el pago de un pedido está pendiente o pagado.
function obtenerEstadoPagoPedido(pedido) {
    let estado = "Pendiente";

    if (pedido.pago !== undefined && pedido.pago.estado !== undefined) {
        estado = pedido.pago.estado;
    }

    if (pedido.pago !== undefined && pedido.pago.medio === "Pago pendiente") {
        estado = "Pendiente";
    }

    return estado;
}

// Devuelve el valor exacto que debe seleccionarse en el formulario de edición.
function obtenerValorMedioPagoFormulario(pedido) {
    let medio = "";

    if (pedido.pago !== undefined && pedido.pago.medio !== undefined && pedido.pago.medio !== "Pago pendiente") {
        medio = pedido.pago.medio;
    }

    return medio;
}

// Carga los datos del pedido dentro del modal de edición.
function abrirModalEditarPedido(pedido) {
    pedidoEditandoId = pedido.id;
    productosPedidoEditando = copiarProductosPedido(pedido.productos);

    document.querySelector("#editarClientePedido").value = pedido.cliente.nombre;
    document.querySelector("#editarTelefonoPedido").value = mostrarDatoOpcional(pedido.cliente.telefono, "");
    document.querySelector("#editarOrigenPedido").value = pedido.origen === undefined ? "Web" : pedido.origen;
    document.querySelector("#editarEstadoPedido").value = pedido.estado === undefined ? "Nuevo" : pedido.estado;
    document.querySelector("#editarMedioPagoPedido").value = obtenerValorMedioPagoFormulario(pedido);
    document.querySelector("#editarEstadoPagoPedido").value = obtenerEstadoPagoPedido(pedido);
    document.querySelector("#editarEntregaPedido").value = pedido.entrega.metodo;
    document.querySelector("#editarDepartamentoPedido").value = mostrarDatoOpcional(pedido.entrega.departamento, "");
    document.querySelector("#editarDireccionPedido").value = mostrarDatoOpcional(pedido.entrega.direccion, "");
    document.querySelector("#editarCiudadPedido").value = mostrarDatoOpcional(pedido.entrega.ciudad, "");
    document.querySelector("#editarCodigoPostalPedido").value = mostrarDatoOpcional(pedido.entrega.codigoPostal, "");
    document.querySelector("#editarReferenciaPedido").value = mostrarDatoOpcional(pedido.entrega.referencia, "");

    cargarSelectProductoEditarPedido();
    mostrarProductosPedidoEditando();
    document.querySelector("#mensajeEditarPedido").innerHTML = "";
    document.querySelector("#modalEditarPedido").classList.add("active");
}

// Cierra el modal de edición y limpia sus datos temporales.
function cerrarModalEditarPedido() {
    document.querySelector("#modalEditarPedido").classList.remove("active");
    pedidoEditandoId = null;
    productosPedidoEditando = [];
}

// Crea una copia editable de los productos del pedido.
function copiarProductosPedido(productos) {
    let copia = [];

    for (let i = 0; i < productos.length; i++) {
        copia.push({
            id: productos[i].id,
            nombre: productos[i].nombre,
            precio: productos[i].precio,
            cantidad: productos[i].cantidad,
            subtotal: productos[i].subtotal,
            tipoLatita: productos[i].tipoLatita,
            indiceEsencia: productos[i].indiceEsencia
        });
    }

    return copia;
}

// Llena el selector de productos disponibles dentro del modal de edición.
function cargarSelectProductoEditarPedido() {
    let html = "";

    for (let i = 0; i < velas.length; i++) {
        html += `<option value="${velas[i].id}">${velas[i].nombre}</option>`;
    }

    document.querySelector("#productoNuevoEditarPedido").innerHTML = html;
    actualizarPrecioNuevoPedidoEditando();
}

// Completa el precio del producto nuevo dentro del modal de edición.
function actualizarPrecioNuevoPedidoEditando() {
    let producto = buscarProductoPorId(Number(document.querySelector("#productoNuevoEditarPedido").value));

    if (producto !== null && typeof producto.precio === "number") {
        document.querySelector("#precioNuevoEditarPedido").value = producto.precio;
    } else {
        document.querySelector("#precioNuevoEditarPedido").value = "";
    }
}

// Muestra los productos del pedido dentro del modal para editarlos.
function mostrarProductosPedidoEditando() {
    let html = "";

    if (productosPedidoEditando.length === 0) {
        html = "<p class='admin-vacio'>Este pedido no tiene productos cargados.</p>";
    } else {
        for (let i = 0; i < productosPedidoEditando.length; i++) {
            html += `
                <div class="producto-editar-pedido">
                    <input type="text" value="${prepararTextoParaInput(productosPedidoEditando[i].nombre)}" id="nombreProductoPedido${i}" aria-label="Nombre del producto">
                    <input type="number" min="0" value="${productosPedidoEditando[i].precio}" id="precioProductoPedido${i}" aria-label="Precio unitario">
                    <input type="number" min="1" value="${productosPedidoEditando[i].cantidad}" id="cantidadProductoPedido${i}" aria-label="Cantidad">
                    <strong id="subtotalProductoPedido${i}">$${calcularSubtotalLinea(productosPedidoEditando[i])}</strong>
                    <input type="button" value="Quitar" id="quitarProductoPedido${i}" class="btn-tabla-admin btn-eliminar-admin">
                </div>
            `;
        }
    }

    document.querySelector("#productosEditarPedido").innerHTML = html;
    document.querySelector("#totalEditarPedido").innerHTML = armarResumenPedidoEditando();

    for (let i = 0; i < productosPedidoEditando.length; i++) {
        document.querySelector("#nombreProductoPedido" + i).addEventListener("input", async function () {
            productosPedidoEditando[i].nombre = this.value;
        });

        document.querySelector("#precioProductoPedido" + i).addEventListener("input", async function () {
            productosPedidoEditando[i].precio = Number(this.value);
            actualizarSubtotalProductoPedido(i);
        });

        document.querySelector("#cantidadProductoPedido" + i).addEventListener("input", async function () {
            productosPedidoEditando[i].cantidad = Number(this.value);
            actualizarSubtotalProductoPedido(i);
        });

        document.querySelector("#quitarProductoPedido" + i).addEventListener("click", async function () {
            productosPedidoEditando.splice(i, 1);
            mostrarProductosPedidoEditando();
        });
    }
}

// Recalcula el subtotal de una línea editada del pedido.
function actualizarSubtotalProductoPedido(posicion) {
    productosPedidoEditando[posicion].subtotal = calcularSubtotalLinea(productosPedidoEditando[posicion]);
    document.querySelector("#subtotalProductoPedido" + posicion).innerHTML = "$" + productosPedidoEditando[posicion].subtotal;
    document.querySelector("#totalEditarPedido").innerHTML = armarResumenPedidoEditando();
}

// Agrega un producto nuevo al pedido que se está editando.
function agregarProductoAlPedidoEditando() {
    let producto = buscarProductoPorId(Number(document.querySelector("#productoNuevoEditarPedido").value));
    let precio = Number(document.querySelector("#precioNuevoEditarPedido").value);
    let cantidad = Number(document.querySelector("#cantidadNuevaEditarPedido").value);
    let mensaje = document.querySelector("#mensajeEditarPedido");

    if (producto === null || isNaN(precio) === true || precio <= 0 || cantidad <= 0) {
        mensaje.innerHTML = "Elegí un producto, precio y cantidad válidos.";
    } else {
        productosPedidoEditando.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: precio,
            cantidad: cantidad,
            subtotal: precio * cantidad
        });

        document.querySelector("#cantidadNuevaEditarPedido").value = 1;
        mensaje.innerHTML = "";
        mostrarProductosPedidoEditando();
    }
}

// Calcula el subtotal del pedido que se está editando.
function obtenerSubtotalPedidoEditando() {
    let subtotal = 0;

    for (let i = 0; i < productosPedidoEditando.length; i++) {
        subtotal = subtotal + calcularSubtotalLinea(productosPedidoEditando[i]);
    }

    return subtotal;
}

// Calcula el ajuste de Mercado Pago para el pedido editado.
function obtenerAjustePedidoEditando(subtotal) {
    let ajuste = 0;

    if (document.querySelector("#editarMedioPagoPedido").value === "Mercado Pago") {
        ajuste = subtotal * 0.10;
    }

    return Math.round(ajuste);
}

// Arma el resumen de subtotal, ajuste y total del pedido editado.
function armarResumenPedidoEditando() {
    let subtotal = obtenerSubtotalPedidoEditando();
    let ajuste = obtenerAjustePedidoEditando(subtotal);
    let total = subtotal + ajuste;
    let html = "Subtotal: $" + subtotal;

    if (ajuste > 0) {
        html = html + "<br>Ajuste Mercado Pago 10%: $" + ajuste;
    }

    html = html + "<br>Total: $" + total;

    return html;
}

// Guarda los cambios realizados desde el modal de edición.
async function guardarPedidoEditado(evento) {
    evento.preventDefault();

    let pedidos = obtenerPedidos();
    let pedido = buscarPedidoPorId(pedidos, pedidoEditandoId);
    let mensaje = document.querySelector("#mensajeEditarPedido");
    let subtotal = obtenerSubtotalPedidoEditando();
    let ajuste = obtenerAjustePedidoEditando(subtotal);

    if (pedido === null) {
        mensaje.innerHTML = "No se encontró el pedido.";
    } else if (productosPedidoEditando.length === 0) {
        mensaje.innerHTML = "El pedido necesita al menos un producto.";
    } else {
        pedido.cliente.nombre = document.querySelector("#editarClientePedido").value;
        pedido.cliente.telefono = document.querySelector("#editarTelefonoPedido").value;
        pedido.origen = document.querySelector("#editarOrigenPedido").value;
        pedido.estado = document.querySelector("#editarEstadoPedido").value;
        pedido.productos = prepararProductosPedidoEditado();
        pedido.total = subtotal + ajuste;

        pedido.pago = {
            medio: document.querySelector("#editarMedioPagoPedido").value,
            estado: document.querySelector("#editarEstadoPagoPedido").value,
            subtotal: subtotal,
            ajuste: ajuste,
            total: subtotal + ajuste
        };

        pedido.entrega.metodo = document.querySelector("#editarEntregaPedido").value;
        pedido.entrega.departamento = document.querySelector("#editarDepartamentoPedido").value;
        pedido.entrega.direccion = document.querySelector("#editarDireccionPedido").value;
        pedido.entrega.ciudad = document.querySelector("#editarCiudadPedido").value;
        pedido.entrega.codigoPostal = document.querySelector("#editarCodigoPostalPedido").value;
        pedido.entrega.referencia = document.querySelector("#editarReferenciaPedido").value;

        await guardarPedidos(pedidos);
        cerrarModalEditarPedido();
        mostrarDashboardAdmin();
        actualizarBandejaPedidos();
        mostrarPedidosAdmin();
    }
}

// Prepara los productos editados para guardarlos en el pedido.
function prepararProductosPedidoEditado() {
    let productos = [];

    for (let i = 0; i < productosPedidoEditando.length; i++) {
        productos.push({
            id: productosPedidoEditando[i].id,
            nombre: productosPedidoEditando[i].nombre,
            precio: Number(productosPedidoEditando[i].precio),
            cantidad: Number(productosPedidoEditando[i].cantidad),
            subtotal: calcularSubtotalLinea(productosPedidoEditando[i]),
            tipoLatita: productosPedidoEditando[i].tipoLatita,
            indiceEsencia: productosPedidoEditando[i].indiceEsencia
        });
    }

    return productos;
}

// Exporta a CSV los pedidos visibles según el filtro activo.
function exportarPedidosCSV() {
    let pedidos = filtrarPedidos(obtenerPedidos());
    let csv = "Fecha,Origen,Cargado por,Cliente,Telefono,Producto,Cantidad,Precio unitario,Subtotal,Medio de pago,Estado del pago,Ajuste Mercado Pago,Total,Estado,Entrega,Departamento,Direccion,Ciudad o barrio,Codigo postal\n";

    for (let i = 0; i < pedidos.length; i++) {
        for (let j = 0; j < pedidos[i].productos.length; j++) {
            csv = csv + armarLineaCSV(pedidos[i], pedidos[i].productos[j]);
        }
    }

    descargarArchivo("ventas-flamitas.csv", csv);
}

// Convierte un producto de un pedido en una línea del CSV.
function armarLineaCSV(pedido, producto) {
    let pago = obtenerPagoParaCSV(pedido);
    let origen = pedido.origen === undefined ? "Web" : pedido.origen;

    return [
        pedido.fecha,
        origen,
        obtenerNombreCargadoPor(pedido),
        pedido.cliente.nombre,
        mostrarDatoOpcional(pedido.cliente.telefono, ""),
        producto.nombre,
        producto.cantidad,
        producto.precio,
        producto.subtotal,
        pago.medio,
        pago.estado,
        pago.ajuste,
        pedido.total,
        pedido.estado,
        pedido.entrega.metodo,
        mostrarDatoOpcional(pedido.entrega.departamento, ""),
        mostrarDatoOpcional(pedido.entrega.direccion, ""),
        mostrarDatoOpcional(pedido.entrega.ciudad, ""),
        mostrarDatoOpcional(pedido.entrega.codigoPostal, "")
    ].map(escaparCSV).join(",") + "\n";
}

// Devuelve el nombre de quien cargó la venta para mostrarlo o exportarlo.
function obtenerNombreCargadoPor(pedido) {
    let nombre = "";

    if (pedido.cargadoPor !== undefined && pedido.cargadoPor.nombre !== undefined) {
        nombre = pedido.cargadoPor.nombre;
    }

    return nombre;
}

// Devuelve datos de pago seguros para exportar aunque falten campos.
function obtenerPagoParaCSV(pedido) {
    let pago = {
        medio: "Sin definir",
        estado: "Pendiente",
        ajuste: 0
    };

    if (pedido.pago !== undefined) {
        pago.medio = obtenerMedioPagoPedido(pedido);
        pago.estado = obtenerEstadoPagoPedido(pedido);
        pago.ajuste = pedido.pago.ajuste;
    }

    return pago;
}

// Escapa valores para que el CSV abra bien en planillas.
function escaparCSV(valor) {
    return '"' + String(valor).replace(/"/g, '""') + '"';
}

// Crea y descarga un archivo desde el navegador.
function descargarArchivo(nombreArchivo, contenido) {
    let archivo = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    let enlace = document.createElement("a");

    enlace.href = URL.createObjectURL(archivo);
    enlace.download = nombreArchivo;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
}

// Activa los botones del menú lateral del administrador.
function prepararMenuAdmin() {
    let botones = document.querySelectorAll(".admin-menu-boton");

    for (let i = 0; i < botones.length; i++) {
        botones[i].addEventListener("click", async function () {
            mostrarSeccionAdmin(botones[i].dataset.seccion);
        });
    }
}

// Actualiza el número rojo de la bandeja de pedidos del menú admin.
function actualizarBandejaPedidos() {
    let contador = document.querySelector("#contadorPedidosAdmin");
    let pendientes = obtenerPedidosPendientesNoVistos();

    if (contador !== null) {
        contador.innerHTML = pendientes.length;

        if (pendientes.length === 0) {
            contador.classList.add("sin-pedidos");
        } else {
            contador.classList.remove("sin-pedidos");
        }
    }
}

// Obtiene los ids de pedidos pendientes que ya fueron vistos desde la bandeja.
function obtenerPedidosVistos() { return [...datosServidor.vistos]; }

// Guarda los ids de pedidos que ya no deben mostrarse como notificación nueva.
async function guardarPedidosVistos(vistos) { await guardarEstadoServidor({vistos}); }

// Devuelve los pedidos pendientes que todavía no fueron abiertos desde la bandeja.
function obtenerPedidosPendientesNoVistos() {
    let pendientes = obtenerPedidosPendientes(obtenerPedidos());
    let vistos = obtenerPedidosVistos();
    let noVistos = [];

    for (let i = 0; i < pendientes.length; i++) {
        if (vistos.includes(pendientes[i].id) === false) {
            noVistos.push(pendientes[i]);
        }
    }

    return noVistos;
}

// Marca los pedidos pendientes actuales como vistos para limpiar la notificación.
async function marcarPedidosPendientesComoVistos() {
    let pendientes = obtenerPedidosPendientes(obtenerPedidos());
    let vistos = obtenerPedidosVistos();

    for (let i = 0; i < pendientes.length; i++) {
        if (vistos.includes(pendientes[i].id) === false) {
            vistos.push(pendientes[i].id);
        }
    }

    await guardarPedidosVistos(vistos);
}

// Abre el historial mostrando solo pedidos nuevos y pendientes.
async function mostrarPedidosPendientesDesdeBandeja() {
    filtroPedidosPendientesActivo = true;
    document.querySelector("#filtroFechaPedidos").value = "";
    document.querySelector("#filtroMesPedidos").value = "";
    await marcarPedidosPendientesComoVistos();
    actualizarBandejaPedidos();
    mostrarSeccionAdmin("pedidos");
    mostrarPedidosAdmin();
}

// Quita el filtro de pendientes para volver al historial completo.
function mostrarTodosLosPedidos() {
    filtroPedidosPendientesActivo = false;
    mostrarPedidosAdmin();
}

// Activa los botones rápidos del dashboard.
function prepararAtajosDashboard() {
    let atajos = document.querySelectorAll(".dashboard-atajo");

    for (let i = 0; i < atajos.length; i++) {
        atajos[i].addEventListener("click", async function () {
            mostrarSeccionAdmin(atajos[i].dataset.irSeccion);
        });
    }
}

// Muestra una sección del admin y oculta las demás.
function mostrarSeccionAdmin(seccion) {
    let botones = document.querySelectorAll(".admin-menu-boton");
    let secciones = document.querySelectorAll(".admin-seccion");

    for (let i = 0; i < botones.length; i++) {
        botones[i].classList.remove("active");
    }

    for (let i = 0; i < secciones.length; i++) {
        secciones[i].classList.remove("active");
    }

    document.querySelector("[data-seccion='" + seccion + "']").classList.add("active");
    document.querySelector("#seccion" + convertirNombreSeccion(seccion)).classList.add("active");
}

// Convierte el nombre del botón en el id de su sección.
function convertirNombreSeccion(seccion) {
    let nombre = "";

    if (seccion === "dashboard") {
        nombre = "Dashboard";
    } else if (seccion === "pedidos") {
        nombre = "Pedidos";
    } else if (seccion === "productos") {
        nombre = "Productos";
    } else if (seccion === "ventaManual") {
        nombre = "VentaManual";
    }

    return nombre;
}

// Calcula y muestra el resumen inicial del panel administrador.
function mostrarDashboardAdmin() {
    let pedidos = obtenerPedidos();
    let hoy = obtenerFechaLocalISO();
    let mesActual = hoy.substring(0, 7);
    let totalHoy = 0;
    let totalMes = 0;
    let pendientes = obtenerPedidosPendientes(pedidos);
    let productosBajoStock = obtenerProductosBajoStock();

    for (let i = 0; i < pedidos.length; i++) {
        if (pedidoCuentaComoVenta(pedidos[i]) === true) {
            let fechaPedido = obtenerFechaPedido(pedidos[i]);

            if (fechaPedido === hoy) {
                totalHoy = totalHoy + Number(pedidos[i].total);
            }

            if (fechaPedido.substring(0, 7) === mesActual) {
                totalMes = totalMes + Number(pedidos[i].total);
            }
        }
    }

    document.querySelector("#dashboardVendidoHoy").innerHTML = "$" + totalHoy;
    document.querySelector("#dashboardVendidoMes").innerHTML = "$" + totalMes;
    document.querySelector("#dashboardPedidosPendientes").innerHTML = pendientes.length;
    document.querySelector("#dashboardStockBajo").innerHTML = productosBajoStock.length;
    document.querySelector("#dashboardListaPedidos").innerHTML = armarPedidosPendientesDashboard(pendientes);
    document.querySelector("#dashboardListaStock").innerHTML = armarStockBajoDashboard(productosBajoStock);
    actualizarBandejaPedidos();
}

// Devuelve los pedidos que todavía requieren preparación, envío o retiro.
function obtenerPedidosPendientes(pedidos) {
    let pendientes = [];

    for (let i = 0; i < pedidos.length; i++) {
        let estado = pedidos[i].estado === undefined ? "Nuevo" : pedidos[i].estado;

        if (estado !== "Entregado" && estado !== "Cancelado") {
            pendientes.push(pedidos[i]);
        }
    }

    return pendientes;
}

// Devuelve productos y esencias que necesitan atención de stock.
function obtenerProductosBajoStock() {
    let alertas = [];

    for (let i = 0; i < velas.length; i++) {
        if (typeof velas[i].stock === "number" && velas[i].stock <= 3) {
            alertas.push({
                nombre: velas[i].nombre,
                detalle: "Stock disponible: " + velas[i].stock,
                estado: obtenerEstadoStock(velas[i].stock)
            });
        }
    }

    agregarAlertasStockEsencias(alertas, "mediana", esenciasLatitaMediana, "latitas medianas");
    agregarAlertasStockEsencias(alertas, "chica", esenciasLatitaChica, "latitas chicas");

    return alertas;
}

// Agrega al dashboard las esencias agotadas o con poco stock.
function agregarAlertasStockEsencias(alertas, tipoLatita, esencias, nombreGrupo) {
    for (let i = 0; i < esencias.length; i++) {
        let stock = obtenerStockEsencia(tipoLatita, i);

        if (esenciaTieneStockBajo(stock) === true) {
            let estado = obtenerEstadoStockEsencia(stock);
            let detalle = estado.texto === "Sin stock" ? "Sin stock para " + nombreGrupo + "." : "Comprar más esencia para " + nombreGrupo + ".";

            alertas.push({
                nombre: "Esencia: " + esencias[i],
                detalle: detalle,
                estado: estado
            });
        }
    }
}

// Arma una lista breve de los últimos pedidos pendientes.
function armarPedidosPendientesDashboard(pedidos) {
    let html = "<p class='admin-vacio'>No hay pedidos pendientes.</p>";

    if (pedidos.length > 0) {
        html = "<div class='dashboard-lista'>";

        for (let i = pedidos.length - 1; i >= 0 && i >= pedidos.length - 4; i--) {
            let estado = pedidos[i].estado === undefined ? "Nuevo" : pedidos[i].estado;
            let origen = pedidos[i].origen === undefined ? "Web" : pedidos[i].origen;

            html += `
                <article class="dashboard-item">
                    <div>
                        <strong>Pedido #${pedidos[i].id}</strong>
                        <span>${pedidos[i].cliente.nombre} · ${origen}</span>
                    </div>
                    <div>
                        <strong>$${pedidos[i].total}</strong>
                        <span>${estado}</span>
                    </div>
                </article>
            `;
        }

        html = html + "</div>";
    }

    return html;
}

// Arma una lista breve de productos y esencias que necesitan atención.
function armarStockBajoDashboard(alertas) {
    let html = "<p class='admin-vacio'>No hay stock bajo por ahora.</p>";

    if (alertas.length > 0) {
        html = "<div class='dashboard-lista'>";

        for (let i = 0; i < alertas.length && i < 4; i++) {
            html += `
                <article class="dashboard-item">
                    <div>
                        <strong>${alertas[i].nombre}</strong>
                        <span>${alertas[i].detalle}</span>
                    </div>
                    <span class="stock-estado ${alertas[i].estado.clase}">${alertas[i].estado.texto}</span>
                </article>
            `;
        }

        html = html + "</div>";
    }

    return html;
}

// Muestra una edición compacta para modificar un producto por vez.
async function mostrarProductosAdmin() {
    let html = "<p class='admin-vacio'>Todavía no hay productos cargados.</p>";

    if (velas.length > 0) {
        if (productoAdminSeleccionadoId === null || buscarProductoPorId(productoAdminSeleccionadoId) === null) {
            productoAdminSeleccionadoId = velas[0].id;
        }

        html = `
            <details class="producto-admin-nuevo producto-admin-edicion" ${edicionProductoAdminAbierta === true ? "open" : ""}>
                <summary>Modificación de stock</summary>
                <div class="producto-admin-selector">
                    <label for="selectorProductoAdmin">Elegí un producto</label>
                    <select id="selectorProductoAdmin">
                        ${armarOpcionesProductosAdmin()}
                    </select>
                </div>
                <div id="productoSeleccionadoAdmin">
                    ${armarProductoSeleccionadoAdmin(productoAdminSeleccionadoId)}
                </div>
            </details>
        `;
    }

    document.querySelector("#contenedorProductosAdmin").innerHTML = html;

    if (velas.length > 0) {
        conectarEventosProductoSeleccionadoAdmin(productoAdminSeleccionadoId);
        document.querySelector(".producto-admin-edicion").addEventListener("toggle", function () {
            edicionProductoAdminAbierta = this.open;
        });

        document.querySelector("#selectorProductoAdmin").addEventListener("change", function () {
            edicionProductoAdminAbierta = true;
            productoAdminSeleccionadoId = Number(this.value);
            document.querySelector("#productoSeleccionadoAdmin").innerHTML = armarProductoSeleccionadoAdmin(productoAdminSeleccionadoId);
            conectarEventosProductoSeleccionadoAdmin(productoAdminSeleccionadoId);
        });
    }
}

// Arma el combo con los productos disponibles para editar.
function armarOpcionesProductosAdmin() {
    let html = "";

    for (let i = 0; i < velas.length; i++) {
        let seleccionado = velas[i].id === productoAdminSeleccionadoId ? "selected" : "";
        html += `<option value="${velas[i].id}" ${seleccionado}>${velas[i].nombre}</option>`;
    }

    return html;
}

// Arma la tarjeta de edición del producto elegido.
function armarProductoSeleccionadoAdmin(idProducto) {
    let producto = buscarProductoPorId(idProducto);

    if (producto === null) {
        return "<p class='admin-vacio'>Elegí un producto para modificar.</p>";
    }

    let estado = obtenerEstadoStock(producto.stock);

    return `
        <div class="producto-admin-edicion-card">
            <label for="nombreEditar${producto.id}">Nombre</label>
            <input type="text" value="${prepararTextoParaInput(producto.nombre)}" id="nombreEditar${producto.id}" class="input-tabla-admin">

            <label for="detalleEditar${producto.id}">Detalle</label>
            <textarea id="detalleEditar${producto.id}" class="textarea-tabla-admin">${producto.descripcion}</textarea>

            <label for="precioEditar${producto.id}">Precio</label>
            <input type="text" value="${producto.precio}" id="precioEditar${producto.id}" class="input-tabla-admin input-precio-admin">

            <label for="stockEditar${producto.id}">Stock</label>
            <input type="text" value="${producto.stock}" id="stockEditar${producto.id}" class="input-tabla-admin input-stock-admin">

            <label>Estado</label>
            <span class="stock-estado ${estado.clase}">${estado.texto}</span>

            <label for="fotoEditar${producto.id}">Foto</label>
            <input type="file" id="fotoEditar${producto.id}" class="input-foto-tabla" accept="image/*">

            <div class="acciones-tabla-admin producto-admin-acciones">
                <input type="button" value="Guardar" id="guardarProducto${producto.id}" class="btn-tabla-admin">
                <input type="button" value="Eliminar" id="eliminarProducto${producto.id}" class="btn-tabla-admin btn-eliminar-admin">
            </div>
        </div>
    `;
}

// Conecta los botones de guardar y eliminar del producto elegido.
function conectarEventosProductoSeleccionadoAdmin(idProducto) {
    document.querySelector("#guardarProducto" + idProducto).addEventListener("click", async function () {
        await editarProductoAdmin(idProducto);
    });

    document.querySelector("#eliminarProducto" + idProducto).addEventListener("click", async function () {
        await eliminarProductoAdmin(idProducto);
    });
}

// Evita que las comillas rompan los campos de texto.
function prepararTextoParaInput(texto) {
    return String(texto).replace(/"/g, "&quot;");
}

// Toma los datos del formulario para crear un producto.
async function agregarProductoAdmin(evento) {
    evento.preventDefault();

    let foto = document.querySelector("#fotoProductoAdmin").files[0];
    let mensaje = document.querySelector("#mensajeProductoAdmin");

    if (foto === undefined) {
        mensaje.innerHTML = "Seleccioná una foto para el producto.";
    } else {
        let lector = new FileReader();

        lector.addEventListener("load", async function () {
            await guardarNuevoProductoAdmin(lector.result);
        });

        lector.readAsDataURL(foto);
    }
}

// Guarda un producto nuevo con imagen, precio y stock.
async function guardarNuevoProductoAdmin(imagenProducto) {
    let precio = convertirNumeroSiCorresponde(document.querySelector("#precioProductoAdmin").value);
    let stock = convertirNumeroSiCorresponde(document.querySelector("#stockProductoAdminNuevo").value);
    let mensaje = document.querySelector("#mensajeProductoAdmin");

    let nuevoProducto = new Vela(
        obtenerNuevoIdProducto(),
        document.querySelector("#nombreProductoAdmin").value,
        document.querySelector("#detalleProductoAdmin").value,
        precio,
        imagenProducto,
        stock
    );

    velas.push(nuevoProducto);
    productoAdminSeleccionadoId = nuevoProducto.id;
    await guardarProductosVelas();
    actualizarVistaProductos();

    document.querySelector("#formProductoAdmin").reset();
    mensaje.innerHTML = "Producto agregado a la tienda.";
}

// Edita un producto existente y permite cambiar su foto.
async function editarProductoAdmin(idProducto) {
    let foto = document.querySelector("#fotoEditar" + idProducto).files[0];

    if (foto === undefined) {
        await guardarEdicionProductoAdmin(idProducto, null);
    } else {
        let lector = new FileReader();

        lector.addEventListener("load", async function () {
            await guardarEdicionProductoAdmin(idProducto, lector.result);
        });

        lector.readAsDataURL(foto);
    }
}

// Guarda los cambios de nombre, detalle, precio, stock e imagen.
async function guardarEdicionProductoAdmin(idProducto, imagenNueva) {
    for (let i = 0; i < velas.length; i++) {
        if (velas[i].id === idProducto) {
            velas[i].nombre = document.querySelector("#nombreEditar" + idProducto).value;
            velas[i].descripcion = document.querySelector("#detalleEditar" + idProducto).value;
            velas[i].precio = convertirNumeroSiCorresponde(document.querySelector("#precioEditar" + idProducto).value);
            velas[i].stock = convertirNumeroSiCorresponde(document.querySelector("#stockEditar" + idProducto).value);

            if (imagenNueva !== null) {
                velas[i].imagen = imagenNueva;
            }
        }
    }

    await guardarProductosVelas();
    edicionProductoAdminAbierta = true;
    actualizarVistaProductos();
}

// Elimina un producto del catálogo con confirmación.
async function eliminarProductoAdmin(idProducto) {
    let confirmar = confirm("¿Querés eliminar este producto de la tienda?");

    if (confirmar === true) {
        for (let i = 0; i < velas.length; i++) {
            if (velas[i].id === idProducto) {
                velas.splice(i, 1);
            }
        }

        await guardarProductosVelas();
        productoAdminSeleccionadoId = velas.length > 0 ? velas[0].id : null;
        edicionProductoAdminAbierta = velas.length > 0;
        actualizarVistaProductos();
    }
}

// Refresca productos, stock de esencias, selector de venta y resumen.
function actualizarVistaProductos() {
    mostrarProductosAdmin();
    mostrarStockEsenciasAdmin();
    cargarSelectVentaManual();
    mostrarVentaManual();
    mostrarDashboardAdmin();
}

// Muestra tablas para controlar stock por esencia de latitas.
function mostrarStockEsenciasAdmin() {
    let html = `
        <div class="stock-esencias-grid">
            <div>
                <h4>Latitas medianas</h4>
                ${armarTablaEsenciasAdmin("mediana", esenciasLatitaMediana)}
            </div>
            <div>
                <h4>Latitas chicas</h4>
                ${armarTablaEsenciasAdmin("chica", esenciasLatitaChica)}
            </div>
        </div>
    `;

    document.querySelector("#contenedorStockEsencias").innerHTML = html;

    agregarEventosStockEsencias("mediana", esenciasLatitaMediana);
    agregarEventosStockEsencias("chica", esenciasLatitaChica);
}

// Arma la tabla de stock de esencias para un tipo de latita.
function armarTablaEsenciasAdmin(tipoLatita, esencias) {
    let html = `
        <table class="tabla-admin">
            <thead>
                <tr>
                    <th>Nombre de esencia</th>
                    <th>Stock</th>
                    <th>Estado</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;

    for (let i = 0; i < esencias.length; i++) {
        let stock = obtenerStockEsencia(tipoLatita, i);
        let estado = obtenerEstadoStockEsencia(stock);
        let valorSeleccionado = normalizarStockEsenciaParaSelector(stock);

        html = html + `
            <tr>
                <td data-label="Nombre de esencia">${esencias[i]}</td>
                <td data-label="Stock">
                    <select id="stockEsencia${tipoLatita}${i}" class="input-tabla-admin input-stock-admin">
                        <option value="Sí" ${valorSeleccionado === "Sí" ? "selected" : ""}>Sí</option>
                        <option value="No" ${valorSeleccionado === "No" ? "selected" : ""}>No</option>
                        <option value="Queda poco" ${valorSeleccionado === "Queda poco" ? "selected" : ""}>Queda poco</option>
                    </select>
                </td>
                <td data-label="Estado"><span class="stock-estado ${estado.clase}">${estado.texto}</span></td>
                <td data-label=""><input type="button" value="Guardar" id="guardarEsencia${tipoLatita}${i}" class="btn-tabla-admin"></td>
            </tr>
        `;
    }

    html = html + `
            </tbody>
        </table>
    `;

    return html;
}

// Conecta los botones de guardar stock de cada esencia.
async function agregarEventosStockEsencias(tipoLatita, esencias) {
    for (let i = 0; i < esencias.length; i++) {
        document.querySelector("#guardarEsencia" + tipoLatita + i).addEventListener("click", async function () {
            let valor = document.querySelector("#stockEsencia" + tipoLatita + i).value;
            await actualizarStockEsencia(tipoLatita, i, valor);
            mostrarStockEsenciasAdmin();
            mostrarDashboardAdmin();
        });
    }
}

// Calcula el siguiente id disponible para un producto nuevo.
function obtenerNuevoIdProducto() {
    let idMayor = 0;

    for (let i = 0; i < velas.length; i++) {
        if (Number(velas[i].id) > idMayor) {
            idMayor = Number(velas[i].id);
        }
    }

    return idMayor + 1;
}

// Convierte textos numéricos a número y deja textos como Consultar.
function convertirNumeroSiCorresponde(valor) {
    let resultado = valor;

    if (valor !== "" && isNaN(valor) === false) {
        resultado = Number(valor);
    }

    return resultado;
}

// Devuelve el estado visual del stock: ok, poco, sin stock o consultar.
function obtenerEstadoStock(stock) {
    let estado = {
        texto: "Consultar",
        clase: "stock-consultar"
    };

    if (stock === 0 || stock === "0") {
        estado.texto = "Sin stock";
        estado.clase = "stock-rojo";
    } else if (typeof stock === "number" && stock <= 3) {
        estado.texto = "Poco stock";
        estado.clase = "stock-amarillo";
    } else if (typeof stock === "number" && stock > 3) {
        estado.texto = "Stock OK";
        estado.clase = "stock-verde";
    }

    return estado;
}

// Normaliza el stock de esencia antiguo al nuevo selector simple.
function normalizarStockEsenciaParaSelector(stock) {
    let valor = "Sí";

    if (stock === 0 || stock === "0" || stock === "No") {
        valor = "No";
    } else if (stock === "Queda poco" || (typeof stock === "number" && stock <= 3)) {
        valor = "Queda poco";
    }

    return valor;
}

// Devuelve el estado visual del stock por esencia.
function obtenerEstadoStockEsencia(stock) {
    let valor = normalizarStockEsenciaParaSelector(stock);
    let estado = {
        texto: "Stock OK",
        clase: "stock-verde"
    };

    if (valor === "No") {
        estado.texto = "Sin stock";
        estado.clase = "stock-rojo";
    } else if (valor === "Queda poco") {
        estado.texto = "Queda poco";
        estado.clase = "stock-amarillo";
    }

    return estado;
}

// Indica si una esencia debe mostrarse como alerta del dashboard.
function esenciaTieneStockBajo(stock) {
    let valor = normalizarStockEsenciaParaSelector(stock);
    return valor === "No" || valor === "Queda poco";
}

// Carga los productos en el selector de venta manual.
function cargarSelectVentaManual() {
    let html = "";

    for (let i = 0; i < velas.length; i++) {
        html += `<option value="${velas[i].id}">${velas[i].nombre} - ${mostrarPrecioAdmin(velas[i].precio)}</option>`;
    }

    document.querySelector("#productoVentaManual").innerHTML = html;
    actualizarPrecioVentaManual();
}

// Completa el precio unitario al elegir un producto en venta manual.
function actualizarPrecioVentaManual() {
    let idProducto = Number(document.querySelector("#productoVentaManual").value);
    let producto = buscarProductoPorId(idProducto);
    let campoPrecio = document.querySelector("#precioVentaManual");

    if (producto !== null && typeof producto.precio === "number") {
        campoPrecio.value = producto.precio;
    } else {
        campoPrecio.value = "";
    }
}

// Agrega un producto a la venta manual en curso.
function agregarProductoVentaManual() {
    let idProducto = Number(document.querySelector("#productoVentaManual").value);
    let cantidad = Number(document.querySelector("#cantidadVentaManual").value);
    let precioUnitario = Number(document.querySelector("#precioVentaManual").value);
    let producto = buscarProductoPorId(idProducto);
    let mensaje = document.querySelector("#mensajeVentaManual");

    if (producto === null || cantidad <= 0) {
        mensaje.innerHTML = "Elegí un producto y una cantidad válida.";
    } else if (isNaN(precioUnitario) === true || precioUnitario <= 0) {
        mensaje.innerHTML = "Ingresá un precio unitario válido.";
    } else if (typeof producto.stock === "number" && cantidad + obtenerCantidadEnVentaManual(producto.id) > producto.stock) {
        mensaje.innerHTML = "No hay stock suficiente para esa cantidad.";
    } else {
        agregarLineaVentaManual(producto, cantidad, precioUnitario);
        document.querySelector("#cantidadVentaManual").value = 1;
        mensaje.innerHTML = "";
        mostrarVentaManual();
    }
}

// Cuenta cuánto de un producto ya está cargado en la venta manual.
function obtenerCantidadEnVentaManual(idProducto) {
    let cantidad = 0;

    for (let i = 0; i < productosVentaManual.length; i++) {
        if (productosVentaManual[i].id === idProducto) {
            cantidad = productosVentaManual[i].cantidad;
        }
    }

    return cantidad;
}

// Busca un producto del catálogo por id.
function buscarProductoPorId(idProducto) {
    let producto = null;

    for (let i = 0; i < velas.length; i++) {
        if (Number(velas[i].id) === Number(idProducto)) {
            producto = velas[i];
        }
    }

    return producto;
}

// Suma una línea a la venta manual o aumenta su cantidad.
function agregarLineaVentaManual(producto, cantidad, precioUnitario) {
    let posicion = -1;

    for (let i = 0; i < productosVentaManual.length; i++) {
        if (productosVentaManual[i].id === producto.id && productosVentaManual[i].precio === precioUnitario) {
            posicion = i;
        }
    }

    if (posicion === -1) {
        productosVentaManual.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: precioUnitario,
            cantidad: cantidad
        });
    } else {
        productosVentaManual[posicion].cantidad = productosVentaManual[posicion].cantidad + cantidad;
    }
}

// Muestra los productos agregados a la venta manual y su total.
function mostrarVentaManual() {
    let html = "";
    let subtotalVenta = obtenerSubtotalVentaManual();
    let ajusteMercadoPago = obtenerAjusteMercadoPago(subtotalVenta);
    let total = subtotalVenta + ajusteMercadoPago;

    if (productosVentaManual.length === 0) {
        html = "<p class='admin-vacio'>Todavía no agregaste productos a esta venta.</p>";
    } else {
        html = "<div class='venta-manual-lista'>";

        for (let i = 0; i < productosVentaManual.length; i++) {
            let subtotal = calcularSubtotalLinea(productosVentaManual[i]);

            html += `
                <div class="venta-manual-item">
                    <span>${productosVentaManual[i].nombre} x${productosVentaManual[i].cantidad}</span>
                    <strong>$${subtotal}</strong>
                    <input type="button" value="Quitar" id="quitarVentaManual${i}" class="btn-tabla-admin btn-eliminar-admin">
                </div>
            `;
        }

        html += "</div>";
    }

    document.querySelector("#listaVentaManual").innerHTML = html;
    document.querySelector("#totalVentaManual").innerHTML = armarResumenVentaManual(subtotalVenta, ajusteMercadoPago, total);

    for (let i = 0; i < productosVentaManual.length; i++) {
        document.querySelector("#quitarVentaManual" + i).addEventListener("click", async function () {
            productosVentaManual.splice(i, 1);
            mostrarVentaManual();
        });
    }
}

// Calcula el subtotal de una línea según precio y cantidad.
function calcularSubtotalLinea(producto) {
    let subtotal = 0;

    if (typeof producto.precio === "number") {
        subtotal = producto.precio * producto.cantidad;
    }

    return subtotal;
}

// Calcula el total final de la venta manual.
function obtenerTotalVentaManual() {
    return obtenerSubtotalVentaManual() + obtenerAjusteMercadoPago(obtenerSubtotalVentaManual());
}

// Calcula el subtotal sin ajuste de la venta manual.
function obtenerSubtotalVentaManual() {
    let total = 0;

    for (let i = 0; i < productosVentaManual.length; i++) {
        total = total + calcularSubtotalLinea(productosVentaManual[i]);
    }

    return total;
}

// Calcula el 10% extra si el pago es por Mercado Pago.
function obtenerAjusteMercadoPago(subtotal) {
    let ajuste = 0;

    if (document.querySelector("#medioPagoVentaManual").value === "Mercado Pago") {
        ajuste = subtotal * 0.10;
    }

    return Math.round(ajuste);
}

// Arma el resumen visible de subtotal, ajuste y total.
function armarResumenVentaManual(subtotal, ajuste, total) {
    let html = "Subtotal: $" + subtotal;

    if (ajuste > 0) {
        html = html + "<br>Ajuste Mercado Pago 10%: $" + ajuste;
    }

    html = html + "<br>Total: $" + total;

    return html;
}

// Guarda la venta manual como pedido y descuenta stock.
async function guardarVentaManual(evento) {
    evento.preventDefault();

    let mensaje = document.querySelector("#mensajeVentaManual");

    if (productosVentaManual.length === 0) {
        mensaje.innerHTML = "Agregá al menos un producto a la venta.";
    } else {
        descontarStockVentaManual();
        await crearPedidoVentaManual();
        productosVentaManual = [];
        document.querySelector("#formVentaManual").reset();
        document.querySelector("#cantidadVentaManual").value = 1;
        actualizarVistaProductos();
        mostrarPedidosAdmin();
        mostrarDashboardAdmin();
        actualizarBandejaPedidos();
        mensaje.innerHTML = "Venta manual guardada en pedidos.";
    }
}

// Descuenta stock de productos vendidos manualmente.
function descontarStockVentaManual() {
    for (let i = 0; i < productosVentaManual.length; i++) {
        for (let j = 0; j < velas.length; j++) {
            if (velas[j].id === productosVentaManual[i].id && typeof velas[j].stock === "number") {
                velas[j].stock = velas[j].stock - productosVentaManual[i].cantidad;

                if (velas[j].stock < 0) {
                    velas[j].stock = 0;
                }
            }
        }
    }
}

// Crea el pedido final a partir de la venta manual.
async function crearPedidoVentaManual() {
    let pedidos = obtenerPedidos();
    let productos = [];
    let usuario = obtenerUsuarioActivo();

    for (let i = 0; i < productosVentaManual.length; i++) {
        productos.push({
            nombre: productosVentaManual[i].nombre,
            precio: productosVentaManual[i].precio,
            cantidad: productosVentaManual[i].cantidad,
            subtotal: calcularSubtotalLinea(productosVentaManual[i])
        });
    }

    let pedido = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        fechaISO: obtenerFechaLocalISO(),
        estado: "Nuevo",
        origen: document.querySelector("#origenVentaManual").value,
        cargadoPor: {
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol
        },
        cliente: {
            nombre: document.querySelector("#clienteVentaManual").value,
            email: "Venta manual",
            telefono: document.querySelector("#telefonoVentaManual").value
        },
        productos: productos,
        total: obtenerTotalVentaManual(),
        pago: {
            medio: document.querySelector("#medioPagoVentaManual").value,
            estado: document.querySelector("#estadoPagoVentaManual").value,
            subtotal: obtenerSubtotalVentaManual(),
            ajuste: obtenerAjusteMercadoPago(obtenerSubtotalVentaManual()),
            total: obtenerTotalVentaManual()
        },
        entrega: {
            metodo: document.querySelector("#entregaVentaManual").value,
            departamento: document.querySelector("#departamentoVentaManual").value,
            direccion: document.querySelector("#direccionVentaManual").value,
            ciudad: document.querySelector("#ciudadVentaManual").value,
            codigoPostal: document.querySelector("#codigoPostalVentaManual").value,
            referencia: ""
        }
    };

    pedidos.push(pedido);
    await guardarEstadoServidor({pedidos, productos: velas});
}

// Muestra precios numéricos con signo peso y deja textos como Consultar.
function mostrarPrecioAdmin(precio) {
    let texto = precio;

    if (typeof precio === "number") {
        texto = "$" + precio;
    }

    return texto;
}
