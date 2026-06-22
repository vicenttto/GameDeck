package com.tfg.gamelist.review.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ReviewResponse(
    Long id,
    String username,
    String avatarUrl,
    String title,
    String body,
    BigDecimal score,
    boolean containsSpoilers,
    LocalDateTime publishedAt,
    boolean own
) {}
