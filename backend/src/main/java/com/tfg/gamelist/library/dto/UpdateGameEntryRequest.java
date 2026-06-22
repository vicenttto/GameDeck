package com.tfg.gamelist.library.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Body para PUT /api/me/games/{entryId}.
 * Todos los campos opcionales — sólo se actualizan los presentes (no null).
 * Para limpiar score se debe usar la cadena especial {@code "null"} en el JSON.
 */
@Data
public class UpdateGameEntryRequest {

    @Pattern(regexp = "PLAN_TO_PLAY|PLAYING|COMPLETED|ON_HOLD|DROPPED|REPLAYING")
    private String status;

    @DecimalMin("0.0") @DecimalMax("10.0")
    private BigDecimal score;

    @PositiveOrZero
    private BigDecimal progressHours;

    @Size(max = 100)
    private String platformNote;

    private Boolean isFavorite;

    @Size(max = 2000)
    private String notePrivate;

    @Size(max = 2000)
    private String notePublic;
}
