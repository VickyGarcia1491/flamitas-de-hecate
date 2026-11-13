//Agregado Lu
package dominio;

public class Region implements Comparable<Region> {
    //DATOS
    private String codigo;
    private String nombre;
    private String pais;
    private String zona;

    //CONSTRUCTOR
    public Region(String codigo, String nombre, String pais, String zona) {
        this.codigo = codigo;
        this.nombre = nombre;
        this.pais = pais;
        this.zona = zona;
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
