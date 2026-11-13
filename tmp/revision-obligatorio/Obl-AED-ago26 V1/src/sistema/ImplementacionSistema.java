package sistema;

// Agregado Lu
import dominio.Despliegue;
import dominio.Region;
import tadlista.Lista;

// Agregar aquí nombres y números de estudiante de los integrantes del equipo
public class ImplementacionSistema implements Sistema {

    // FUNCIONALIDAD 01
    @Override
    public Retorno inicializarSistema() {
        // Agregado Lu
        this.desplieguesPorId = new Lista<>();
        this.codigosRegistrados = new Lista<>();
        this.regiones = new Lista<>();
        return Retorno.ok();
    }

    // FUNCIONALIDAD 02
    @Override
    public Retorno registrarDespliegue(String id, String codigo, String descripcion,
            boolean cuantizado, Modalidad modalidad) {
        // Validacion ERROR 1
        if (esVacio(id)
                || esVacio(codigo)
                || esVacio(descripcion)
                || modalidad == null) {

            return Retorno.error1();
        }

        // Validacion ERROR 2
        if (!codigoValido(codigo)) {
            return Retorno.error2();
        }

      
        // Validacion ERROR 3
        Lista<Despliegue> copia = this.desplieguesPorId.invertir();
        while (!copia.esVacia()) {
            Despliegue actual = copia.obtenerElemento(0);
            if (actual.getId().equals(id)) {
                return Retorno.error3();
            }
            // Debe estar dentro del while para evitar un bucle infinito
            copia.borrarInicio();
        }

        // Validacion ERROR 4
        Lista<String> copiaCodigos = this.codigosRegistrados.invertir();
        while (!copiaCodigos.esVacia()) {
            String actual = copiaCodigos.obtenerElemento(0);
            if (actual.equals(codigo)) {
                return Retorno.error4();
            }
            copiaCodigos.borrarInicio();
        }
        // Creamos el despliegue con los datos recibidos
        Despliegue nuevo = new Despliegue(id, codigo, descripcion, cuantizado, modalidad);

        // Guardamos el despliegue ordenado por ID
        this.desplieguesPorId.agregarOrd(nuevo);
        // Guardamos su codigo para detectar duplicados
        this.codigosRegistrados.agregarOrd(codigo);
        return Retorno.ok();
    }

    // FUNCIONALIDAD 03  
    //A futuro la idea es poder quitar la copia para que sea mas eficiente
    @Override
    public Retorno buscarDesplieguePorId(String id) {
        // Validacion ERROR 1
        if (esVacio(id)) {
            return Retorno.error1();
        }
        // Creamos una copia para recorrer
        Lista<Despliegue> copia = this.desplieguesPorId.invertir();
        while (!copia.esVacia()) {
            Despliegue actual = copia.obtenerElemento(0);
            if (actual.getId().equals(id)) {
                return Retorno.ok(actual.toString());
            }
            copia.borrarInicio();
        }
        // Validacion ERROR 2
        return Retorno.error2();
    }

    // FUNCIONALIDAD 04
    @Override
    public Retorno listarDesplieguesPorIdAscendente() {
        return Retorno.noImplementada();
    }

    // FUNCIONALIDAD 05
    @Override
    public Retorno listarDesplieguesPorIdDescendente() {
        return Retorno.noImplementada();
    }

    // FUNCIONALIDAD 06
    @Override
    public Retorno buscarDesplieguePorCodigo(String codigo) {
        // Validacion ERROR 1
        if (esVacio(codigo)) {
            return Retorno.error1();
        }
        // Validacion ERROR 2
        if (!codigoValido(codigo)) {
            return Retorno.error2();
        }
        // Buscamos el despliegue por codigo
        Lista<Despliegue> copia = this.desplieguesPorId.invertir();
        while (!copia.esVacia()) {
            Despliegue actual = copia.obtenerElemento(0);
            if (actual.getCodigo().equals(codigo)) {
                return Retorno.ok(actual.toString());
            }
            copia.borrarInicio();
        }
        // Validacion ERROR 3: No existe
        return Retorno.error3();
    }

    // FUNCIONALIDAD 07
    @Override
    public Retorno listarDesplieguesPorCodigoAscendente() {
        return Retorno.noImplementada();
    }

    // FUNCIONALIDAD 08
    @Override
    public Retorno listarDesplieguesPorModalidad(Modalidad unaModalidad) {
        return Retorno.noImplementada();
    }

    // FUNCIONALIDAD 09
    @Override
    public Retorno registrarRegion(String codigo, String nombre, String pais, String zona) {
        // Agregado Lu

        // Validacion ERROR 1
        if (esVacio(codigo)
                || esVacio(nombre)
                || esVacio(pais)
                || esVacio(zona)) {

            return Retorno.error1();
        }

        // Validacion ERROR 2
        // Creamos una copia de las regiones
        Lista<Region> copia = this.regiones.invertir();

        while (!copia.esVacia()) {

            Region actual = copia.obtenerElemento(0);

            if (actual.getCodigo().equals(codigo)) {
                return Retorno.error2();
            }

            copia.borrarInicio();
        }
            // Creamos la nueva region
        Region nueva = new Region(codigo, nombre, pais, zona);

        // Guardamos la region en la lista
        this.regiones.agregarOrd(nueva);

        return Retorno.ok();
    }

    // FUNCIONALIDAD 10
    @Override
    public Retorno obtenerRegion(String codigo) {
        // Agregado Lu

        // Validacion ERROR 1
        if (esVacio(codigo)) {
            return Retorno.error1();
        }

        // Creamos una copia para recorrer
        Lista<Region> copia = this.regiones.invertir();

        while (!copia.esVacia()) {

            Region actual = copia.obtenerElemento(0);

            // Si encontramos la region devolvemos OK
            if (actual.getCodigo().equals(codigo)) {
                return Retorno.ok(actual.toString());
            }

            copia.borrarInicio();
        }

        // Validacion ERROR 2
        return Retorno.error2();
    }

    // FUNCIONALIDAD 11
    @Override
    public Retorno solicitarDespliegueEnRegion(String idDespliegue, String codigoRegion) {
        return Retorno.noImplementada();
    }

    // FUNCIONALIDAD 12
    @Override
    public Retorno procesarSiguienteDespliegue(String codigoRegion) {
        return Retorno.noImplementada();
    }

    // FUNCIONALIDAD 13
    @Override
    public Retorno listarDesplieguesActivosDeRegion(String codigoRegion) {
        return Retorno.noImplementada();
    }

    // FUNCIONALIDAD 14
    @Override
    public Retorno retirarUltimoDespliegueProcesado(String codigoRegion) {
        return Retorno.noImplementada();
    }

    // Agregado Lu
    private Lista<Despliegue> desplieguesPorId;
    private Lista<String> codigosRegistrados;
    private Lista<Region> regiones;
    
    
    //MetodoS auxiliares para las validaciones 
    private boolean esVacio(String texto) {
        return texto == null || texto.trim().isEmpty();
    }

    private boolean codigoValido(String codigo) {
        return codigo != null
                && codigo.matches("[A-Z]{3}-[0-9]{3}-[A-Za-z0-9]{4}");
    }

}
