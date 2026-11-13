package dominio;

// Agregado Lu
public class SolicitudesPendientes {

    // Cada nodo guarda un despliegue y el siguiente nodo.
    private class Nodo {

        private Despliegue despliegue;
        private Nodo siguiente;

        // Constructor de Nodo
        public Nodo(Despliegue despliegue) {
            this.despliegue = despliegue;
            this.siguiente = null;
        }
    }

    // Referencias al principio y al final de la cola.
    private Nodo inicio;
    private Nodo fin;

    // Constructor de SolicitudesPendientes.
    public SolicitudesPendientes() {
        this.inicio = null;
        this.fin = null;
    }
    
    //Agregamos una solicitud al final de la cola
    public void agregarSolicitud(Despliegue despliegue){
    
        Nodo nuevo = new Nodo(despliegue);
        
        //Si la cola está vacia, el nuevo nodo es el primero y el utlimo
        if(inicio == null){
            inicio = nuevo;
            fin = nuevo;
        }else{
        //Conectamos el ultimo nodo con el nuevo
        fin.siguiente = nuevo;
        
        //Actualizamos la referencia al ultimo nodo
        fin = nuevo;
        }
       }
        //Extraemos la solicitud mas antigua de la cola
        // Está operracion se realiza en O(1)
        public Despliegue extraerPrimeraSolicitud(){
        //Si no hay solicitudes pendientes
        //no tenemos ningun despliegue que extraer
        if(inicio == null){
            return null;
        }
         //Guardamos el despliegue de la primer solicitud
         Despliegue despliegue = inicio.despliegue;
         //Avanzamos el inicio al siguiente nodo
         inicio = inicio.siguiente;
         //Si la cola quedo vacia
         //tambien debemos actualizar el fin
         if(inicio == null){
             fin = null;
         }
         //Devolvemos el despliegue extraido
         return despliegue;
      }
    //Verificamos si un despliegue ya tiene una solicitud pendiente
    public boolean tieneSolicitud(Despliegue despliegue){
    
        Nodo actual = inicio;
        
        //Recorremos las solicitudes pendientes
        while (actual != null){
        
            if(actual.despliegue.compareTo(despliegue)==0){
                return true;
            }
            actual = actual.siguiente;
        }
        //Si terminamos el recorrido, no existe esa solicitud
        return false;
    }
}