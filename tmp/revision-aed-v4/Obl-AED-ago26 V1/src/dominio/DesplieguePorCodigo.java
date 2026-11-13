//Agregado Lu
package dominio;

public class DesplieguePorCodigo implements Comparable<DesplieguePorCodigo> {

    //Guardamos una referencia al despliegue original
    private Despliegue despliegue;
    
    //Constructor que recibe el despliegue original 
    //y guarda su referencia
    public DesplieguePorCodigo(Despliegue despliegue) {
        this.despliegue = despliegue;
    }
    
    //Comparamos los despliegues por codigo para mantenerlos ordenados
    @Override
    public int compareTo(DesplieguePorCodigo otro){
        return this.despliegue.getCodigo()
                .compareTo(otro.despliegue.getCodigo());
    
    }
    
    //Devuelve el despliegue original con todos sus datos
    //Lo vamos a usar en la funcionalidad 7
    public Despliegue getDespliegue(){
        return this.despliegue;
    }
}

