// Inicia la tienda cuando la página termina de cargar.


// Prepara productos, carrito, modales y formulario de entrega.
function inicioTienda() {
    iniciarTransferencia();
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
                <img loading="lazy" decoding="async" src="${obtenerRutaImagenProducto(unaVela.imagen)}" alt="${escaparHTML(unaVela.nombre)}">
                <h3>${escaparHTML(unaVela.nombre)}</h3>
                <details class="producto-detalle"><summary>Ver detalles</summary><p>${escaparHTML(unaVela.descripcion)}</p></details>
                <h4>${escaparHTML(textoPrecio)}</h4>
                ${lineaStock}
                <input type="button" value="${textoBoton}" id="btn${unaVela.id}">
            </div>
        `;
    }

    document.querySelector("#contenedorVelas").innerHTML = html || '<p class="catalogo-cargando">Estamos preparando el catálogo. Consultanos por WhatsApp.</p>';
    document.querySelector("#contenedorVelas").setAttribute("aria-busy", "false");

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

        if (stockDisponibleProducto(unaVela.id) === 0) {
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
    if (!imagen) return './img/producto-sin-foto.svg';
    let ruta = "./img/" + imagen;

    if (imagen.includes("data:image")) {
        ruta = imagen;
    }

    return ruta;
}

// Agrega una unidad de un producto común al carrito y baja su stock temporal.
function stockDisponibleProducto(id) {
 const producto = velas.find(p => p.id === id);
 if (!producto) return 0;
 if (typeof producto.stock !== 'number') return producto.stock;
 const reservado = carrito.reduce((sum, p) => sum + ((p.tipoLatita ? (p.tipoLatita === 'mediana' ? 4 : 5) : p.id) === id ? p.cantidad : 0), 0);
 return Math.max(0, producto.stock - reservado);
}
function agregarAlCarrito(idVela) {
 const producto = velas.find(p => p.id === idVela);
 if (!producto) return;
 if (typeof producto.precio !== 'number') { alert('Consultanos por WhatsApp para cotizar este producto.'); return; }
 if (stockDisponibleProducto(idVela) === 0) return;
 agregarProductoAlCarrito(producto, 1);
 mostrarVelas(); mostrarCarrito();
 mostrarConfirmacion("Producto agregado al carrito");
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
 carrito.splice(posicion, 1);
 mostrarVelas(); mostrarCarrito();
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
 const producto = carrito[posicion];
 if (!producto) return;
 if (producto.cantidad <= 1) return quitarDelCarrito(posicion);
 producto.cantidad--;
 mostrarVelas(); mostrarCarrito();
}

// Sube una unidad de un producto del carrito si hay stock disponible.
function subirCantidadCarrito(posicion) {
 const producto = carrito[posicion];
 if (!producto) return;
 if (producto.tipoLatita) {
  if (!puedeAgregarEsencia(producto.tipoLatita, producto.indiceEsencia, 1, obtenerStockEsencia(producto.tipoLatita, producto.indiceEsencia))) return;
 } else if (stockDisponibleProducto(producto.id) === 0) { alert('No hay stock suficiente.'); return; }
 producto.cantidad++; mostrarVelas(); mostrarCarrito();
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
        let textoStock = obtenerTextoStockEsencia(stock);
        let lineaStock = textoStock === "" ? "" : `<p>${textoStock}</p>`;
        let deshabilitado = stock === 0 ? "disabled" : "";

        html += `
            <div class="tarjeta-esencia">
                <h3>${esenciasLatitaMediana[i]}</h3>
                <p>Latita mediana de 80gr</p>
                <p>${velas.find(p => p.id === 4).precio}</p>
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
        let textoStock = obtenerTextoStockEsencia(stock);
        let lineaStock = textoStock === "" ? "" : `<p>${textoStock}</p>`;
        let deshabilitado = stock === 0 ? "disabled" : "";

        html += `
            <div class="tarjeta-esencia">
                <h3>${esenciasLatitaChica[i]}</h3>
                <p>Latita chica de 60gr</p>
                <p>${velas.find(p => p.id === 5).precio}</p>
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
        texto = "Stock disponible: " + stock;
    }

    if (stock === 0) {
        texto = "Agotada";
    }

    return texto;
}

// Controla si se puede agregar una esencia según su stock.
function puedeAgregarEsencia(tipoLatita, indiceEsencia, cantidad, stock) {
 if (!Number.isInteger(cantidad) || cantidad < 1) { alert('Ingresá una cantidad entera.'); return false; }
 const disponible = datosServidor.esencias.general
  ? stockDisponibleProducto(tipoLatita === 'mediana' ? 4 : 5)
  : typeof stock === 'number' ? stock - obtenerCantidadEsenciaEnCarrito(tipoLatita, indiceEsencia) : stock;
 if (typeof disponible === 'number' && cantidad > disponible) { alert('No hay stock suficiente de esa esencia.'); return false; }
 return true;
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
 try {
  const guardado = JSON.parse(sessionStorage.getItem('carritoPendienteFlamitas') || '[]');
  if (!Array.isArray(guardado)) throw new Error('Carrito inválido');
  carrito = [];
  for (const item of guardado) {
   if (!item || !Number.isInteger(item.cantidad) || item.cantidad < 1) continue;
   const variante = item.tipoLatita;
   if (variante && !['mediana', 'chica'].includes(variante)) continue;
   const producto = velas.find(p => p.id === (variante ? (variante === 'mediana' ? 4 : 5) : item.id));
   if (!producto || typeof producto.precio !== 'number') continue;
   let linea = {...producto};
   let disponible = stockDisponibleProducto(producto.id);
   if (variante) {
    const aromas = variante === 'mediana' ? esenciasLatitaMediana : esenciasLatitaChica;
    if (!Number.isInteger(item.indiceEsencia) || !aromas[item.indiceEsencia]) continue;
    linea = {...linea, id:'latita-'+variante+'-'+item.indiceEsencia, tipoLatita:variante, indiceEsencia:item.indiceEsencia, nombre:'Latita '+(variante==='mediana'?'Mediana':'Chica')+' - '+aromas[item.indiceEsencia]};
    if (!datosServidor.esencias.general) {
     const stock = obtenerStockEsencia(variante, item.indiceEsencia);
     disponible = typeof stock === 'number' ? stock-obtenerCantidadEsenciaEnCarrito(variante,item.indiceEsencia) : stock;
    }
   }
   const cantidad = typeof disponible === 'number' ? Math.min(item.cantidad,disponible) : item.cantidad;
   if (cantidad > 0) agregarProductoAlCarrito(linea,cantidad);
  }
 } catch { carrito = []; }
 try { sessionStorage.removeItem('carritoPendienteFlamitas'); } catch {}
}

// Abre el modal para completar retiro o envío.
function abrirModalEntrega() {
    if (pedidoTransferenciaGuardado) {
        const panel=document.querySelector('#datosTransferencia');
        document.querySelector('#formEntrega').insertBefore(panel,document.querySelector('label[for="estadoPagoEntrega"]'));
        document.querySelector('#transferenciaPedidoGuardado').hidden=true;
        pedidoTransferenciaGuardado=null;
        document.querySelector('#instruccionTransferencia').textContent='Primero enviá tu pedido con el botón del formulario. Después realizá la transferencia y usá el número de pedido como referencia.';
        document.querySelector('#estadoCopiaTransferencia').textContent='';
    }
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
  mostrarTransferenciaPedidoGuardado(pedido);
  const enlace = document.createElement('a'); enlace.href = 'https://wa.me/59897605718?text=' + mensaje; enlace.target = '_blank'; enlace.rel = 'noopener'; enlace.textContent = 'Enviar pedido #' + pedido.id + ' al WhatsApp de Flamitas';
  document.querySelector('#formEntrega').prepend(enlace);
  if (pedido.pago?.medio === 'Transferencia bancaria') {
   const destino = document.querySelector('#transferenciaPedidoGuardado'); destino.append(enlace); cerrarModalEntrega(); destino.scrollIntoView?.({block:'start',behavior:'smooth'});
  }
  carrito = []; solicitudPedido = crypto.randomUUID(); mostrarCarrito(); cerrarCarrito();
  mostrarConfirmacion('Pedido #' + pedido.id + ' recibido. Tocá el enlace de WhatsApp para coordinar.');
  try { await cargarDatosServidor(); mostrarVelas(); if(typeof cargarComprobantes === "function") await cargarComprobantes(false); }
  catch { alert('El pedido quedó guardado. No pudimos actualizar el catálogo; recargá la página antes de comprar nuevamente.'); }
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
    actualizarTransferencia();
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

    return escaparHTML(dato);
}

// Directorio de sitios oficiales: no envía datos ni inicia pagos automáticamente.
const institucionesTransferencia = [["BROU","https://www.brou.com.uy/"],["BHU","https://www.bhu.com.uy/"],["Itaú","https://www.itau.com.uy/"],["Santander","https://www.santander.com.uy/"],["Scotiabank","https://www.scotiabank.com.uy/"],["BBVA","https://www.bbva.com.uy/"],["HSBC","https://www.hsbc.com.uy/"],["Bandes","https://www.bandes.com.uy/"],["Banque Heritage","https://www.heritage.com.uy/"],["Banco Nación Argentina — Uruguay","https://www.bna.com.uy/"],["Citi — Uruguay","https://www.citibank.com/icg/sa/latam/uruguay/"],["Prex","https://www.prexcard.com/"],["MiDinero","https://www.midinero.com.uy/"],["Mercado Pago","https://www.mercadopago.com.uy/"]];
const cuentaFlamitas = '1001076725768';
let pedidoTransferenciaGuardado = null;
function iniciarTransferencia() {
 document.querySelector('#bancoTransferencia').addEventListener('change',actualizarBancoTransferencia);
 document.querySelector('#copiarCuentaTransferencia').addEventListener('click',()=>copiarTransferencia(false));
 document.querySelector('#copiarDatosTransferencia').addEventListener('click',()=>copiarTransferencia(true));
 actualizarTransferencia();
}
function actualizarTransferencia() {
 const panel=document.querySelector('#datosTransferencia');
 if(!panel || pedidoTransferenciaGuardado) return;
 panel.hidden=document.querySelector('#medioPagoEntrega').value!=='Transferencia bancaria';
}
function actualizarBancoTransferencia() {
 const valor=document.querySelector('#bancoTransferencia').value;
 const institucion=/^\d+$/.test(valor) ? institucionesTransferencia[Number(valor)] : null;
 const enlace=document.querySelector('#abrirBancoTransferencia');
 enlace.hidden=!institucion;enlace.removeAttribute('href');
 if(institucion){enlace.href=institucion[1];enlace.textContent='Abrir '+institucion[0]+' (nueva pestaña)';}
 document.querySelector('#ayudaBancoTransferencia').textContent=institucion && ['Prex','MiDinero','Mercado Pago'].includes(institucion[0]) ? 'Para transferir, abrí la app de '+institucion[0]+'. Este enlace abre su sitio oficial, sin completar ni confirmar el pago.' : 'Desde tu banca web o app, elegí Mercado Pago como destino si está disponible para tu cuenta. Si no aparece, consultá con tu institución o coordiná con Flamitas.';
}
async function copiarTransferencia(completo) {
 const texto=completo ? 'Institución: Mercado Pago\nTitular: Silvia Andrea Rosales Gatto\nCuenta: '+cuentaFlamitas+'\nMoneda: UYU'+(pedidoTransferenciaGuardado ? '\nReferencia: Pedido #'+pedidoTransferenciaGuardado.id : '') : cuentaFlamitas;
 const estado=document.querySelector('#estadoCopiaTransferencia');
 try { if(!navigator.clipboard?.writeText)throw new Error('No disponible');await navigator.clipboard.writeText(texto);estado.textContent=completo?'Datos copiados.':'Número de cuenta copiado.'; }
 catch { estado.textContent='No pudimos copiar automáticamente. Seleccioná y copiá los datos que aparecen arriba.'; }
}
function mostrarTransferenciaPedidoGuardado(pedido) {
 if(pedido.pago?.medio!=='Transferencia bancaria')return;
 pedidoTransferenciaGuardado=pedido;
 const panel=document.querySelector('#datosTransferencia');const destino=document.querySelector('#transferenciaPedidoGuardado');
 destino.append(panel);destino.hidden=false;panel.hidden=false;
 document.querySelector('#instruccionTransferencia').textContent='Pedido #'+pedido.id+' guardado. Total del pedido: $'+pedido.total+' UYU. Usá Pedido #'+pedido.id+' como referencia y coordiná cualquier costo de envío pendiente antes de transferir.';
}
