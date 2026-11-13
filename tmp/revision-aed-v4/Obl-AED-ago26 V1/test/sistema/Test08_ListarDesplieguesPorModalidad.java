//Agregado Lu

package sistema;

import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Test08_ListarDesplieguesPorModalidad {

    private Retorno retorno;
    private final Sistema s = new ImplementacionSistema();

    @Before
    public void setUp() {
        s.inicializarSistema();
    }

    @Test
    public void listarSoloDesplieguesDeLaModalidadSolicitada() {

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

        // Pedimos solamente los despliegues de AUDIO.
        retorno = s.listarDesplieguesPorModalidad(Modalidad.AUDIO);

        assertEquals(Retorno.Resultado.OK,
                retorno.getResultado());

        assertEquals(
                "DEP-0002;AUD-002-E5F6;Modelo de audio;false;Audio",
                retorno.getValorString());
    }
    
    
@Test
public void listarModalidadOrdenadaPorCodigo() {

    // Registramos primero el codigo mayor.
    s.registrarDespliegue(
            "DEP-0001",
            "TXT-050-Q1R2",
            "Modelo de texto B",
            false,
            Modalidad.TEXTO);

    // Registramos despues el codigo menor.
    s.registrarDespliegue(
            "DEP-0002",
            "LLM-070-A1B2",
            "Modelo de texto A",
            true,
            Modalidad.TEXTO);

    retorno = s.listarDesplieguesPorModalidad(Modalidad.TEXTO);

    assertEquals(Retorno.Resultado.OK,
            retorno.getResultado());

    assertEquals(
            "DEP-0002;LLM-070-A1B2;Modelo de texto A;true;Texto|"
            + "DEP-0001;TXT-050-Q1R2;Modelo de texto B;false;Texto",
            retorno.getValorString());
}

@Test
public void listarModalidadSinDespliegues() {

    // Registramos un despliegue de TEXTO.
    s.registrarDespliegue(
            "DEP-0001",
            "LLM-070-A1B2",
            "Modelo de texto",
            true,
            Modalidad.TEXTO);

    // Consultamos AUDIO, que no tiene despliegues.
    retorno = s.listarDesplieguesPorModalidad(Modalidad.AUDIO);

    assertEquals(Retorno.Resultado.OK,
            retorno.getResultado());

    assertEquals("", retorno.getValorString());
}

@Test
public void listarPorModalidadNoModificaLosDatos() {

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

    // Consultamos dos veces la misma modalidad.
    Retorno primero = s.listarDesplieguesPorModalidad(Modalidad.AUDIO);
    Retorno segundo = s.listarDesplieguesPorModalidad(Modalidad.AUDIO);

    // Ambas consultas deben devolver el mismo resultado.
    assertEquals(Retorno.Resultado.OK, primero.getResultado());
    assertEquals(Retorno.Resultado.OK, segundo.getResultado());

    assertEquals(primero.getValorString(), segundo.getValorString());

    // Comprobamos que los despliegues siguen registrados.
    assertEquals(Retorno.Resultado.OK,
            s.buscarDesplieguePorCodigo("AUD-002-E5F6").getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.buscarDesplieguePorCodigo("VIS-004-C3D4").getResultado());
}

@Test
public void listarModalidadNula() {

    Retorno retorno = s.listarDesplieguesPorModalidad(null);

    assertEquals(Retorno.Resultado.ERROR_1,
            retorno.getResultado());
}

@Test
public void listarModalidadesMultimodalYOtros() {

    // Registramos un despliegue MULTIMODAL.
    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0001",
                    "MMM-100-A1B2",
                    "Modelo multimodal",
                    false,
                    Modalidad.MULTIMODAL).getResultado());

    // Registramos un despliegue OTROS.
    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0002",
                    "OTR-002-B3C4",
                    "Modelo otros",
                    true,
                    Modalidad.OTROS).getResultado());

    // Registramos uno de TEXTO para comprobar
    // que las modalidades no se mezclan.
    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0003",
                    "LLM-070-C5D6",
                    "Modelo texto",
                    true,
                    Modalidad.TEXTO).getResultado());

    // Consultamos solamente MULTIMODAL.
    Retorno multimodal =
            s.listarDesplieguesPorModalidad(Modalidad.MULTIMODAL);

    assertEquals(Retorno.Resultado.OK,
            multimodal.getResultado());

    assertEquals(
            "DEP-0001;MMM-100-A1B2;Modelo multimodal;false;Multimodal",
            multimodal.getValorString());

    // Consultamos solamente OTROS.
    Retorno otros =
            s.listarDesplieguesPorModalidad(Modalidad.OTROS);

    assertEquals(Retorno.Resultado.OK,
            otros.getResultado());

    assertEquals(
            "DEP-0002;OTR-002-B3C4;Modelo otros;true;Otros",
            otros.getValorString());

    // Comprobamos que TEXTO conserva su despliegue.
    Retorno texto =
            s.listarDesplieguesPorModalidad(Modalidad.TEXTO);

    assertEquals(Retorno.Resultado.OK,
            texto.getResultado());

    assertEquals(
            "DEP-0003;LLM-070-C5D6;Modelo texto;true;Texto",
            texto.getValorString());
}

}
