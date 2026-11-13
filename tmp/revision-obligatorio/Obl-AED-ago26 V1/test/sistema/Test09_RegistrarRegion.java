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

        s.inicializarSistema();

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

}
