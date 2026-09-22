// Inicia el formulario de contacto cuando la página termina de cargar.


// Conecta el envío del formulario con la función que guarda la consulta.
function iniciarContacto() {
    if (document.querySelector("#formContacto") !== null) {
        document.querySelector("#formContacto").addEventListener("submit", enviarConsultaContacto);
    }
}

// Guarda la consulta en PostgreSQL y abre el correo con el mensaje preparado.
let consultaEnviandose = false;
async function enviarConsultaContacto(evento) {
    evento.preventDefault();
    if (consultaEnviandose) return;

    let nombre = document.querySelector("#nombreContacto").value;
    let telefono = document.querySelector("#telefonoContacto").value;
    let email = document.querySelector("#emailContacto").value;
    let mensaje = document.querySelector("#mensajeContacto").value;
    let estado = document.querySelector("#mensajeContactoEstado");

    let consulta = {
        nombre: nombre,
        telefono: telefono,
        email: email,
        mensaje: mensaje,
        fecha: new Date().toLocaleString()
    };

    const boton = evento.target.querySelector('[type="submit"]');
    consultaEnviandose = true;
    if (boton) boton.disabled = true;
    try {
    await api('/api/contact', 'POST', consulta);

    let asunto = encodeURIComponent("Consulta desde la web de Flamitas");
    let cuerpo = encodeURIComponent(
        "Nombre: " + nombre + "\n" +
        "Telefono: " + telefono + "\n" +
        "Mail: " + email + "\n\n" +
        "Mensaje:\n" + mensaje
    );

    estado.innerHTML = "Tu consulta quedó guardada. También podés enviarla por mail.";
    document.querySelector("#formContacto").reset();
    window.location.href = "mailto:flamitasdehecate@gmail.com?subject=" + asunto + "&body=" + cuerpo;
    } catch (error) {
        estado.textContent = 'No pudimos confirmar el envío. ' + error.message;
    } finally {
        consultaEnviandose = false;
        if (boton) boton.disabled = false;
    }
}
