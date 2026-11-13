//Agregado Lu

package sistema;

import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Test12_ProcesarSiguienteDespliegue {

    private final Sistema s = new ImplementacionSistema();

    @Before
    public void setUp() {
        s.inicializarSistema();
    }

    // ERROR 1: codigo nulo, vacio o solo espacios.
    @Test
    public void procesarCodigoInvalido() {

        assertEquals(Retorno.Resultado.ERROR_1,
                s.procesarSiguienteDespliegue(null)
                        .getResultado());

        assertEquals(Retorno.Resultado.ERROR_1,
                s.procesarSiguienteDespliegue("")
                        .getResultado());

        assertEquals(Retorno.Resultado.ERROR_1,
                s.procesarSiguienteDespliegue("   ")
                        .getResultado());
    }

    // ERROR 2: la region no existe.
    @Test
    public void procesarRegionInexistente() {

        assertEquals(Retorno.Resultado.ERROR_2,
                s.procesarSiguienteDespliegue("UY")
                        .getResultado());
    }

    // ERROR 3: la region existe,
    // pero no tiene solicitudes pendientes.
    @Test
    public void procesarSinSolicitudesPendientes() {

        s.registrarRegion(
                "UY",
                "Montevideo",
                "Uruguay",
                "Sur");

        assertEquals(Retorno.Resultado.ERROR_3,
                s.procesarSiguienteDespliegue("UY")
                        .getResultado());
    }
   
@Test
public void procesarRespetaOrdenDeLlegada() {

    // Registramos tres despliegues.
    s.registrarDespliegue(
            "DEP-0001", "LLM-070-A1B2",
            "Modelo de texto", true, Modalidad.TEXTO);

    s.registrarDespliegue(
            "DEP-0002", "AUD-002-E5F6",
            "Modelo de audio", false, Modalidad.AUDIO);

    s.registrarDespliegue(
            "DEP-0003", "VIS-004-C3D4",
            "Modelo de vision", false, Modalidad.VISION);

    // Registramos la region.
    s.registrarRegion("UY", "Montevideo", "Uruguay", "Sur");

    // Solicitamos en un orden diferente al de los IDs.
    assertEquals(Retorno.Resultado.OK,
            s.solicitarDespliegueEnRegion("DEP-0003", "UY")
                    .getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.solicitarDespliegueEnRegion("DEP-0001", "UY")
                    .getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.solicitarDespliegueEnRegion("DEP-0002", "UY")
                    .getResultado());

    // Debe procesarse primero DEP-0003.
    Retorno primero = s.procesarSiguienteDespliegue("UY");

    assertEquals(Retorno.Resultado.OK,
            primero.getResultado());

    assertEquals(
            "DEP-0003;VIS-004-C3D4;Modelo de vision;false;Visión",
            primero.getValorString());

    // Despues debe procesarse DEP-0001.
    Retorno segundo = s.procesarSiguienteDespliegue("UY");

    assertEquals(Retorno.Resultado.OK,
            segundo.getResultado());

    assertEquals(
            "DEP-0001;LLM-070-A1B2;Modelo de texto;true;Texto",
            segundo.getValorString());

    // Finalmente debe procesarse DEP-0002.
    Retorno tercero = s.procesarSiguienteDespliegue("UY");

    assertEquals(Retorno.Resultado.OK,
            tercero.getResultado());

    assertEquals(
            "DEP-0002;AUD-002-E5F6;Modelo de audio;false;Audio",
            tercero.getValorString());

    // Ya no deben quedar solicitudes pendientes.
    assertEquals(Retorno.Resultado.ERROR_3,
            s.procesarSiguienteDespliegue("UY")
                    .getResultado());
}
 
@Test
public void despliegueProcesadoQuedaActivoEnSuRegion() {

    // Registramos un despliegue.
    s.registrarDespliegue(
            "DEP-0001", "LLM-070-A1B2",
            "Modelo de texto", true, Modalidad.TEXTO);

    // Registramos dos regiones.
    s.registrarRegion("UY", "Montevideo", "Uruguay", "Sur");
    s.registrarRegion("AR", "Buenos Aires", "Argentina", "Sur");

    // Solicitamos el despliegue en UY.
    assertEquals(Retorno.Resultado.OK,
            s.solicitarDespliegueEnRegion("DEP-0001", "UY")
                    .getResultado());

    // Procesamos la solicitud.
    assertEquals(Retorno.Resultado.OK,
            s.procesarSiguienteDespliegue("UY")
                    .getResultado());

    // ERROR 4: ya esta activo en UY.
    assertEquals(Retorno.Resultado.ERROR_4,
            s.solicitarDespliegueEnRegion("DEP-0001", "UY")
                    .getResultado());

    // Pero en otra region si se puede solicitar.
    assertEquals(Retorno.Resultado.OK,
            s.solicitarDespliegueEnRegion("DEP-0001", "AR")
                    .getResultado());

    // Y procesar de manera independiente.
    assertEquals(Retorno.Resultado.OK,
            s.procesarSiguienteDespliegue("AR")
                    .getResultado());
}

@Test
public void procesarPermiteReutilizarColaVacia() {

    // Registramos dos despliegues.
    s.registrarDespliegue(
            "DEP-0001", "LLM-070-A1B2",
            "Modelo de texto", true, Modalidad.TEXTO);

    s.registrarDespliegue(
            "DEP-0002", "AUD-002-E5F6",
            "Modelo de audio", false, Modalidad.AUDIO);

    // Registramos la region.
    s.registrarRegion(
            "UY", "Montevideo", "Uruguay", "Sur");

    // Solicitamos y procesamos el primer despliegue.
    assertEquals(Retorno.Resultado.OK,
            s.solicitarDespliegueEnRegion("DEP-0001", "UY")
                    .getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.procesarSiguienteDespliegue("UY")
                    .getResultado());

    // La cola quedo vacia.
    assertEquals(Retorno.Resultado.ERROR_3,
            s.procesarSiguienteDespliegue("UY")
                    .getResultado());

    // Agregamos una nueva solicitud a la cola vacia.
    assertEquals(Retorno.Resultado.OK,
            s.solicitarDespliegueEnRegion("DEP-0002", "UY")
                    .getResultado());

    // La nueva solicitud debe poder procesarse.
    Retorno resultado = s.procesarSiguienteDespliegue("UY");

    assertEquals(Retorno.Resultado.OK,
            resultado.getResultado());

    assertEquals(
            "DEP-0002;AUD-002-E5F6;Modelo de audio;false;Audio",
            resultado.getValorString());

    // La cola vuelve a quedar vacia.
    assertEquals(Retorno.Resultado.ERROR_3,
            s.procesarSiguienteDespliegue("UY")
                    .getResultado());
}

}
