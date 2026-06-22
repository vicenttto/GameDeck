package com.tfg.gamelist.library.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Vista de una entrada de biblioteca enriquecida con los datos del juego.
 * Sirve a la rejilla de la biblioteca y a la sección de favoritos del perfil.
 */
@Data
@Builder
public class GameEntryResponse {

    private Long id;
    private String status;
    private BigDecimal score;
    private BigDecimal progressHours;
    private String platformNote;
    private LocalDate startedAt;
    private LocalDate finishedAt;
    /** Usamos {@link Boolean} (no primitivo) para que Lombok genere getIsFavorite()
     * y Jackson lo serialice como "isFavorite" en lugar de "favorite". */
    private Boolean isFavorite;
    private String notePrivate;
    private String notePublic;
    private LocalDateTime updatedAt;

    private Long gameId;
    private Long rawgGameId;
    private String title;
    private String coverUrl;
    private LocalDate releasedAt;
    private List<String> genres;
    private List<String> platforms;
    private BigDecimal rawgRating;
    private Integer metacritic;
}
