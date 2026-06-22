package com.tfg.gamelist.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class AdminEntryResponse {
    private Long id;
    private Long userId;
    private String username;
    private String avatarUrl;
    private Long gameId;
    private String gameName;
    private String coverUrl;
    private String status;
    private BigDecimal score;
    private String notePublic;
    private String notePrivate;
    private LocalDateTime createdAt;
}
