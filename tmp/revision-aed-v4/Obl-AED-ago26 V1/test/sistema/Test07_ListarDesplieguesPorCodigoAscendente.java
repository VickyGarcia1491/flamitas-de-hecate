//Agregado Lu
package sistema;

import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Test07_ListarDesplieguesPorCodigoAscendente {

    private Retorno retorno;
    private final Sistema s = new ImplementacionSistema();

    @Before
    public void setUp() {
        s.inicializarSistema();
    }

    @Test
    public void listarDesplieguesOrdenadosPorCodigo() {

        // Registramos despliegues con codigos desordenados.
        assertEquals(Retorno.Resultado.OK,
                s.registrarDespliegue(
                        "DEP-0001",
                        "VIS-004-C3D4",
                        "Modelo de vision",
                        false,
                        Modalidad.VISION).getResultado());

        assertEquals(Retorno.Resultado.OK,
                s.registrarDespliegue(
                        "DEP-0002",
                        "AUD-002-E5F6",
                        "Modelo de audio",
                        false,
                        Modalidad.AUDIO).getResultado());

        assertEquals(Retorno.Resultado.OK,
                s.registrarDespliegue(
                        "DEP-0003",
                        "LLM-070-A1B2",
                        "Modelo de texto",
                        true,
                        Modalidad.TEXTO).getResultado());

        // Obtenemos el listado ordenado por codigo.
        retorno = s.listarDesplieguesPorCodigoAscendente();

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());

        assertEquals(
                "DEP-0002;AUD-002-E5F6;Modelo de audio;false;Audio|"
                + "DEP-0003;LLM-070-A1B2;Modelo de texto;true;Texto|"
                + "DEP-0001;VIS-004-C3D4;Modelo de vision;false;Visión",
                retorno.getValorString());
    }
    
    
@Test
public void listarDesplieguesPorCodigoVacio() {

    retorno = s.listarDesplieguesPorCodigoAscendente();

    assertEquals(Retorno.Resultado.OK,
            retorno.getResultado());

    assertEquals("", retorno.getValorString());
}

@Test
public void listarDesplieguesPorCodigoSoloUno() {

    s.registrarDespliegue(
            "DEP-0001",
            "LLM-070-A1B2",
            "Modelo de texto 70B",
            true,
            Modalidad.TEXTO);

    retorno = s.listarDesplieguesPorCodigoAscendente();

    assertEquals(Retorno.Resultado.OK,
            retorno.getResultado());

    assertEquals(
            "DEP-0001;LLM-070-A1B2;Modelo de texto 70B;true;Texto",
            retorno.getValorString());
}

@Test
public void listarPorCodigoNoModificaLaLista() {

    s.registrarDespliegue(
            "DEP-0001",
            "VIS-004-C3D4",
            "Modelo de vision",
            false,
            Modalidad.VISION);

    s.registrarDespliegue(
            "DEP-0002",
            "AUD-002-E5F6",
            "Modelo de audio",
            false,
            Modalidad.AUDIO);

    // Consultamos el listado dos veces.
    Retorno primero = s.listarDesplieguesPorCodigoAscendente();
    Retorno segundo = s.listarDesplieguesPorCodigoAscendente();

    // Ambos listados deben ser iguales.
    assertEquals(Retorno.Resultado.OK, primero.getResultado());
    assertEquals(Retorno.Resultado.OK, segundo.getResultado());

    assertEquals(primero.getValorString(), segundo.getValorString());

    // Los despliegues deben seguir registrados.
    assertEquals(Retorno.Resultado.OK,
            s.buscarDesplieguePorCodigo("VIS-004-C3D4").getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.buscarDesplieguePorCodigo("AUD-002-E5F6").getResultado());
}

@Test
public void listarPorCodigoDespuesDeAgregarOtroDespliegue() {

    // Registramos dos despliegues.
    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0001",
                    "LLM-070-A1B2",
                    "Modelo uno",
                    true,
                    Modalidad.TEXTO).getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0003",
                    "LLM-070-A1B4",
                    "Modelo tres",
                    false,
                    Modalidad.TEXTO).getResultado());

    // Comprobamos el primer listado.
    Retorno primero =
            s.listarDesplieguesPorCodigoAscendente();

    assertEquals(Retorno.Resultado.OK,
            primero.getResultado());

    assertEquals(
            "DEP-0001;LLM-070-A1B2;Modelo uno;true;Texto|"
            + "DEP-0003;LLM-070-A1B4;Modelo tres;false;Texto",
            primero.getValorString());

    // Registramos otro despliegue cuyo codigo
    // debe quedar entre los dos anteriores.
    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0002",
                    "LLM-070-A1B3",
                    "Modelo dos",
                    false,
                    Modalidad.TEXTO).getResultado());

    // El nuevo listado debe incluir los tres
    // despliegues en orden ascendente por codigo.
    Retorno segundo =
            s.listarDesplieguesPorCodigoAscendente();

    assertEquals(Retorno.Resultado.OK,
            segundo.getResultado());

    assertEquals(
            "DEP-0001;LLM-070-A1B2;Modelo uno;true;Texto|"
            + "DEP-0002;LLM-070-A1B3;Modelo dos;false;Texto|"
            + "DEP-0003;LLM-070-A1B4;Modelo tres;false;Texto",
            segundo.getValorString());
}

}
