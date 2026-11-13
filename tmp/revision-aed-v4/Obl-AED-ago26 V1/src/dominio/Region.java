//Agregado Lu
package dominio;
import tadlista.Lista;
import tadpila.Pila;

public class Region implements Comparable<Region> {
    //DATOS
    private String codigo;
    private String nombre;
    private String pais;
    private String zona;
    
    //Cola de solicitudes pendientes de esta region
    private SolicitudesPendientes solicitudesPendientes;
    
    //Despliegues activos en esta region
    private Lista <DesplieguePorCodigo> desplieguesActivos;
    
    //Historial de despliegues procesados en esta region
    //Funciona como una pila, ultimo en entrar, primero en salir
    private Pila <Despliegue>historialProcesamiento;

    //CONSTRUCTOR
    public Region(String codigo, String nombre, String pais, String zona) {
        this.codigo = codigo;
        this.nombre = nombre;
        this.pais = pais;
        this.zona = zona;
        
        //Creamos la cola de solicitudes pendentes en esta region
        this.solicitudesPendientes = new SolicitudesPendientes();
        
        //Creamos la lista de despliegues activos de esta region
        this.desplieguesActivos = new Lista<>();
        
        //Inicializamos el historial de procesameiento de esta region
        this.historialProcesamiento = new Pila<>();
    }

    //GETTERS
    public String getCodigo() {
        return codigo;
    }

    public String getNombre() {
        return nombre;
    }

    public String getPais() {
        return pais;
    }

    public String getZona() {
        return zona;
    }
    
    //Obtenemos las solicitudes pendientes de esa region
    
    public SolicitudesPendientes getSolicitudesPendientes(){
        return this.solicitudesPendientes;
    }
    
    
   //Verificamos si un despliegue ya esta activo en esta region
   public boolean tieneDespliegueActivo(Despliegue despliegue){
   
       Lista<DesplieguePorCodigo> copia = this.desplieguesActivos.invertir();
       
       while (!copia.esVacia()){
           Despliegue actual = copia.obtenerElemento(0).getDespliegue();
           
           if (actual.compareTo(despliegue)==0){
               return true;
           }
          
           copia.borrarInicio();
       }
       return false;
   }
   
   //Activamos un despliegue en esta region
   //lo agregamos a la lista de activos y al historial
   public void activarDespliegue(Despliegue despliegue){
   //Guardamos el depliegue activo
   //mantenemos el orden ascendente por codigo
   this.desplieguesActivos.agregarOrd(
           new DesplieguePorCodigo(despliegue));
   //Registramos el despliegue procesado en la pila
   //el ultimo procesado queda en el tope
   this.historialProcesamiento.push(despliegue);
   }
   
    // FORMATO REQUERIDO
    @Override 
    public String toString(){
        return codigo + ";"
                + nombre + ";"
                + pais + ";"
                + zona;
                
    }
    
    // Agregado Lu: comparar regiones por codigo
    @Override
    public int compareTo(Region otra) {
        return this.codigo.compareTo(otra.codigo);
    }
}
