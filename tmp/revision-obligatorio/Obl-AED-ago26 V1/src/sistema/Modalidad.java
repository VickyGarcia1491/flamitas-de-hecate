package sistema;

import java.util.Arrays;
import java.util.Objects;

public enum Modalidad {
    TEXTO(0, "Texto"),
    VISION(1, "Visión"),
    AUDIO(2, "Audio"),
    MULTIMODAL(3, "Multimodal"),
    OTROS(4, "Otros");

    private final int indice;
    private final String texto;

    Modalidad(int indice, String texto) {
        this.indice = indice;
        this.texto = texto;
    }

    public int getIndice() {
        return indice;
    }

    public String getTexto() {
        return texto;
    }

    public static Modalidad fromTexto(String texto) {
        return Arrays.stream(Modalidad.values())
                .filter(a -> Objects.equals(a.texto, texto))
                .findFirst()
                .orElse(null);
    }

}
