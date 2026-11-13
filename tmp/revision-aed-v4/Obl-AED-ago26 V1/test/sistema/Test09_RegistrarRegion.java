//Agregado Lu
package sistema;

import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Test09_RegistrarRegion {

    private Retorno retorno;
    private final Sistema s = new ImplementacionSistema();

    @Before
    public void setUp() {
        s.inicializarSistema();
    }

    @Test
    public void registrarRegionOk() {

        retorno = s.registrarRegion(
                "us-east-1",
                "Virginia",
                "Estados Unidos",
                "Este");

        assertEquals(Retorno.Resultado.OK,
                retorno.getResultado());
    }

    @Test
    public void registrarRegionError01() {

        retorno = s.registrarRegion(
                "", "Virginia", "Estados Unidos", "Este");
        assertEquals(Retorno.Resultado.ERROR_1,
                retorno.getResultado());

        retorno = s.registrarRegion(
                "us-east-1", "", "Estados Unidos", "Este");
        assertEquals(Retorno.Resultado.ERROR_1,
                retorno.getResultado());

        retorno = s.registrarRegion(
                "us-east-1", "Virginia", null, "Este");
        assertEquals(Retorno.Resultado.ERROR_1,
                retorno.getResultado());

        retorno = s.registrarRegion(
                "us-east-1", "Virginia", "Estados Unidos", "   ");
        assertEquals(Retorno.Resultado.ERROR_1,
                retorno.getResultado());
    }

    @Test
    public void registrarRegionError02() {

        s.registrarRegion(
                "us-east-1",
                "Virginia",
                "Estados Unidos",
                "Este");

        retorno = s.registrarRegion(
                "us-east-1",
                "Otra region",
                "Otro pais",
                "Otra zona");

        assertEquals(Retorno.Resultado.ERROR_2,
                retorno.getResultado());
    }

    @Test
    public void registrarRegionVarias() {

        retorno = s.registrarRegion(
                "us-east-1",
                "Virginia",
                "Estados Unidos",
                "Este");

        assertEquals(Retorno.Resultado.OK,
                retorno.getResultado());

        retorno = s.registrarRegion(
                "sa-east-1",
                "San Pablo",
                "Brasil",
                "Sur");

        assertEquals(Retorno.Resultado.OK,
                retorno.getResultado());
    }

    @Test
    public void regionDuplicadaConservaDatosOriginales() {
        
        Retorno primero = s.registrarRegion(
                "REG-001", "Montevideo", "Uruguay", "Sur");

        assertEquals(Retorno.Resultado.OK,
                primero.getResultado());

        // Mismo codigo, pero datos diferentes
        Retorno segundo = s.registrarRegion(
                "REG-001", "Buenos Aires", "Argentina", "Este");

        assertEquals(Retorno.Resultado.ERROR_2,
                segundo.getResultado());

        // Verificamos que se conservaron los datos originales
        Retorno resultado = s.obtenerRegion("REG-001");

        assertEquals(Retorno.Resultado.OK,
                resultado.getResultado());

        assertEquals(
                "REG-001;Montevideo;Uruguay;Sur",
                resultado.getValorString());
    }

@Test
public void registrarRegionPrioridadDeErrores() {

    // Registramos una region valida.
    assertEquals(Retorno.Resultado.OK,
            s.registrarRegion(
                    "us-east-1",
                    "Virginia",
                    "Estados Unidos",
                    "Este").getResultado());

    // Intentamos registrar el mismo codigo,
    // pero con un nombre compuesto solo por espacios.
    // Debe ganar ERROR 1 sobre ERROR 2.
    assertEquals(Retorno.Resultado.ERROR_1,
            s.registrarRegion(
                    "us-east-1",
                    "   ",
                    "Estados Unidos",
                    "Este").getResultado());

    // Verificamos que la region original no cambio.
    Retorno resultado = s.obtenerRegion("us-east-1");

    assertEquals(Retorno.Resultado.OK,
            resultado.getResultado());

    assertEquals(
            "us-east-1;Virginia;Estados Unidos;Este",
            resultado.getValorString());
}

@Test
public void registrarRegionValidacionesFaltantes() {

    // Codigo null.
    assertEquals(Retorno.Resultado.ERROR_1,
            s.registrarRegion(
                    null, "Virginia", "Estados Unidos", "Este")
                    .getResultado());

    // Codigo compuesto solamente por espacios.
    assertEquals(Retorno.Resultado.ERROR_1,
            s.registrarRegion(
                    "   ", "Virginia", "Estados Unidos", "Este")
                    .getResultado());

    // Nombre null.
    assertEquals(Retorno.Resultado.ERROR_1,
            s.registrarRegion(
                    "us-east-1", null, "Estados Unidos", "Este")
                    .getResultado());

    // Nombre compuesto solamente por espacios.
    assertEquals(Retorno.Resultado.ERROR_1,
            s.registrarRegion(
                    "us-east-1", "   ", "Estados Unidos", "Este")
                    .getResultado());

    // Pais compuesto solamente por espacios.
    assertEquals(Retorno.Resultado.ERROR_1,
            s.registrarRegion(
                    "us-east-1", "Virginia", "   ", "Este")
                    .getResultado());

    // Zona null.
    assertEquals(Retorno.Resultado.ERROR_1,
            s.registrarRegion(
                    "us-east-1", "Virginia", "Estados Unidos", null)
                    .getResultado());
}

}
