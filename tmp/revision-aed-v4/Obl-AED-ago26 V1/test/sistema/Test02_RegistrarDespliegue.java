package sistema;

import sistema.Sistema;
import sistema.ImplementacionSistema;
import sistema.Modalidad;
import sistema.Retorno;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Test02_RegistrarDespliegue {

    private Retorno retorno;
    private final Sistema s = new ImplementacionSistema();

    @Before
    public void setUp() {
        s.inicializarSistema();
    }

    @Test
    public void registrarDespliegueOk() {
        retorno = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto 70B en producción",
                true,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.OK, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0002",
                "VIS-004-C3D4",
                "Modelo de visión 4B",
                false,
                Modalidad.VISION);
        assertEquals(Retorno.Resultado.OK, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0003",
                "AUD-002-E5F6",
                "Modelo de audio 2B",
                false,
                Modalidad.AUDIO);
        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
    }

    @Test
    public void registrarDespliegueError01() {
        retorno = s.registrarDespliegue(
                "",
                "LLM-070-A1B2",
                "Modelo de texto 70B",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "   ",
                "LLM-070-A1B2",
                "Modelo de texto 70B",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());

        retorno = s.registrarDespliegue(
                null,
                "LLM-070-A1B2",
                "Modelo de texto 70B",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "",
                "Modelo de texto 70B",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "   ",
                "Modelo de texto 70B",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0001",
                null,
                "Modelo de texto 70B",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "   ",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                null,
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto 70B",
                false,
                null);
        assertEquals(Retorno.Resultado.ERROR_1, retorno.getResultado());
    }

    @Test
    public void registrarDespliegueError02() {
        retorno = s.registrarDespliegue(
                "DEP-0001",
                "llm-070-A1B2",
                "Modelo de texto 70B",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_2, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "LLM-020-A1_2",
                "Modelo de texto 20B",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_2, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "LLM-0B0-A122",
                "Modelo de texto 20B",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_2, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "LL-070-A1B2",
                "Modelo de texto 70B",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_2, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "LLM-70-A1B2",
                "Modelo de texto 70B",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_2, retorno.getResultado());

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B",
                "Modelo de texto 70B",
                false,
                Modalidad.TEXTO);
        assertEquals(Retorno.Resultado.ERROR_2, retorno.getResultado());
    }

    @Test
    public void registrarDespliegueError03() {
        s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto 70B",
                true,
                Modalidad.TEXTO);

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "VIS-004-C3D4",
                "Otro modelo",
                false,
                Modalidad.VISION);

        assertEquals(Retorno.Resultado.ERROR_3, retorno.getResultado());
    }

    @Test
    public void registrarDespliegueError04() {
        s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto 70B",
                true,
                Modalidad.TEXTO);

        retorno = s.registrarDespliegue(
                "DEP-0002",
                "LLM-070-A1B2",
                "Otro modelo",
                false,
                Modalidad.OTROS);

        assertEquals(Retorno.Resultado.ERROR_4, retorno.getResultado());
    }

    @Test
    public void registrarDespliegueRespetaOrdenValidaciones() {
        s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto 70B",
                true,
                Modalidad.TEXTO);

        retorno = s.registrarDespliegue(
                "DEP-0001",
                "codigo-invalido",
                "Otro modelo",
                false,
                Modalidad.OTROS);

        // Se cumplen ERROR_2 y ERROR_3, debe retornar el error de menor número.
        assertEquals(Retorno.Resultado.ERROR_2, retorno.getResultado());
    }

    //Agregado Lu
    @Test
    public void idYCodigoDuplicadosDevuelveError3() {

        s.inicializarSistema();

        // Registramos el primer despliegue
        Retorno primero = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo original",
                true,
                Modalidad.TEXTO);

        assertEquals(Retorno.Resultado.OK,
                primero.getResultado());

        // Intentamos registrar otro con el mismo ID
        // y el mismo codigo
        Retorno segundo = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Otro modelo",
                false,
                Modalidad.OTROS);

        // ERROR_3 tiene prioridad sobre ERROR_4
        assertEquals(Retorno.Resultado.ERROR_3,
                segundo.getResultado());
    }

    @Test
    public void codigoDuplicadoDevuelveError4() {

        s.inicializarSistema();

        // Registramos el primer despliegue
        Retorno primero = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo original",
                true,
                Modalidad.TEXTO);

        assertEquals(Retorno.Resultado.OK,
                primero.getResultado());

        // ID diferente, pero mismo codigo
        Retorno segundo = s.registrarDespliegue(
                "DEP-0002",
                "LLM-070-A1B2",
                "Otro modelo",
                false,
                Modalidad.OTROS);

        assertEquals(Retorno.Resultado.ERROR_4,
                segundo.getResultado());
    }

    @Test
    public void codigoConLongitudIncorrectaDevuelveError2() {

        s.inicializarSistema();

        // El build tiene 5 caracteres en vez de 4
        Retorno primero = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2X",
                "Modelo de prueba",
                true,
                Modalidad.TEXTO);

        assertEquals(Retorno.Resultado.ERROR_2,
                primero.getResultado());

        // La familia tiene 2 letras en vez de 3
        Retorno segundo = s.registrarDespliegue(
                "DEP-0002",
                "LL-070-A1B2",
                "Otro modelo",
                false,
                Modalidad.OTROS);

        assertEquals(Retorno.Resultado.ERROR_2,
                segundo.getResultado());
    }

@Test
public void registrarDespliegueConDescripcionSoloEspacios() {

    // Intentamos registrar un despliegue con descripcion vacia.
    Retorno retorno = s.registrarDespliegue(
            "DEP-0001",
            "LLM-070-A1B2",
            "   ",
            false,
            Modalidad.TEXTO);

    // Debe devolver ERROR 1.
    assertEquals(Retorno.Resultado.ERROR_1,
            retorno.getResultado());

    // El despliegue no debe haberse registrado.
    assertEquals(Retorno.Resultado.ERROR_2,
            s.buscarDesplieguePorId("DEP-0001").getResultado());
}

@Test
public void registrarDesplieguePrioridadErrores() {

    // Registramos un despliegue valido.
    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0001",
                    "LLM-070-A1B2",
                    "Modelo original",
                    true,
                    Modalidad.TEXTO).getResultado());

    // Intentamos registrar un ID repetido
    // y un codigo con formato incorrecto.
    Retorno retorno = s.registrarDespliegue(
            "DEP-0001",
            "llm-070-A1B2",
            "Otro modelo",
            false,
            Modalidad.TEXTO);

    // Debe tener prioridad ERROR 2 sobre ERROR 3.
    assertEquals(Retorno.Resultado.ERROR_2,
            retorno.getResultado());
}

@Test
public void registrarDespliegueConCodigoSoloEspacios() {

    // Intentamos registrar un despliegue con codigo vacio.
    Retorno retorno = s.registrarDespliegue(
            "DEP-0001",
            "   ",
            "Modelo de texto",
            false,
            Modalidad.TEXTO);

    // Debe devolver ERROR 1, no ERROR 2.
    assertEquals(Retorno.Resultado.ERROR_1,
            retorno.getResultado());

    // El despliegue no debe haberse registrado.
    assertEquals(Retorno.Resultado.ERROR_2,
            s.buscarDesplieguePorId("DEP-0001").getResultado());
}

@Test
public void registrarDespliegueConIdSoloEspaciosYPrioridad() {

    // Intentamos registrar un ID vacio
    // junto con un codigo de formato incorrecto.
    Retorno retorno = s.registrarDespliegue(
            "   ",
            "llm-070-A1B2",
            "Modelo de texto",
            false,
            Modalidad.TEXTO);

    // ERROR 1 tiene prioridad sobre ERROR 2.
    assertEquals(Retorno.Resultado.ERROR_1,
            retorno.getResultado());

    // Comprobamos que el codigo no quedo registrado.
    assertEquals(Retorno.Resultado.ERROR_3,
            s.buscarDesplieguePorCodigo("LLM-070-A1B2")
                    .getResultado());
}

}
