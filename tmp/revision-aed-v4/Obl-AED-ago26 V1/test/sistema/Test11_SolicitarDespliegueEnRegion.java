
package sistema;

import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Test11_SolicitarDespliegueEnRegion {

    private final Sistema s = new ImplementacionSistema();

    @Before
    public void setUp() {
        // Inicializamos el sistema antes de cada test.
        assertEquals(Retorno.Resultado.OK,
                s.inicializarSistema().getResultado());
    }

    @Test
    public void solicitarConDatosNulosOVacios() {

        // ID nulo.
        assertEquals(Retorno.Resultado.ERROR_1,
                s.solicitarDespliegueEnRegion(null, "UY")
                        .getResultado());

        // Codigo de region nulo.
        assertEquals(Retorno.Resultado.ERROR_1,
                s.solicitarDespliegueEnRegion("DEP-0001", null)
                        .getResultado());

        // ID vacio.
        assertEquals(Retorno.Resultado.ERROR_1,
                s.solicitarDespliegueEnRegion("", "UY")
                        .getResultado());

        // Codigo de region vacio.
        assertEquals(Retorno.Resultado.ERROR_1,
                s.solicitarDespliegueEnRegion("DEP-0001", "")
                        .getResultado());
    }

    @Test
    public void solicitarConSoloEspacios() {

        // Un ID compuesto solamente por espacios
        // se considera vacio segun la letra.
        assertEquals(Retorno.Resultado.ERROR_1,
                s.solicitarDespliegueEnRegion(
                        "   ", "us-east-1").getResultado());

        // Lo mismo ocurre con el codigo de region.
        assertEquals(Retorno.Resultado.ERROR_1,
                s.solicitarDespliegueEnRegion(
                        "DEP-0001", "   ").getResultado());
    }

    @Test
    public void solicitarDespliegueInexistente() {

        // El despliegue no existe.
        // Debe devolver ERROR 2.
        assertEquals(Retorno.Resultado.ERROR_2,
                s.solicitarDespliegueEnRegion(
                        "DEP-9999", "UY").getResultado());
    }

    @Test
    public void solicitarEnRegionInexistente() {

        // Registramos un despliegue valido.
        assertEquals(Retorno.Resultado.OK,
                s.registrarDespliegue(
                        "DEP-0001",
                        "LLM-070-A1B2",
                        "Modelo de texto",
                        true,
                        Modalidad.TEXTO).getResultado());

        // La region no existe.
        // Debe devolver ERROR 3.
        assertEquals(Retorno.Resultado.ERROR_3,
                s.solicitarDespliegueEnRegion(
                        "DEP-0001", "UY").getResultado());
    }

    @Test
    public void solicitarDespliegueYaPendiente() {

        // Registramos un despliegue.
        assertEquals(Retorno.Resultado.OK,
                s.registrarDespliegue(
                        "DEP-0001",
                        "LLM-070-A1B2",
                        "Modelo de texto",
                        true,
                        Modalidad.TEXTO).getResultado());

        // Registramos una region.
        assertEquals(Retorno.Resultado.OK,
                s.registrarRegion(
                        "us-east-1",
                        "Virginia",
                        "Estados Unidos",
                        "Este").getResultado());

        // La primera solicitud debe aceptarse.
        assertEquals(Retorno.Resultado.OK,
                s.solicitarDespliegueEnRegion(
                        "DEP-0001",
                        "us-east-1").getResultado());

        // No se puede solicitar dos veces el mismo
        // despliegue pendiente en la misma region.
        assertEquals(Retorno.Resultado.ERROR_4,
                s.solicitarDespliegueEnRegion(
                        "DEP-0001",
                        "us-east-1").getResultado());
    }

    @Test
    public void solicitarDistintosDesplieguesEnMismaRegion() {

        // Registramos dos despliegues diferentes.
        assertEquals(Retorno.Resultado.OK,
                s.registrarDespliegue(
                        "DEP-0001",
                        "LLM-070-A1B2",
                        "Modelo de texto",
                        true,
                        Modalidad.TEXTO).getResultado());

        assertEquals(Retorno.Resultado.OK,
                s.registrarDespliegue(
                        "DEP-0002",
                        "AUD-002-E5F6",
                        "Modelo de audio",
                        false,
                        Modalidad.AUDIO).getResultado());

        // Registramos una region.
        assertEquals(Retorno.Resultado.OK,
                s.registrarRegion(
                        "us-east-1",
                        "Virginia",
                        "Estados Unidos",
                        "Este").getResultado());

        // Ambos despliegues pueden quedar pendientes
        // en la misma region.
        assertEquals(Retorno.Resultado.OK,
                s.solicitarDespliegueEnRegion(
                        "DEP-0001",
                        "us-east-1").getResultado());

        assertEquals(Retorno.Resultado.OK,
                s.solicitarDespliegueEnRegion(
                        "DEP-0002",
                        "us-east-1").getResultado());
    }

    @Test
    public void solicitarMismoDespliegueEnDistintasRegiones() {

        // Registramos un despliegue.
        assertEquals(Retorno.Resultado.OK,
                s.registrarDespliegue(
                        "DEP-0001",
                        "LLM-070-A1B2",
                        "Modelo de texto",
                        true,
                        Modalidad.TEXTO).getResultado());

        // Registramos dos regiones diferentes.
        assertEquals(Retorno.Resultado.OK,
                s.registrarRegion(
                        "us-east-1",
                        "Virginia",
                        "Estados Unidos",
                        "Este").getResultado());

        assertEquals(Retorno.Resultado.OK,
                s.registrarRegion(
                        "eu-west-1",
                        "Irlanda",
                        "Irlanda",
                        "Oeste").getResultado());

        // Primera solicitud: debe aceptarse.
        assertEquals(Retorno.Resultado.OK,
                s.solicitarDespliegueEnRegion(
                        "DEP-0001",
                        "us-east-1").getResultado());

        // El mismo despliegue puede solicitarse
        // en una region diferente.
        assertEquals(Retorno.Resultado.OK,
                s.solicitarDespliegueEnRegion(
                        "DEP-0001",
                        "eu-west-1").getResultado());

        // No puede repetirse en la primera region.
        assertEquals(Retorno.Resultado.ERROR_4,
                s.solicitarDespliegueEnRegion(
                        "DEP-0001",
                        "us-east-1").getResultado());

        // Tampoco puede repetirse en la segunda region.
        assertEquals(Retorno.Resultado.ERROR_4,
                s.solicitarDespliegueEnRegion(
                        "DEP-0001",
                        "eu-west-1").getResultado());
    }

    @Test
    public void solicitarEnRegionInexistenteYRegistrarDespues() {

        // Registramos un despliegue valido.
        assertEquals(Retorno.Resultado.OK,
                s.registrarDespliegue(
                        "DEP-0001",
                        "LLM-070-A1B2",
                        "Modelo de texto",
                        true,
                        Modalidad.TEXTO).getResultado());

        // La region todavia no existe.
        assertEquals(Retorno.Resultado.ERROR_3,
                s.solicitarDespliegueEnRegion(
                        "DEP-0001",
                        "us-east-1").getResultado());

        // Ahora registramos la region.
        assertEquals(Retorno.Resultado.OK,
                s.registrarRegion(
                        "us-east-1",
                        "Virginia",
                        "Estados Unidos",
                        "Este").getResultado());

        // La solicitud debe aceptarse.
        assertEquals(Retorno.Resultado.OK,
                s.solicitarDespliegueEnRegion(
                        "DEP-0001",
                        "us-east-1").getResultado());

        // Si repetimos la solicitud, debe dar ERROR 4.
        assertEquals(Retorno.Resultado.ERROR_4,
                s.solicitarDespliegueEnRegion(
                        "DEP-0001",
                        "us-east-1").getResultado());
    }

    @Test
    public void solicitarConErroresSimultaneos() {

        // El despliegue no existe y la region es null.
        // ERROR 1 tiene prioridad sobre ERROR 2.
        assertEquals(Retorno.Resultado.ERROR_1,
                s.solicitarDespliegueEnRegion(
                        "DEP-9999", null).getResultado());

        // No existen ni el despliegue ni la region.
        // ERROR 2 tiene prioridad sobre ERROR 3.
        assertEquals(Retorno.Resultado.ERROR_2,
                s.solicitarDespliegueEnRegion(
                        "DEP-9999",
                        "region-inexistente").getResultado());
    }
}
