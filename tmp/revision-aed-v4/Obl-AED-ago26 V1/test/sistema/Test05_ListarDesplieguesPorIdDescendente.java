//AgregadoLu
package sistema;

import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Test05_ListarDesplieguesPorIdDescendente {

    private Retorno retorno;
    private final Sistema s = new ImplementacionSistema();

    @Before
    public void setUp() {
        s.inicializarSistema();
    }

    @Test
    public void listarDesplieguesDescendenteVacio() {
        retorno = s.listarDesplieguesPorIdDescendente();

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals("", retorno.getValorString());
    }

    @Test
    public void listarDesplieguesDescendenteSoloUno() {
        s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto 70B",
                true,
                Modalidad.TEXTO);

        retorno = s.listarDesplieguesPorIdDescendente();

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals(
                "DEP-0001;LLM-070-A1B2;Modelo de texto 70B;true;Texto",
                retorno.getValorString());
    }

    @Test
    public void listarDesplieguesDescendenteIngresoOrdenado() {
        s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto 70B",
                true,
                Modalidad.TEXTO);

        s.registrarDespliegue(
                "DEP-0002",
                "VIS-004-C3D4",
                "Modelo de vision 4B",
                false,
                Modalidad.VISION);

        s.registrarDespliegue(
                "DEP-0003",
                "AUD-002-E5F6",
                "Modelo de audio 2B",
                false,
                Modalidad.AUDIO);

        retorno = s.listarDesplieguesPorIdDescendente();

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals(
                "DEP-0003;AUD-002-E5F6;Modelo de audio 2B;false;Audio|"
                + "DEP-0002;VIS-004-C3D4;Modelo de vision 4B;false;Visión|"
                + "DEP-0001;LLM-070-A1B2;Modelo de texto 70B;true;Texto",
                retorno.getValorString());
    }

    @Test
    public void listarDesplieguesDescendenteIngresoDesordenado() {
        s.registrarDespliegue(
                "DEP-0002",
                "VIS-004-C3D4",
                "Modelo de visión 4B",
                false,
                Modalidad.VISION);

        s.registrarDespliegue(
                "DEP-0003",
                "AUD-002-E5F6",
                "Modelo de audio 2B",
                false,
                Modalidad.AUDIO);

        s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto 70B",
                true,
                Modalidad.TEXTO);

        retorno = s.listarDesplieguesPorIdDescendente();

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals(
                "DEP-0003;AUD-002-E5F6;Modelo de audio 2B;false;Audio|"
                + "DEP-0002;VIS-004-C3D4;Modelo de visión 4B;false;Visión|"
                + "DEP-0001;LLM-070-A1B2;Modelo de texto 70B;true;Texto",
                retorno.getValorString());
    }

    @Test
    public void listadoDescendenteNoTerminaEnBarraVertical() {
        s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto 70B",
                true,
                Modalidad.TEXTO);

        s.registrarDespliegue(
                "DEP-0002",
                "VIS-004-C3D4",
                "Modelo de visión 4B",
                false,
                Modalidad.VISION);

        retorno = s.listarDesplieguesPorIdDescendente();

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertFalse(retorno.getValorString().endsWith("|"));
    }

    @Test
    public void listarDosVecesConservaLosDespliegues() {
        s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo uno",
                true,
                Modalidad.TEXTO);

        s.registrarDespliegue(
                "DEP-0002",
                "VIS-004-C3D4",
                "Modelo dos",
                false,
                Modalidad.VISION);

        Retorno primero = s.listarDesplieguesPorIdDescendente();
        Retorno segundo = s.listarDesplieguesPorIdDescendente();

        assertEquals(Retorno.Resultado.OK, primero.getResultado());
        assertEquals(Retorno.Resultado.OK, segundo.getResultado());
        assertEquals(primero.getValorString(), segundo.getValorString());
    }
    
    
@Test
public void listarDescendenteOrdenLexicografico() {

    // Registramos IDs para distinguir el orden
    // lexicografico del orden numerico.

    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-2",
                    "LLM-070-A1B2",
                    "Modelo dos",
                    true,
                    Modalidad.TEXTO).getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-10",
                    "AUD-002-E5F6",
                    "Modelo diez",
                    false,
                    Modalidad.AUDIO).getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-1",
                    "VIS-004-C3D4",
                    "Modelo uno",
                    false,
                    Modalidad.VISION).getResultado());

    // Solicitamos el listado descendente.
    Retorno resultado =
            s.listarDesplieguesPorIdDescendente();

    assertEquals(Retorno.Resultado.OK,
            resultado.getResultado());

    // Orden esperado: DEP-2, DEP-10, DEP-1.
    assertEquals(
            "DEP-2;LLM-070-A1B2;Modelo dos;true;Texto|"
            + "DEP-10;AUD-002-E5F6;Modelo diez;false;Audio|"
            + "DEP-1;VIS-004-C3D4;Modelo uno;false;Visión",
            resultado.getValorString());
}

}
