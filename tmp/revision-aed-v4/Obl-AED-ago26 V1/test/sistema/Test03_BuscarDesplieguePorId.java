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
public void buscarPorIdEntreVariosDespliegues() {

    // Registramos despliegues en un orden
    // diferente al orden de sus IDs.

    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0005",
                    "AUD-002-E5F6",
                    "Modelo de audio",
                    false,
                    Modalidad.AUDIO).getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0001",
                    "LLM-070-A1B2",
                    "Modelo de texto",
                    true,
                    Modalidad.TEXTO).getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0003",
                    "VIS-004-C3D4",
                    "Modelo de vision",
                    false,
                    Modalidad.VISION).getResultado());

    // Buscamos un despliegue que existe
    // entre los otros dos IDs.
    Retorno resultado = s.buscarDesplieguePorId("DEP-0003");

    assertEquals(Retorno.Resultado.OK,
            resultado.getResultado());

    assertEquals(
            "DEP-0003;VIS-004-C3D4;Modelo de vision;false;Visión",
            resultado.getValorString());

    // DEP-0002 no existe, aunque hay
    // despliegues registrados antes y despues.
    assertEquals(Retorno.Resultado.ERROR_2,
            s.buscarDesplieguePorId("DEP-0002")
                    .getResultado());

    // La busqueda fallida no debe alterar
    // los datos que ya estaban registrados.
    assertEquals(Retorno.Resultado.OK,
            s.buscarDesplieguePorId("DEP-0001")
                    .getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.buscarDesplieguePorId("DEP-0005")
                    .getResultado());
}


}
