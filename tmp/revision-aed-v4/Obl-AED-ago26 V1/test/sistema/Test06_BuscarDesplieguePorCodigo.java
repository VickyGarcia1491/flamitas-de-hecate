package sistema;

import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Test06_BuscarDesplieguePorCodigo {

    private Retorno retorno;
    private final Sistema s = new ImplementacionSistema();

    @Before
    public void setUp() {
        s.inicializarSistema();
    }

    @Test
    public void buscarDesplieguePorCodigoOk() {
        s.registrarDespliegue("DEP-0001", "LLM-070-A1B2", "Modelo de texto 70B en producción", true, Modalidad.TEXTO);
        retorno = s.buscarDesplieguePorCodigo("LLM-070-A1B2");
        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals("DEP-0001;LLM-070-A1B2;Modelo de texto 70B en producción;true;Texto", retorno.getValorString());
    }

    @Test
    public void buscarDesplieguePorCodigoError01() {
        retorno = s.buscarDesplieguePorCodigo("");
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());
        retorno = s.buscarDesplieguePorCodigo("   ");
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());
        retorno = s.buscarDesplieguePorCodigo(null);
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());
    }

    @Test
    public void buscarDesplieguePorCodigoError02() {
        retorno = s.buscarDesplieguePorCodigo("llm-070-A1B2");
        assertEquals(Retorno.Resultado.ERROR_2, retorno.getResultado());
        retorno = s.buscarDesplieguePorCodigo("LLM-07-A1B2");
        assertEquals(Retorno.Resultado.ERROR_2, retorno.getResultado());
        retorno = s.buscarDesplieguePorCodigo("LLM-070-A1_2");
        assertEquals(Retorno.Resultado.ERROR_2, retorno.getResultado());
    }

    @Test
    public void buscarDesplieguePorCodigoError03() {
        retorno = s.buscarDesplieguePorCodigo("LLM-999-Z9Y8");
        assertEquals(Retorno.Resultado.ERROR_3, retorno.getResultado());
    }

    @Test
    public void buscarDesplieguePorCodigoDiferentesModalidades() {
        s.registrarDespliegue("DEP-0001", "LLM-070-A1B2", "Modelo de texto 70B", true, Modalidad.TEXTO);
        s.registrarDespliegue("DEP-0002", "VIS-004-C3D4", "Modelo de visión 4B", false, Modalidad.VISION);
        retorno = s.buscarDesplieguePorCodigo("VIS-004-C3D4");
        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
        assertEquals("DEP-0002;VIS-004-C3D4;Modelo de visión 4B;false;Visión", retorno.getValorString());
    }
    
    //Agregado Lu
    @Test
    public void buscarPorCodigoConVariosDespliegues() {

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
    
    
@Test
public void buscarCodigoInexistenteEntreCodigosRegistrados() {

    // Registramos dos despliegues con codigos validos.
    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0001",
                    "LLM-070-A1B2",
                    "Modelo uno",
                    true,
                    Modalidad.TEXTO).getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0002",
                    "LLM-070-A1B4",
                    "Modelo dos",
                    false,
                    Modalidad.TEXTO).getResultado());

    // Este codigo tiene formato valido,
    // pero no existe en el sistema.
    // Esta entre los dos codigos registrados.
    assertEquals(Retorno.Resultado.ERROR_3,
            s.buscarDesplieguePorCodigo(
                    "LLM-070-A1B3").getResultado());

    // Los despliegues originales deben seguir disponibles.
    Retorno primero =
            s.buscarDesplieguePorCodigo("LLM-070-A1B2");

    Retorno segundo =
            s.buscarDesplieguePorCodigo("LLM-070-A1B4");

    assertEquals(Retorno.Resultado.OK,
            primero.getResultado());

    assertEquals(Retorno.Resultado.OK,
            segundo.getResultado());

    // Verificamos que devuelve el despliegue correcto.
    assertEquals(
            "DEP-0001;LLM-070-A1B2;Modelo uno;true;Texto",
            primero.getValorString());

    assertEquals(
            "DEP-0002;LLM-070-A1B4;Modelo dos;false;Texto",
            segundo.getValorString());
}

}
