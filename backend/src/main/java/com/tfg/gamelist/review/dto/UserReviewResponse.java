package com.tfg.gamelist.review.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UserReviewResponse(
    Long id,
    Long rawgGameId,
    String gameTitle,
    String gameCoverUrl,
    String title,
    String body,
    BigDecimal score,
    boolean containsSpoilers,
    LocalDateTime publishedAt
) {}
