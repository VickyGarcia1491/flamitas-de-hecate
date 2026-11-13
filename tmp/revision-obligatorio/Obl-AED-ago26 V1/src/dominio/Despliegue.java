//Agregado Lu
package dominio;

import sistema.Modalidad;

public class Despliegue implements Comparable<Despliegue> {

    //DATOS
    private String id;
    private String codigo;
    private String descripcion;
    private boolean cuantizado;
    private Modalidad modalidad;

    //CONSTRUCTOR
    public Despliegue(String id, String codigo, String descripcion, boolean cuantizado, Modalidad modalidad) {
        this.id = id;
        this.codigo = codigo;
        this.descripcion = descripcion;
        this.cuantizado = cuantizado;
        this.modalidad = modalidad;

    }

    //GETTERS
    public String getId() {
        return id;
    }

    public String getCodigo() {
        return codigo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public boolean isCuantizado() {
        return cuantizado;
    }

    public Modalidad getModalidad() {
        return modalidad;
    }

    @Override
    public String toString() {
        return id + ";"
                + codigo + ";"
                + descripcion + ";"
                + cuantizado + ";"
                + modalidad.getTexto();
    }
    // Agregado Lu: ordenar por ID
    @Override
    public int compareTo(Despliegue otro) {
        return this.id.compareTo(otro.id);
    }
}

