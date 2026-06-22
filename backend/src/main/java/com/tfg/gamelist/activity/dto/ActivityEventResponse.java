package com.tfg.gamelist.activity.dto;

import java.time.LocalDateTime;

public record ActivityEventResponse(
        Long id,
        String eventType,
        String gameTitle,
        String gameCoverUrl,
        String newStatus,
        Double score,
        String listName,
        String targetUsername,
        String targetAvatarUrl,
        LocalDateTime createdAt
) {}
