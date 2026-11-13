package sistema;

import sistema.Sistema;
import sistema.ImplementacionSistema;
import sistema.Retorno;
import org.junit.Test;
import static org.junit.Assert.*;

public class Test01_InicializarSistema {

    private Retorno retorno;
    private final Sistema s = new ImplementacionSistema();

    @Test
    public void inicializarSistemaOk() {
        retorno = s.inicializarSistema();
        assertEquals(Retorno.Resultado.OK, retorno.getResultado());
    }

    //Agregado Lu
 
    @Test
    public void inicializarSistemaBorraDatos() {

        // Primero inicializamos el sistema
        s.inicializarSistema();

        // Registramos un despliegue
        s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto",
                true,
                Modalidad.TEXTO);

        // Volvemos a inicializar
        s.inicializarSistema();

        // Buscamos el despliegue anterior
        Retorno retorno = s.buscarDesplieguePorId("DEP-0001");

        // Ya no debería existir
        assertEquals(Retorno.Resultado.ERROR_2,
                retorno.getResultado());
    }
    
    
    @Test
    public void inicializarSistemaBorraRegiones() {

        s.inicializarSistema();

        // Registramos una region
        Retorno registro = s.registrarRegion(
                "REG-001", "Montevideo", "Uruguay", "Sur");

        assertEquals(Retorno.Resultado.OK,
                registro.getResultado());

        // Reiniciamos el sistema
        s.inicializarSistema();

        // La region ya no deberia existir
        Retorno retorno = s.obtenerRegion("REG-001");

        assertEquals(Retorno.Resultado.ERROR_2,
                retorno.getResultado());
    }

    @Test
    public void inicializarSistemaPermiteRegistrarNuevamente() {

        s.inicializarSistema();

        // Primer registro
        Retorno primero = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto",
                true,
                Modalidad.TEXTO);

        assertEquals(Retorno.Resultado.OK,
                primero.getResultado());

        // Reiniciamos el sistema
        s.inicializarSistema();

        // Registramos nuevamente los mismos datos
        Retorno segundo = s.registrarDespliegue(
                "DEP-0001",
                "LLM-070-A1B2",
                "Modelo de texto",
                true,
                Modalidad.TEXTO);

        assertEquals(Retorno.Resultado.OK,
                segundo.getResultado());
    }

//Agregado Lu
    
@Test
public void reinicializarSistemaBorraLosDatos() {

    // Inicializamos el sistema antes de utilizarlo.
    assertEquals(Retorno.Resultado.OK,
            s.inicializarSistema().getResultado());

    // Registramos un despliegue.
    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0001",
                    "LLM-070-A1B2",
                    "Modelo de texto",
                    true,
                    Modalidad.TEXTO).getResultado());

    // Registramos una region.
    assertEquals(Retorno.Resultado.OK,
            s.registrarRegion(
                    "us-east-1",
                    "Virginia",
                    "Estados Unidos",
                    "Este").getResultado());

    // Agregamos una solicitud pendiente.
    assertEquals(Retorno.Resultado.OK,
            s.solicitarDespliegueEnRegion(
                    "DEP-0001",
                    "us-east-1").getResultado());

    // Reinicializamos el sistema.
    assertEquals(Retorno.Resultado.OK,
            s.inicializarSistema().getResultado());

    // El despliegue ya no debe existir.
    assertEquals(Retorno.Resultado.ERROR_2,
            s.buscarDesplieguePorId("DEP-0001")
                    .getResultado());

    // La region tampoco debe existir.
    assertEquals(Retorno.Resultado.ERROR_2,
            s.obtenerRegion("us-east-1")
                    .getResultado());

    // Debemos poder registrar nuevamente los mismos datos.
    assertEquals(Retorno.Resultado.OK,
            s.registrarDespliegue(
                    "DEP-0001",
                    "LLM-070-A1B2",
                    "Modelo de texto",
                    true,
                    Modalidad.TEXTO).getResultado());

    assertEquals(Retorno.Resultado.OK,
            s.registrarRegion(
                    "us-east-1",
                    "Virginia",
                    "Estados Unidos",
                    "Este").getResultado());

    // La solicitud anterior no debe bloquear una nueva.
    assertEquals(Retorno.Resultado.OK,
            s.solicitarDespliegueEnRegion(
                    "DEP-0001",
                    "us-east-1").getResultado());
}

}
