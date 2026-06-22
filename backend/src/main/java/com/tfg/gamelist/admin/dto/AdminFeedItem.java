package com.tfg.gamelist.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminFeedItem {
    private Long id;
    private Long userId;
    private String username;
    private String avatarUrl;
    private String eventType;
    private String gameTitle;
    private String gameCoverUrl;
    private String newStatus;
    private Double score;
    private String listName;
    private String targetUsername;
    private LocalDateTime createdAt;
}
