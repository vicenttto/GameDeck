package com.tfg.gamelist.library.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Agregados de la biblioteca para la barra de stats del perfil.
 */
@Data
@Builder
public class LibraryStatsResponse {
    private long total;
    private long playing;
    private long completed;
    private long replaying;
    private long onHold;
    private long dropped;
    private long planToPlay;
    /** Puede ser null si el usuario aún no ha puntuado ningún juego. */
    private BigDecimal meanScore;
    private BigDecimal totalHours;
}
