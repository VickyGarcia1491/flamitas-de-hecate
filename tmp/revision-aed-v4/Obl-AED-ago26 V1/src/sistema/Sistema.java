package sistema;

public interface Sistema {
    
  Retorno inicializarSistema();

    Retorno registrarDespliegue(String id, String codigo, String descripcion,
                                boolean cuantizado, Modalidad modalidad);

    Retorno buscarDesplieguePorId(String id);

    Retorno listarDesplieguesPorIdAscendente();

    Retorno listarDesplieguesPorIdDescendente();

    Retorno buscarDesplieguePorCodigo(String codigo);

    Retorno listarDesplieguesPorCodigoAscendente();

    Retorno listarDesplieguesPorModalidad(Modalidad unaModalidad);

    Retorno registrarRegion(String codigo, String nombre, String pais, String zona);

    Retorno obtenerRegion(String codigo);

    Retorno solicitarDespliegueEnRegion(String idDespliegue, String codigoRegion);

    Retorno procesarSiguienteDespliegue(String codigoRegion);

    Retorno listarDesplieguesActivosDeRegion(String codigoRegion);

    Retorno retirarUltimoDespliegueProcesado(String codigoRegion);   
    
}
