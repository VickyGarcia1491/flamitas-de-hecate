//Agregado Lu
package sistema;

import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Test10_ObtenerRegion {

    private Retorno retorno;
    private final Sistema s = new ImplementacionSistema();

    @Before
    public void setUp() {
        s.inicializarSistema();
    }

    @Test
    public void obtenerRegionOk() {

        s.registrarRegion(
                "us-east-1",
                "Virginia",
                "Estados Unidos",
                "Este");

        retorno = s.obtenerRegion("us-east-1");

        assertEquals(Retorno.Resultado.OK,
                retorno.getResultado());

        assertEquals(
                "us-east-1;Virginia;Estados Unidos;Este",
                retorno.getValorString());
    }

    @Test
    public void obtenerRegionError01() {

        retorno = s.obtenerRegion("");
        assertEquals(Retorno.Resultado.ERROR_1,
                retorno.getResultado());

        retorno = s.obtenerRegion("   ");
        assertEquals(Retorno.Resultado.ERROR_1,
                retorno.getResultado());

        retorno = s.obtenerRegion(null);
        assertEquals(Retorno.Resultado.ERROR_1,
                retorno.getResultado());
    }

    @Test
    public void obtenerRegionError02() {

        retorno = s.obtenerRegion("us-east-1");

        assertEquals(Retorno.Resultado.ERROR_2,
                retorno.getResultado());
    }

    @Test
    public void obtenerRegionVarias() {

        s.registrarRegion(
                "us-east-1",
                "Virginia",
                "Estados Unidos",
                "Este");

        s.registrarRegion(
                "sa-east-1",
                "San Pablo",
                "Brasil",
                "Sur");

        retorno = s.obtenerRegion("sa-east-1");

        assertEquals(Retorno.Resultado.OK,
                retorno.getResultado());

        assertEquals(
                "sa-east-1;San Pablo;Brasil;Sur",
                retorno.getValorString());
    }

    @Test
    public void obtenerRegionEntreVarias() {

        s.inicializarSistema();

        // Registramos las regiones en distinto orden
        assertEquals(Retorno.Resultado.OK,
                s.registrarRegion(
                        "REG-003", "Colonia", "Uruguay", "Oeste")
                        .getResultado());

        assertEquals(Retorno.Resultado.OK,
                s.registrarRegion(
                        "REG-001", "Montevideo", "Uruguay", "Sur")
                        .getResultado());

        assertEquals(Retorno.Resultado.OK,
                s.registrarRegion(
                        "REG-002", "Maldonado", "Uruguay", "Este")
                        .getResultado());

        // Buscamos una region especifica
        Retorno resultado = s.obtenerRegion("REG-002");

        assertEquals(Retorno.Resultado.OK,
                resultado.getResultado());

        assertEquals(
                "REG-002;Maldonado;Uruguay;Este",
                resultado.getValorString());
    }

}
