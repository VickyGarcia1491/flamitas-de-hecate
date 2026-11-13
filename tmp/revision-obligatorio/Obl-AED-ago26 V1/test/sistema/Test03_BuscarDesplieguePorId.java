package sistema;

import sistema.Modalidad;
import sistema.Retorno;
import sistema.ImplementacionSistema;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;
import sistema.Sistema;

public class Test03_BuscarDesplieguePorId {

    private Retorno retorno;
    private final Sistema s = new ImplementacionSistema();

    @Before
    public void setUp() {
        s.inicializarSistema();
    }

    @Test
    public void buscarDesplieguePorIdOk() {
        s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto 70B en producción",
                true,
                Modalidad.TEXTO);

        retorno = s.buscarDesplieguePorId("DEP-0001");

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals(
                "DEP-0001;LLM-070-A1B2;Modelo de texto 70B en producción;true;Texto",
                retorno.getValorString());
    }

    @Test
    public void buscarDesplieguePorIdError01() {
        retorno = s.buscarDesplieguePorId("");
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());

        retorno = s.buscarDesplieguePorId("   ");
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());

        retorno = s.buscarDesplieguePorId(null);
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());
    }

    @Test
    public void buscarDesplieguePorIdError02() {
        retorno = s.buscarDesplieguePorId("DEP-9999");
        assertEquals(Retorno.Resultado.ERROR_2, retorno.getResultado());
    }

    @Test
    public void buscarDesplieguePorIdDiferentesModalidades() {
        s.registrarDespliegue(
                "DEP-0002",
                "VIS-004-C3D4",
                "Modelo de visión 4B",
                false,
                Modalidad.VISION);

        retorno = s.buscarDesplieguePorId("DEP-0002");

        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals(
                "DEP-0002;VIS-004-C3D4;Modelo de visión 4B;false;Visión",
                retorno.getValorString());
    }

    //Agregado Lu
    @Test
    public void buscarDesplieguePorIdDevuelveFormatoCorrecto() {

        s.inicializarSistema();

        Retorno registro = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto 70B en producción",
                true,
                Modalidad.TEXTO);

        assertEquals(Retorno.Resultado.OK,
                registro.getResultado());

        Retorno resultado = s.buscarDesplieguePorId("DEP-0001");

        assertEquals(Retorno.Resultado.OK,
                resultado.getResultado());

        assertEquals(
                "DEP-0001;LLM-070-A1B2;Modelo de texto 70B en producción;true;Texto",
                resultado.getValorString());
    }

    //Agregado Lu
    @Test
    public void buscarPorCodigoConVariosDespliegues() {

        s.inicializarSistema();

        Retorno primero = s.registrarDespliegue(
                "DEP-0002",
                "LLM-070-A1B2",
                "Modelo dos",
                true,
                Modalidad.TEXTO);

        Retorno segundo = s.registrarDespliegue(
                "DEP-0001",
                "VIS-020-C3D4",
                "Modelo uno",
                false,
                Modalidad.OTROS);

        assertEquals(Retorno.Resultado.OK,
                primero.getResultado());

        assertEquals(Retorno.Resultado.OK,
                segundo.getResultado());

        // Buscamos por codigo, no por ID
        Retorno resultado = s.buscarDesplieguePorCodigo(
                "LLM-070-A1B2");

        assertEquals(Retorno.Resultado.OK,
                resultado.getResultado());

        assertEquals(
                "DEP-0002;LLM-070-A1B2;Modelo dos;true;Texto",
                resultado.getValorString());
    }

}
