package sistema;

// Agregado Lu
import dominio.Despliegue;
import dominio.DesplieguePorCodigo;
import dominio.Region;
import tadlista.Lista;

// Agregar aquí nombres y números de estudiante de los integrantes del equipo
public class ImplementacionSistema implements Sistema {

    // FUNCIONALIDAD 01
    //LISTAS + ARRAY DE LISTAS + COLA + PILA
    @Override
    public Retorno inicializarSistema() {
        // Agregado Lu
        //Inicializamos la lista de desplegues ordenados por ID
        this.desplieguesPorId = new Lista<>();

        //Inicializamos la lista de desplegues ordenados por codigo
        this.desplieguePorCodigo = new Lista<>();

        //Iniciamos la lista de regiones
        this.regiones = new Lista<>();
        
        //Creamos un arreglo con una posicion para cada modalidad
        this.desplieguesPorModalidad =(Lista<DesplieguePorCodigo>[]) new Lista[5];

        //Cramos una lista vacia en cada posicion del arreglo
        for(int i = 0; i < this.desplieguesPorModalidad.length; i++){
            this.desplieguesPorModalidad[i] = new Lista<>();
        }
        return Retorno.ok();
    }

    // FUNCIONALIDAD 02
    //LISTAS ORDENADAS 
    @Override
    public Retorno registrarDespliegue(String id, String codigo, String descripcion,
            boolean cuantizado, Modalidad modalidad) {
        // Las validaciones se realizan en el orden indicado por la letra.
        // Si se encuentra un error, el metodo termina y devuelve ese error.
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
        // Creamos una copia invertida para recorrer los despliegues
        // sin modificar la lista original.
        Lista<Despliegue> copia = this.desplieguesPorId.invertir();
        while (!copia.esVacia()) {
            Despliegue actual = copia.obtenerElemento(0);
            if (actual.getId().equals(id)) {
                return Retorno.error3();
            }
            // Eliminamos el primer elemento de la copia para avanzar
            // al siguiente despliegue en la proxima iteracion.
            copia.borrarInicio();

        }

        // Validacion ERROR 4
        //Recorremos una copia de los despliegues ordenados por codigo
        //para comprobar que no exista otro con el mismo codigo
        Lista<DesplieguePorCodigo> copiaCodigos = this.desplieguePorCodigo.invertir();
        while (!copiaCodigos.esVacia()) {
            DesplieguePorCodigo actual = copiaCodigos.obtenerElemento(0);

            if (actual.getDespliegue().getCodigo().equals(codigo)) {
                return Retorno.error4();
            }
            copiaCodigos.borrarInicio();
        }
        // Creamos el despliegue con los datos recibidos
        Despliegue nuevo = new Despliegue(id, codigo, descripcion, cuantizado, modalidad);

        // Insertamos el despliegue manteniendo la lista ordenada por ID.
        this.desplieguesPorId.agregarOrd(nuevo);

        //Guardamos una referencia al despliegue, ordenada por codidigo
        this.desplieguePorCodigo.agregarOrd(new DesplieguePorCodigo(nuevo));

        //Guardamos el despliegue en la lista de su modalidad,
        //mantenemos el orden ascendente por codigo
       this.desplieguesPorModalidad[modalidad.getIndice()]
               .agregarOrd(new DesplieguePorCodigo(nuevo));
        return Retorno.ok();
    }

    // FUNCIONALIDAD 03
    //LISTA ORDENADA
    @Override
    public Retorno buscarDesplieguePorId(String id) {
        // Validacion ERROR 1
        if (esVacio(id)) {
            return Retorno.error1();
        }
        // Creamos una copia invertida para buscar el despliegue por ID
        // sin modificar la lista original.
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
    //LISTA DOBLEMENTE ENLAZADA (CUANDO LO DE EL PROFE, NECESITMAOS LOOS TADS)
    // Utilizamos una copia invertida y un arreglo para obtener
    // los despliegues en orden ascendente sin modificar la lista original
    @Override
    public Retorno listarDesplieguesPorIdAscendente() {

        //Obtenemos la cantidad de despliegues y creamos un arreglo 
        int cantidad = this.desplieguesPorId.cantElementos();
        String[] datos = new String[cantidad];
        int posicion = cantidad - 1;

        //Creamos una copia invertida de la lista original
        Lista<Despliegue> copia = this.desplieguesPorId.invertir();

        //Guardamos los despliegues desde el final del arreglo
        //para recuperar el orden ascendente por ID
        while (!copia.esVacia()) {
            Despliegue actual = copia.obtenerElemento(0);

            datos[posicion] = actual.toString();
            posicion--;

            copia.borrarInicio();
        }

        //Calculamos la cantidad de caracteres del listado
        int totalCaracteres = 0;

        for (int i = 0; i < datos.length; i++) {
            totalCaracteres += datos[i].length();
        }

        //Sumamos el especio necesario para los separadores
        if (datos.length > 0) {
            totalCaracteres += datos.length - 1;
        }

        //Creamos el arreglo con el espacio necesario
        char[] caracteres = new char[totalCaracteres];
        posicion = 0;

        //Copiamos los datos de cada despiegue al arreglo
        for (int i = 0; i < datos.length; i++) {
            String texto = datos[i];

            for (int j = 0; j < texto.length(); j++) {
                caracteres[posicion] = texto.charAt(j);
                posicion++;
            }

            //Agregamos el separador solo si quedan despliegues
            if (i < datos.length - 1) {
                caracteres[posicion] = '|';
                posicion++;
            }

        }
        //Convertimos el arreglo a String y devolvemos el listado
        String resultado = new String(caracteres);
        return Retorno.ok(resultado);
    }

    // FUNCIONALIDAD 05
    //LISTA DOBLEMENTE ENLAZADA (CUANDO LO DE EL PROFE, NECESITMAOS LOOS TADS)
    //A CONSIDERAR USAR RECUTSIVIDAD 
    @Override
    public Retorno listarDesplieguesPorIdDescendente() {
        //Agregado Lu
        int totalCaracteres = 0;
        int cantidadDespliegues = 0;

        //Creamos una copia invertida de la lista original
        Lista<Despliegue> copia = this.desplieguesPorId.invertir();

        //Calculamos la cantidad de caracteres del listado
        while (!copia.esVacia()) {
            Despliegue actual = copia.obtenerElemento(0);

            totalCaracteres += actual.toString().length();
            cantidadDespliegues++;

            copia.borrarInicio();
        }
        //Sumamos el espacio necesario para los separadores
        if (cantidadDespliegues > 0) {
            totalCaracteres += cantidadDespliegues - 1;
        }
        //Creamos un arreglo con el espacio necesario
        char[] caracteres = new char[totalCaracteres];
        int posicion = 0;

        //Creamos otra copia invertida, porque la anterior quedo vacia
        copia = this.desplieguesPorId.invertir();

        //Copiamos los datos de cada despliegue al arreglo
        while (!copia.esVacia()) {
            Despliegue actual = copia.obtenerElemento(0);
            String texto = actual.toString();

            for (int i = 0; i < texto.length(); i++) {
                caracteres[posicion] = texto.charAt(i);
                posicion++;
            }

            //Avanzamos al siguiente despliegue
            copia.borrarInicio();

            //Agregamos el separador solo si quedan despliegues
            if (!copia.esVacia()) {
                caracteres[posicion] = '|';
                posicion++;
            }
        }

        //Convertimos el arreglo a string y devolvemos el listado
        String resultado = new String(caracteres);
        return Retorno.ok(resultado);
    }

    // FUNCIONALIDAD 06
    //LISTA ORDENADA POR CODIGO
    @Override
    public Retorno buscarDesplieguePorCodigo(String codigo) {
        // Validacion ERROR 1
        //Verificamos que el codigo no sea nulo ni vacio
        if (esVacio(codigo)) {
            return Retorno.error1();
        }
        // Validacion ERROR 2
        //Verificamos que el codigo tenga el formato correcto
        if (!codigoValido(codigo)) {
            return Retorno.error2();
        }
        //Creamos una copia invertida para la lista ordenada
        //por codigo, sin modificar la lista original
        Lista<DesplieguePorCodigo> copia = this.desplieguePorCodigo.invertir();
        
        //Recorremos la copia buscando el codigo solicitado
        while (!copia.esVacia()) {
            //Obtenemos el elemento auxiliar
            DesplieguePorCodigo actual = copia.obtenerElemento(0);
            //Accedemos al despliegue original
            Despliegue despliegue = actual.getDespliegue();
            //Comprobamos si el codigo coincide
            if (despliegue.getCodigo().equals(codigo)) {
                return Retorno.ok(despliegue.toString());
            }
            //Avanzamos eliminando el primer nodo de la copia
            copia.borrarInicio();
        }
        // Validacion ERROR 3
        //No existe un despliegue con ese codigo
        return Retorno.error3();
    }

    // FUNCIONALIDAD 07
    //LISTA ORDENADA
    @Override
    public Retorno listarDesplieguesPorCodigoAscendente() {
        //Agregado Lu

        //Obtenemos la cantidad de despliegues y creamos un array
        int cantidad = this.desplieguePorCodigo.cantElementos();
        String[] datos = new String[cantidad];
        int posicion = cantidad - 1;

        //Cramos una copia invertida de los despliegues ordenados por codigo
        Lista<DesplieguePorCodigo> copia = this.desplieguePorCodigo.invertir();

        //Recorremos la copia y guardamos los despliegues
        //desde el final del arreglo para recuperar el orden ascendente
        while (!copia.esVacia()) {
            DesplieguePorCodigo actual = copia.obtenerElemento(0);

            datos[posicion] = actual.getDespliegue().toString();
            posicion--;

            copia.borrarInicio();
        }

        //Calculamos la cantidad de caracteres del listado
        int totalCaracteres = 0;

        for (int i = 0; i < datos.length; i++) {
            totalCaracteres += datos[i].length();
        }
        //Sumamos el espacio necesrio para los separadores 
        if (datos.length > 0) {
            totalCaracteres += datos.length - 1;
        }

        //Creamos el arreglo con el espacio necesario
        char[] caracteres = new char[totalCaracteres];

        //Indicamos la primera posicion disponible del arreglo
        int posicionCaracter = 0;

        //Recorremos los despliegues ordenados por codigo
        //y copiamos sus datos al arreglo
        for (int i = 0; i < datos.length; i++) {
            String texto = datos[i];

            for (int j = 0; j < texto.length(); j++) {
                caracteres[posicionCaracter] = texto.charAt(j);
                posicionCaracter++;
            }

            //Agregamos el separador solo si quedan despliegues
            if (i < datos.length - 1) {
                caracteres[posicionCaracter] = '|';
                posicionCaracter++;
            }

        }
        //Convertimos el arreglo a String y devolvemos el listado
        String resultado = new String(caracteres);
        return Retorno.ok(resultado);
    }

    // FUNCIONALIDAD 08
    //ARRAY DE LISTAS ORDENADAS
    @Override
    public Retorno listarDesplieguesPorModalidad(Modalidad unaModalidad) {
        
    // Validacion ERROR 1
    // Verificamos que la modalidad no sea nula.
    if (unaModalidad == null) {
        return Retorno.error1();
    }
   //Obtenemos la posicion correspondiente a la modalidad
    int indice = unaModalidad.getIndice();
    
    //Acedemos directamente a la lista de esa modalidad
    Lista<DesplieguePorCodigo> listaModalidad = this.desplieguesPorModalidad[indice];
     
    //Obtenemos la cantidad de despliegues de esta modalidad
    int cantidad = listaModalidad.cantElementos();
    
    //Creamos un arreglo para guardar sus datos
    String[] datos = new String[cantidad];
    
     // Indicamos la ultima posicion del arreglo
    // para recuperar el orden ascendente por codigo.
    int posicion = cantidad - 1;
    
    //Creamos una copia invertida de la lista en esta modalidad
    Lista<DesplieguePorCodigo> copia = listaModalidad.invertir();
    
    //Recorremos la copia y guardamos los despliegues
    //desde el final del arreglo para recuperar el orden ascendente
    while(!copia.esVacia()){
        DesplieguePorCodigo actual = copia.obtenerElemento(0);
        
        datos[posicion] = actual.getDespliegue().toString();
        posicion--;
        
        copia.borrarInicio();
    }
    
    //Calculamos la cantidad de caracteres del listado
    int totalCaracteres = 0;
    
    for(int i = 0; i < datos.length; i++){
        totalCaracteres += datos[i].length();
    }
    
    //Sumamos el espacio neceasario para los separadores
    if(datos.length > 0){
        totalCaracteres += datos.length -1;
    }
    //Creamos el arreglo con el epsacio necesario
    char[] caracteres = new char[totalCaracteres];
    
    //Indicamos la primera psicion disponible del arreglo
    int posicionCaracter = 0;
    
    //Recorremos los despliegues de la modalidad
    //y copiamos sus caracteres al arreglo
        for (int i = 0; i < datos.length; i++) {
           String texto = datos[i];
            
            for (int j = 0; j < texto.length(); j++) {
                caracteres[posicionCaracter] = texto.charAt(j);
                posicionCaracter++;
            }
            
            //Agregamos el separador solo si quedan despliegues
            if (i < datos.length -1){
                caracteres[posicionCaracter] = '|';
                posicionCaracter++;
            }
        }
       //Convertimos el arreglo en string y devolvemos el listado
       String resultado = new String(caracteres);
       return Retorno.ok(resultado);
    }

    // FUNCIONALIDAD 09
    //LISTA ORDENADA
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
        // Creamos una copia invertida para verificar si el codigo
        // de la region ya existe, sin modificar la lista original.
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
    //LISTA ORDENADA
    @Override
    public Retorno obtenerRegion(String codigo) {
        // Agregado Lu

        // Validacion ERROR 1
        if (esVacio(codigo)) {
            return Retorno.error1();
        }

        // Creamos una copia invertida para buscar la region por codigo
        // sin modificar la lista original.
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
    //IMPLEMENTAR COLA FIFO CUANDO EL PROFE LO DE, NOS FALTAN LOS TADS + LISTAS PARA VALIDAR
    //A CONSIDERAR USAR RECUTSIVIDAD
    @Override
    public Retorno solicitarDespliegueEnRegion(String idDespliegue, String codigoRegion) {
    //Validacion ERROR 1 
    //Validacion que el ID y el codigo de region no sean nulos ni vacios
    if(idDespliegue == null || idDespliegue.trim().isEmpty()
            || codigoRegion == null || codigoRegion.trim().isEmpty()){
    return Retorno.error1();
    }
    
    //Validacion ERROR 2
    //Buscamos el despliegue por su ID
    Despliegue despliegueEncontrado = null;
    
    Lista<Despliegue> copia = this.desplieguesPorId.invertir();
    
    while(!copia.esVacia() && despliegueEncontrado == null){
        Despliegue actual = copia.obtenerElemento(0);
        
        if(actual.getId().equals(idDespliegue)){
            despliegueEncontrado = actual;
        }
        copia.borrarInicio();
    }
    //Si no encontramos el despliegue, devolvemos ERROR 2
    if(despliegueEncontrado == null){
        return Retorno.error2();
    }
    
    //Validacion ERROR 3 
    Region regionEncontrada = null;
    
    Lista<Region> copiaRegiones = this.regiones.invertir();
    
    while(!copiaRegiones.esVacia() && regionEncontrada == null){
        Region actual = copiaRegiones.obtenerElemento(0);
        
        if(actual.getCodigo().equals(codigoRegion)){
            regionEncontrada = actual;
        }
        
        copiaRegiones.borrarInicio();
    }
    
    //Si no encontramos la region, deolvemos ERROR 3
    if(regionEncontrada == null){
        return Retorno.error3();
    }
    //Validacion ERROR 4
    //Verificamos si el despliegue ya tiene una solicitud
    //pendiente en esta region
    if(regionEncontrada.getSolicitudesPendientes()
            .tieneSolicitud(despliegueEncontrado)){
    return Retorno.error4();
    }
    //Veridicamos si el despliegue ya esta activo en esta region
    if(regionEncontrada.tieneDespliegueActivo(despliegueEncontrado)){
        return Retorno.error4();
    }
     // OK
     //Agregamos la solicitud al final de la cola en esta region
     regionEncontrada.getSolicitudesPendientes()
             .agregarSolicitud(despliegueEncontrado);
     //La solicitud se registro correctametne
     return Retorno.ok();
    }
  
    // FUNCIONALIDAD 12
    //COLA FIFO + LISTA DE ACTIVOS ORDENADA + PILA 
    @Override
    public Retorno procesarSiguienteDespliegue(String codigoRegion) {
    //Agregado Lu
    //Validacion ERROR 1
    //El codigo de la region no puede ser nulo ni vacio 
    if(esVacio(codigoRegion)){
        return Retorno.error1();
    }
    //Validacion ERROR 2
    //Buscamos la region en su codigo
    Region regionEncontrada = null;
    
    Lista<Region> copiaRegiones = this.regiones.invertir();
    
    while(!copiaRegiones.esVacia()
            && regionEncontrada == null){
    Region actual = copiaRegiones.obtenerElemento(0);
    
    if(actual.getCodigo().equals(codigoRegion)){
        regionEncontrada = actual;
    }
    copiaRegiones.borrarInicio();
    }
    //La region no existe
    if(regionEncontrada == null){
        return Retorno.error2();
    }
    
    //Validacion ERROR 3 
    //Extraemos la solicitud mas antigua de la cola 
    Despliegue despliegue = regionEncontrada
            .getSolicitudesPendientes()
            .extraerPrimeraSolicitud();
    
    //No habia solicitudes pendientes
    if(despliegue == null){
        return Retorno.error3();
    }
    //Activamos el despliegue en esta region
    //Se agrega a la lista ordenada de activos
    //y a la pila del historial de procesamiento
    regionEncontrada.activarDespliegue(despliegue);
    
    //Devolvemos los datos del despliegue procesado
    return Retorno.ok(despliegue.toString());
    }

    // FUNCIONALIDAD 13
    //LISTA ORDENADA POR CODIGO, POR REGION
    @Override
    public Retorno listarDesplieguesActivosDeRegion(String codigoRegion) {
        return Retorno.noImplementada();
    }

    // FUNCIONALIDAD 14
    //PILA LIFO + LISTA CON ELIMINACION
    @Override
    public Retorno retirarUltimoDespliegueProcesado(String codigoRegion) {
        return Retorno.noImplementada();
    }

    // Agregado Lu
    private Lista<Despliegue> desplieguesPorId;
    //Guardamos referencias a los despliegues ordenados por codigo 
    private Lista<DesplieguePorCodigo> desplieguePorCodigo;
    private Lista<Region> regiones;
    //Guardamos una lista de despliegues por cada modalidad
    private Lista<DesplieguePorCodigo>[] desplieguesPorModalidad;
    // Verifica si el texto es null, vacio o contiene solo espacios.
    // Primero comprobamos si es null para no intentar trabajar con un texto que no existe.
    private boolean esVacio(String texto) {
        return texto == null || texto.trim().isEmpty();
    }

    // Verifica que el codigo tenga el formato AAA-BBB-CCCC.
    // Debe contener 3 letras mayusculas, 3 numeros y
    // 4 caracteres que pueden ser letras o numeros.
    private boolean codigoValido(String codigo) {
        return codigo != null
                && codigo.matches("[A-Z]{3}-[0-9]{3}-[A-Za-z0-9]{4}");
    }

}
