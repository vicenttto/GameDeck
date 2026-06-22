package com.tfg.gamelist.review.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record ReviewRequest(
    @NotBlank @Size(max = 150) String title,
    @NotBlank @Size(max = 10000) String body,
    @DecimalMin("0.0") @DecimalMax("10.0") BigDecimal score,
    boolean containsSpoilers
) {}
