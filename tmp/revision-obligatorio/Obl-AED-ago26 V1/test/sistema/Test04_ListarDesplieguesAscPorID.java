package sistema;

import sistema.Modalidad;
import sistema.Retorno;
import sistema.ImplementacionSistema;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;
import sistema.Sistema;

public class Test04_ListarDesplieguesAscPorID {

    private Retorno retorno;
    private final Sistema s = new ImplementacionSistema();

    @Before
    public void setUp() {
        s.inicializarSistema();
    }

    @Test
    public void listarDesplieguesAscendenteVacio() {
        retorno = s.listarDesplieguesPorIdAscendente();

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals("", retorno.getValorString());
    }

    @Test
    public void listarDesplieguesDescendenteVacio() {
        retorno = s.listarDesplieguesPorIdDescendente();

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals("", retorno.getValorString());
    }

    @Test
    public void listarDesplieguesAscendenteSoloUno() {
        s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto 70B",
                true,
                Modalidad.TEXTO);

        retorno = s.listarDesplieguesPorIdAscendente();

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals(
                "DEP-0001;LLM-070-A1B2;Modelo de texto 70B;true;Texto",
                retorno.getValorString());
    }

    @Test
    public void listarDesplieguesAscendenteIngresoOrdenado() {
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

        s.registrarDespliegue(
                "DEP-0003",
                "AUD-002-E5F6",
                "Modelo de audio 2B",
                false,
                Modalidad.AUDIO);

        retorno = s.listarDesplieguesPorIdAscendente();

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals(
                "DEP-0001;LLM-070-A1B2;Modelo de texto 70B;true;Texto|"
                + "DEP-0002;VIS-004-C3D4;Modelo de visión 4B;false;Visión|"
                + "DEP-0003;AUD-002-E5F6;Modelo de audio 2B;false;Audio",
                retorno.getValorString());
    }

    @Test
    public void listarDesplieguesAscendenteIngresoDesordenado() {
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

        s.registrarDespliegue(
                "DEP-0002",
                "VIS-004-C3D4",
                "Modelo de visión 4B",
                false,
                Modalidad.VISION);

        retorno = s.listarDesplieguesPorIdAscendente();

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals(
                "DEP-0001;LLM-070-A1B2;Modelo de texto 70B;true;Texto|"
                + "DEP-0002;VIS-004-C3D4;Modelo de visión 4B;false;Visión|"
                + "DEP-0003;AUD-002-E5F6;Modelo de audio 2B;false;Audio",
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
    public void losListadosNoTerminanEnBarraVertical() {
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

        retorno = s.listarDesplieguesPorIdAscendente();

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertFalse(retorno.getValorString().endsWith("|"));
    }
}
