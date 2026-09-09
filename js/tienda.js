// Inicia la tienda cuando la página termina de cargar.


// Prepara productos, carrito, modales y formulario de entrega.
function inicioTienda() {
    recuperarCarritoPendiente();
    mostrarVelas();
    mostrarCarrito();
    document.querySelector("#btnCarrito").addEventListener("click", abrirCarrito);
    document.querySelector("#cerrarCarrito").addEventListener("click", cerrarCarrito);
    document.querySelector("#cerrarModalLatitas").addEventListener("click", cerrarModalLatitas);
    document.querySelector("#btnAgregarLatitas").addEventListener("click", agregarLatitasAlCarrito);
    document.querySelector("#cerrarModalLatitasChicas").addEventListener("click", cerrarModalLatitasChicas);
    document.querySelector("#btnAgregarLatitasChicas").addEventListener("click", agregarLatitasChicasAlCarrito);
    document.querySelector("#btnFinalizarPedido").addEventListener("click", finalizarPedidoWhatsApp);
    document.querySelector("#cerrarModalEntrega").addEventListener("click", cerrarModalEntrega);
    document.querySelector("#metodoEntrega").addEventListener("change", mostrarOcultarDatosEnvio);
    document.querySelector("#formEntrega").addEventListener("submit", enviarPedidoWhatsApp);
    document.querySelector("#medioPagoEntrega").addEventListener("change", actualizarResumenCheckout);
    document.querySelector("#estadoPagoEntrega").addEventListener("change", actualizarResumenCheckout);
    document.querySelector("#departamentoEntrega").addEventListener("change", actualizarResumenCheckout);
    document.querySelector("#direccionEntrega").addEventListener("input", actualizarResumenCheckout);
    document.querySelector("#ciudadEntrega").addEventListener("input", actualizarResumenCheckout);
    document.querySelector("#codigoPostalEntrega").addEventListener("input", actualizarResumenCheckout);
    document.querySelector("#referenciaEntrega").addEventListener("input", actualizarResumenCheckout);
    mostrarOcultarDatosEnvio();
}

// Muestra todos los productos disponibles en la tienda.
function mostrarVelas() {

    let html = "";

    for (let i = 0; i < velas.length; i++) {

        let unaVela = velas[i];
        let textoBoton = "Agregar al carrito";
        let textoPrecio = "$" + unaVela.precio;
        let usuario = obtenerUsuarioActivo();
        let textoStock = obtenerTextoStockProducto(unaVela, usuario);
        let lineaStock = textoStock === "" ? "" : `<p>${textoStock}</p>`;

        if (unaVela.id === 4) {
            textoBoton = "Elegir esencias";
        }

        if (unaVela.id === 5) {
            textoBoton = "Elegir esencias";
        }

        if (typeof unaVela.precio !== "number") {
            textoPrecio = unaVela.precio;
        }

        html += `
            <div class="producto">
                <img src="${obtenerRutaImagenProducto(unaVela.imagen)}" alt="${unaVela.nombre}">
                <h3>${unaVela.nombre}</h3>
                <p>${unaVela.descripcion}</p>
                <h4>${textoPrecio}</h4>
                ${lineaStock}
                <input type="button" value="${textoBoton}" id="btn${unaVela.id}">
            </div>
        `;
    }

    document.querySelector("#contenedorVelas").innerHTML = html;

    for (let i = 0; i < velas.length; i++) {
        let unaVela = velas[i];
        document.querySelector("#btn" + unaVela.id).addEventListener("click", function () {
            if (unaVela.id === 4) {
                abrirModalLatitas();
            } else if (unaVela.id === 5) {
                abrirModalLatitasChicas();
            } else {
                agregarAlCarrito(unaVela.id);
            }
        });

        if (unaVela.stock === 0) {
            document.querySelector("#btn" + unaVela.id).disabled = true;
            document.querySelector("#btn" + unaVela.id).value = "Sin stock";
        }
    }
}

// Decide qué stock se muestra según el rol: admin ve cantidades, cliente solo ve agotado.
function obtenerTextoStockProducto(producto, usuario) {
    if (usuario !== null && usuario.rol === "admin") {
        return "Stock disponible: " + producto.stock;
    }

    if (producto.stock === 0) {
        return "Producto agotado";
    }

    return "";
}

// Decide si una imagen viene de la carpeta img o fue cargada desde el admin.
function obtenerRutaImagenProducto(imagen) {
    let ruta = "./img/" + imagen;

    if (imagen.includes("data:image")) {
        ruta = imagen;
    }

    return ruta;
}

// Agrega una unidad de un producto común al carrito y baja su stock temporal.
function agregarAlCarrito(idVela) {

    for (let i = 0; i < velas.length; i++) {

        if (velas[i].id === idVela) {

            if (velas[i].stock > 0) {
                agregarProductoAlCarrito(velas[i], 1);
                velas[i].stock = velas[i].stock - 1;
            }

        }
    }

    mostrarVelas();
    mostrarCarrito();
}

// Dibuja el panel del carrito con productos, cantidades, precios y total.
function mostrarCarrito() {

    let html = "";
    let total = 0;
    let cantidadArticulos = 0;

    if (carrito.length === 0) {
        html = "<p>Tu carrito está vacío.</p>";
    } else {

        for (let i = 0; i < carrito.length; i++) {
            let cantidad = 1;
            let subtotal = carrito[i].precio;

            if (carrito[i].cantidad !== undefined) {
                cantidad = carrito[i].cantidad;
            }

            cantidadArticulos = cantidadArticulos + cantidad;

            if (typeof carrito[i].precio === "number") {
                subtotal = carrito[i].precio * cantidad;
            }

            html += `
                <div class="item-carrito">
                    <div class="item-carrito-info">
                        <p class="item-carrito-nombre">${carrito[i].nombre}</p>
                        <div class="control-cantidad">
                            <input type="button" value="-" id="bajar${i}">
                            <span>${cantidad}</span>
                            <input type="button" value="+" id="subir${i}">
                        </div>
                    </div>
                    <div class="item-carrito-acciones">
                        <p class="item-carrito-precio">$${subtotal}</p>
                        <input type="button" value="Quitar" id="quitar${i}">
                    </div>
                </div>
            `;

            if (typeof carrito[i].precio === "number") {
                total = total + carrito[i].precio * cantidad;
            }
        }
    }

    document.querySelector("#contenedorCarrito").innerHTML = html;
    document.querySelector("#totalCarrito").innerHTML = "Total: $" + total;
    document.querySelector("#contadorCarrito").innerHTML = cantidadArticulos;

    for (let i = 0; i < carrito.length; i++) {
        document.querySelector("#bajar" + i).addEventListener("click", function () {
            bajarCantidadCarrito(i);
        });

        document.querySelector("#subir" + i).addEventListener("click", function () {
            subirCantidadCarrito(i);
        });

        document.querySelector("#quitar" + i).addEventListener("click", function () {
            quitarDelCarrito(i);
        });
    }
}

// Quita una línea completa del carrito y devuelve stock si corresponde.
function quitarDelCarrito(posicion) {

    let velaQuitada = carrito[posicion];
    let cantidad = 1;

    if (velaQuitada.cantidad !== undefined) {
        cantidad = velaQuitada.cantidad;
    }

    for (let i = 0; i < velas.length; i++) {
        if (velas[i].id === velaQuitada.id) {
            if (typeof velas[i].stock === "number") {
                velas[i].stock = velas[i].stock + cantidad;
            }
        }
    }

    carrito.splice(posicion, 1);

    mostrarVelas();
    mostrarCarrito();
}

// Busca si un producto ya existe en el carrito para no duplicarlo.
function buscarProductoEnCarrito(idProducto) {

    let posicion = -1;

    for (let i = 0; i < carrito.length; i++) {
        if (carrito[i].id === idProducto) {
            posicion = i;
        }
    }

    return posicion;
}

// Agrega un producto nuevo al carrito o aumenta su cantidad si ya existe.
function agregarProductoAlCarrito(producto, cantidad) {

    let posicion = buscarProductoEnCarrito(producto.id);

    if (posicion === -1) {

        let nuevoProducto = {
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: cantidad,
            tipoLatita: producto.tipoLatita,
            indiceEsencia: producto.indiceEsencia
        };

        carrito.push(nuevoProducto);
    } else {
        carrito[posicion].cantidad = carrito[posicion].cantidad + cantidad;
    }
}

// Baja una unidad de un producto del carrito.
function bajarCantidadCarrito(posicion) {

    let producto = carrito[posicion];
    let cantidad = 1;

    if (producto.cantidad !== undefined) {
        cantidad = producto.cantidad;
    }

    if (cantidad > 1) {
        producto.cantidad = cantidad - 1;

        for (let i = 0; i < velas.length; i++) {
            if (velas[i].id === producto.id) {
                if (typeof velas[i].stock === "number") {
                    velas[i].stock = velas[i].stock + 1;
                }
            }
        }

        mostrarVelas();
        mostrarCarrito();
    } else {
        quitarDelCarrito(posicion);
    }
}

// Sube una unidad de un producto del carrito si hay stock disponible.
function subirCantidadCarrito(posicion) {

    let producto = carrito[posicion];
    let cantidad = 1;
    let puedeSumar = true;

    if (producto.cantidad !== undefined) {
        cantidad = producto.cantidad;
    }

    if (producto.tipoLatita !== undefined) {
        let stockEsencia = obtenerStockEsencia(producto.tipoLatita, producto.indiceEsencia);

        if (esenciaEstaAgotada(stockEsencia) === true) {
            puedeSumar = false;
            alert("Esa esencia está agotada.");
        } else if (typeof stockEsencia === "number" && cantidad + 1 > stockEsencia) {
            puedeSumar = false;
            alert("No hay stock suficiente de esa esencia.");
        }
    } else {
        for (let i = 0; i < velas.length; i++) {
            if (velas[i].id === producto.id) {
                if (typeof velas[i].stock === "number") {
                    if (velas[i].stock > 0) {
                        velas[i].stock = velas[i].stock - 1;
                    } else {
                        puedeSumar = false;
                    }
                }
            }
        }
    }

    if (puedeSumar) {
        producto.cantidad = cantidad + 1;
        mostrarVelas();
        mostrarCarrito();
    }
}

// Abre el panel lateral del carrito.
function abrirCarrito() {
    document.querySelector("#panelCarrito").classList.add("active");
}

// Cierra el panel lateral del carrito.
function cerrarCarrito() {
    document.querySelector("#panelCarrito").classList.remove("active");
}

// Abre el modal para elegir esencias de latitas medianas.
function abrirModalLatitas() {

    let html = "";

    for (let i = 0; i < esenciasLatitaMediana.length; i++) {
        let stock = obtenerStockEsencia("mediana", i);
        let detalle = obtenerDetalleEsencia("mediana", i);
        let lineaDetalle = detalle === "" ? "" : `<p>${prepararTextoParaHTML(detalle)}</p>`;
        let textoStock = obtenerTextoStockEsencia(stock);
        let lineaStock = textoStock === "" ? "" : `<p>${textoStock}</p>`;
        let deshabilitado = esenciaEstaAgotada(stock) === true ? "disabled" : "";

        html += `
            <div class="tarjeta-esencia">
                <h3>${esenciasLatitaMediana[i]}</h3>
                <p>Latita mediana de 80gr</p>
                ${lineaDetalle}
                <p>$280</p>
                ${lineaStock}

                <label for="cantidadEsencia${i}">Cantidad:</label>
                <input type="number" min="0" value="0" id="cantidadEsencia${i}" ${deshabilitado}>
            </div>
        `;
    }

    document.querySelector("#contenedorEsenciasLatitas").innerHTML = html;
    document.querySelector("#modalLatitas").classList.add("active");
}

// Cierra el modal de latitas medianas.
function cerrarModalLatitas() {
    document.querySelector("#modalLatitas").classList.remove("active");
}

// Agrega al carrito las latitas medianas elegidas por esencia.
function agregarLatitasAlCarrito() {

    for (let i = 0; i < esenciasLatitaMediana.length; i++) {

        let cantidad = Number(document.querySelector("#cantidadEsencia" + i).value);
        let stock = obtenerStockEsencia("mediana", i);

        if (cantidad > 0 && puedeAgregarEsencia("mediana", i, cantidad, stock)) {

            let latitaElegida = {
                id: "latita-mediana-" + i,
                nombre: "Latita Mediana - " + esenciasLatitaMediana[i],
                precio: velas.find(p => p.id === 4).precio,
                tipoLatita: "mediana",
                indiceEsencia: i
            };

            agregarProductoAlCarrito(latitaElegida, cantidad);
        }
    }

    cerrarModalLatitas();
    mostrarCarrito();
    abrirCarrito();
}

// Abre el modal para elegir esencias de latitas chicas.
function abrirModalLatitasChicas() {

    let html = "";

    for (let i = 0; i < esenciasLatitaChica.length; i++) {
        let stock = obtenerStockEsencia("chica", i);
        let detalle = obtenerDetalleEsencia("chica", i);
        let lineaDetalle = detalle === "" ? "" : `<p>${prepararTextoParaHTML(detalle)}</p>`;
        let textoStock = obtenerTextoStockEsencia(stock);
        let lineaStock = textoStock === "" ? "" : `<p>${textoStock}</p>`;
        let deshabilitado = esenciaEstaAgotada(stock) === true ? "disabled" : "";

        html += `
            <div class="tarjeta-esencia">
                <h3>${esenciasLatitaChica[i]}</h3>
                <p>Latita chica de 60gr</p>
                ${lineaDetalle}
                <p>$240</p>
                ${lineaStock}

                <label for="cantidadEsenciaChica${i}">Cantidad:</label>
                <input type="number" min="0" value="0" id="cantidadEsenciaChica${i}" ${deshabilitado}>
            </div>
        `;
    }

    document.querySelector("#contenedorEsenciasLatitasChicas").innerHTML = html;
    document.querySelector("#modalLatitasChicas").classList.add("active");
}

// Cierra el modal de latitas chicas.
function cerrarModalLatitasChicas() {
    document.querySelector("#modalLatitasChicas").classList.remove("active");
}

// Agrega al carrito las latitas chicas elegidas por esencia.
function agregarLatitasChicasAlCarrito() {

    for (let i = 0; i < esenciasLatitaChica.length; i++) {

        let cantidad = Number(document.querySelector("#cantidadEsenciaChica" + i).value);
        let stock = obtenerStockEsencia("chica", i);

        if (cantidad > 0 && puedeAgregarEsencia("chica", i, cantidad, stock)) {

            let latitaElegida = {
                id: "latita-chica-" + i,
                nombre: "Latita Chica - " + esenciasLatitaChica[i],
                precio: velas.find(p => p.id === 5).precio,
                tipoLatita: "chica",
                indiceEsencia: i
            };

            agregarProductoAlCarrito(latitaElegida, cantidad);
        }
    }

    cerrarModalLatitasChicas();
    mostrarCarrito();
    abrirCarrito();
}

// Traduce el stock de una esencia a un texto visible para el cliente.
function obtenerTextoStockEsencia(stock) {
    let usuario = obtenerUsuarioActivo();
    let texto = "";

    if (usuario !== null && usuario.rol === "admin") {
        texto = "Stock: " + normalizarStockEsenciaTienda(stock);
    }

    if (esenciaEstaAgotada(stock) === true) {
        texto = "Agotada";
    }

    return texto;
}

// Controla si se puede agregar una esencia según su stock.
function puedeAgregarEsencia(tipoLatita, indiceEsencia, cantidad, stock) {
    let puede = true;

    if (esenciaEstaAgotada(stock) === true) {
        alert("Esa esencia está agotada.");
        puede = false;
    } else if (typeof stock === "number" && cantidad + obtenerCantidadEsenciaEnCarrito(tipoLatita, indiceEsencia) > stock) {
        alert("No hay stock suficiente de esa esencia.");
        puede = false;
    }

    return puede;
}

// Normaliza los estados de esencia para mostrarlos en la tienda.
function normalizarStockEsenciaTienda(stock) {
    let valor = "Sí";

    if (stock === 0 || stock === "0" || stock === "No") {
        valor = "No";
    } else if (stock === "Queda poco" || (typeof stock === "number" && stock <= 3)) {
        valor = "Queda poco";
    }

    return valor;
}

// Indica si una esencia debe bloquearse para la compra.
function esenciaEstaAgotada(stock) {
    return normalizarStockEsenciaTienda(stock) === "No";
}

// Cuenta cuántas unidades de una esencia ya hay en el carrito.
function obtenerCantidadEsenciaEnCarrito(tipoLatita, indiceEsencia) {
    let cantidad = 0;

    for (let i = 0; i < carrito.length; i++) {
        if (carrito[i].tipoLatita === tipoLatita && carrito[i].indiceEsencia === indiceEsencia) {
            cantidad = carrito[i].cantidad;
        }
    }

    return cantidad;
}

// Arma el mensaje de WhatsApp con todos los datos del pedido.
function armarMensajePedido(datosPedido) {
    let mensaje = "Hola! Quiero hacer este pedido:\n\n";
    let total = 0;
    let usuario = obtenerUsuarioActivo();

    if (usuario !== null) {
        mensaje = mensaje + "Cliente: " + usuario.nombre + "\n";
        mensaje = mensaje + "Email: " + usuario.email + "\n";
        mensaje = mensaje + "Teléfono: " + usuario.telefono + "\n\n";
    }

    for (let i = 0; i < carrito.length; i++) {
        let cantidad = 1;
        let subtotal = carrito[i].precio;

        if (carrito[i].cantidad !== undefined) {
            cantidad = carrito[i].cantidad;
        }

        if (typeof carrito[i].precio === "number") {
            subtotal = carrito[i].precio * cantidad;
            total = total + subtotal;
        }

        mensaje = mensaje + "- " + carrito[i].nombre + " x" + cantidad + " - $" + subtotal + "\n";
    }

    mensaje = mensaje + "\nTotal: $" + total;
    mensaje = mensaje + "\n\nEntrega: " + datosPedido.entrega.metodo;
    mensaje = mensaje + "\nPago: " + datosPedido.pago.estado;

    if (datosPedido.pago.medio !== "") {
        mensaje = mensaje + " - " + datosPedido.pago.medio;
    }

    if (datosPedido.entrega.metodo === "Envío") {
        mensaje = mensaje + "\nDepartamento: " + datosPedido.entrega.departamento;
        mensaje = mensaje + "\nDirección: " + datosPedido.entrega.direccion;
        mensaje = mensaje + "\nCiudad o barrio: " + datosPedido.entrega.ciudad;
        mensaje = mensaje + "\nCódigo postal: " + datosPedido.entrega.codigoPostal;

        if (datosPedido.entrega.referencia !== "") {
            mensaje = mensaje + "\nReferencia: " + datosPedido.entrega.referencia;
        }
    }

    return encodeURIComponent(mensaje);
}

// Calcula el total actual del carrito.
function obtenerTotalCarrito() {
    let total = 0;

    for (let i = 0; i < carrito.length; i++) {
        let cantidad = 1;

        if (carrito[i].cantidad !== undefined) {
            cantidad = carrito[i].cantidad;
        }

        if (typeof carrito[i].precio === "number") {
            total = total + carrito[i].precio * cantidad;
        }
    }

    return total;
}

// El servidor calcula precios y guarda el pedido junto con el descuento de stock.
async function guardarPedido(datosPedido) {
 const pedido = await api('/api/orders', 'POST', {...datosPedido, requestId: solicitudPedido, productos: carrito.map(p => ({id:p.id, cantidad:p.cantidad ?? 1, tipoLatita:p.tipoLatita, indiceEsencia:p.indiceEsencia}))});
 return pedido;
}

// Descuenta el stock de esencias cuando se confirma un pedido con latitas.
// El servidor descuenta stock dentro de la transacción del pedido.

// Devuelve la fecha local en formato apto para filtros.
function obtenerFechaLocalISO() {
    let fecha = new Date();
    let anio = fecha.getFullYear();
    let mes = String(fecha.getMonth() + 1).padStart(2, "0");
    let dia = String(fecha.getDate()).padStart(2, "0");

    return anio + "-" + mes + "-" + dia;
}

// Abre el formulario de entrega si hay productos en el carrito.
function finalizarPedidoWhatsApp() {

    if (carrito.length === 0) {
        alert("Tu carrito está vacío.");
    } else if (obtenerUsuarioActivo() === null) {
        guardarCarritoPendiente();
        alert("Para finalizar la compra necesitás ingresar o registrarte. Te guardamos el carrito para que puedas continuar.");
        window.location = "login.html";
    } else {
        abrirModalEntrega();
    }
}

// Guarda el carrito antes de mandar a login para que no se pierda la selección.
function guardarCarritoPendiente() {
    sessionStorage.setItem("carritoPendienteFlamitas", JSON.stringify(carrito));
}

// Recupera el carrito si la persona volvió desde login o registro.
function recuperarCarritoPendiente() {
    let carritoGuardado = sessionStorage.getItem("carritoPendienteFlamitas");

    if (carritoGuardado !== null) {
        carrito = JSON.parse(carritoGuardado);
        sessionStorage.removeItem("carritoPendienteFlamitas");
    }
}

// Abre el modal para completar retiro o envío.
function abrirModalEntrega() {
    actualizarResumenCheckout();
    document.querySelector("#modalEntrega").classList.add("active");
}

// Cierra el modal de entrega.
function cerrarModalEntrega() {
    document.querySelector("#modalEntrega").classList.remove("active");
}

// Muestra datos de envío solo cuando el cliente elige envío.
function mostrarOcultarDatosEnvio() {
    let metodoEntrega = document.querySelector("#metodoEntrega").value;
    let datosEnvio = document.querySelector("#datosEnvio");

    if (metodoEntrega === "Envío") {
        datosEnvio.style.display = "flex";
    } else {
        datosEnvio.style.display = "none";
    }

    actualizarResumenCheckout();
}

// Guarda el pedido, abre WhatsApp y limpia el carrito.
let solicitudPedido = crypto.randomUUID();
let enviandoPedido = false;
async function enviarPedidoWhatsApp(evento) {
 evento.preventDefault();
 if (enviandoPedido) return;
 const datos = obtenerDatosCheckout();
 if (datos.entrega.metodo === 'Envío' && datosEnvioIncompletos(datos)) { alert('Completá los datos de envío.'); return; }
 enviandoPedido = true;
 const boton = evento.target.querySelector('[type=submit]'); boton.disabled = true;
 try {
  const pedido = await guardarPedido(datos);
  const mensaje = armarMensajePedidoGuardado(pedido);
  const enlace = document.createElement('a'); enlace.href = 'https://wa.me/?text=' + mensaje; enlace.target = '_blank'; enlace.rel = 'noopener'; enlace.textContent = 'Abrir WhatsApp para enviar el pedido #' + pedido.id;
  document.querySelector('#formEntrega').prepend(enlace);
  carrito = []; solicitudPedido = crypto.randomUUID(); mostrarCarrito(); cerrarCarrito();
  alert('Pedido #' + pedido.id + ' guardado. Tocá el enlace de WhatsApp para enviarlo.');
  await cargarDatosServidor(); mostrarVelas();
 } catch(error) { alert(error.message); } finally { enviandoPedido = false; boton.disabled = false; }
}

// Lee los campos del cierre de compra y los agrupa en un solo objeto.
function armarMensajePedidoGuardado(pedido) {
 const ajuste = pedido.pago.ajuste > 0 ? '\nAjuste Mercado Pago 10%: $' + pedido.pago.ajuste : '';
 return encodeURIComponent('Hola! Mi pedido #' + pedido.id + '\n' + pedido.productos.map(p => p.nombre + ' x' + p.cantidad + ' - $' + p.subtotal).join('\n') + '\nSubtotal: $' + pedido.pago.subtotal + ajuste + '\nTotal: $' + pedido.total + '\nEntrega: ' + pedido.entrega.metodo + '\nMedio de pago: ' + (pedido.pago.medio || 'A coordinar') + '\nPago pendiente de confirmación.');
}

function obtenerImportesCheckout(medio) {
 const subtotal = Math.round(obtenerTotalCarrito() * 100) / 100;
 const ajuste = medio === 'Mercado Pago' ? Math.round(subtotal * 0.10) : 0;
 return {subtotal, ajuste, total: Math.round((subtotal + ajuste) * 100) / 100};
}

function obtenerDatosCheckout() {
    return {
        entrega: {
            metodo: document.querySelector("#metodoEntrega").value,
            departamento: document.querySelector("#departamentoEntrega").value,
            direccion: document.querySelector("#direccionEntrega").value,
            ciudad: document.querySelector("#ciudadEntrega").value,
            codigoPostal: document.querySelector("#codigoPostalEntrega").value,
            referencia: document.querySelector("#referenciaEntrega").value
        },
        pago: {
            medio: document.querySelector("#medioPagoEntrega").value,
            estado: document.querySelector("#estadoPagoEntrega").value
        }
    };
}

// Indica si falta algún dato obligatorio para poder enviar el pedido.
function datosEnvioIncompletos(datosPedido) {
    return datosPedido.entrega.departamento === "" ||
        datosPedido.entrega.direccion === "" ||
        datosPedido.entrega.ciudad === "" ||
        datosPedido.entrega.codigoPostal === "";
}

// Actualiza el resumen visible dentro del modal de finalizar compra.
function actualizarResumenCheckout() {
    if (document.querySelector("#resumenPedidoCheckout") === null) {
        return;
    }

    let html = "";
    let datosPedido = obtenerDatosCheckout();

    for (let i = 0; i < carrito.length; i++) {
        let cantidad = carrito[i].cantidad === undefined ? 1 : carrito[i].cantidad;
        let subtotal = typeof carrito[i].precio === "number" ? carrito[i].precio * cantidad : carrito[i].precio;

        html = html + `
            <div class="linea-resumen-checkout">
                <span>${carrito[i].nombre} x${cantidad}</span>
                <strong>$${subtotal}</strong>
            </div>
        `;
    }

    if (html === "") {
        html = "<p>Tu carrito está vacío.</p>";
    }

    html = html + armarDetalleResumenCheckout(datosPedido);
    const importes = obtenerImportesCheckout(datosPedido.pago.medio);
    html += `<div class="linea-resumen-checkout"><span>Subtotal</span><strong>$${importes.subtotal}</strong></div>`;
    if (datosPedido.pago.medio === 'Mercado Pago') {
        html += `<div class="linea-resumen-checkout"><span>Ajuste Mercado Pago 10%</span><strong>$${importes.ajuste}</strong></div>`;
    }

    document.querySelector("#resumenPedidoCheckout").innerHTML = html;
    document.querySelector("#totalPedidoCheckout").textContent = "Total: $" + importes.total;
}

// Arma los datos de entrega y pago que aparecen en el resumen del checkout.
function armarDetalleResumenCheckout(datosPedido) {
    let textoPago = datosPedido.pago.medio === "" ? "A coordinar por WhatsApp" : datosPedido.pago.medio;
    let html = `
        <div class="detalle-resumen-checkout">
            <p><strong>Entrega:</strong> ${datosPedido.entrega.metodo}</p>
            <p><strong>Pago:</strong> ${datosPedido.pago.estado} - ${textoPago}</p>
    `;

    if (datosPedido.entrega.metodo === "Envío") {
        html = html + `
            <p><strong>Departamento:</strong> ${mostrarDatoResumen(datosPedido.entrega.departamento)}</p>
            <p><strong>Dirección:</strong> ${mostrarDatoResumen(datosPedido.entrega.direccion)}</p>
            <p><strong>Ciudad o barrio:</strong> ${mostrarDatoResumen(datosPedido.entrega.ciudad)}</p>
            <p><strong>Código postal:</strong> ${mostrarDatoResumen(datosPedido.entrega.codigoPostal)}</p>
            <p><strong>Referencia:</strong> ${mostrarDatoResumen(datosPedido.entrega.referencia)}</p>
        `;
    }

    html = html + "</div>";

    return html;
}

// Muestra un texto provisorio cuando todavía falta completar un dato.
function mostrarDatoResumen(dato) {
    if (dato === "") {
        return "Pendiente";
    }

    return dato;
}
