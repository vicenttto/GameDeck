package com.tfg.gamelist.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class AdminReviewResponse {
    private Long id;
    private Long userId;
    private String username;
    private String avatarUrl;
    private Long gameId;
    private String gameName;
    private String coverUrl;
    private String title;
    private String body;
    private BigDecimal score;
    private boolean containsSpoilers;
    private LocalDateTime createdAt;
}
