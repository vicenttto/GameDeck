package com.tfg.gamelist.list.dto;

import java.util.List;

public record ListItemResponse(
    Long id,
    long rawgGameId,
    String title,
    String coverUrl,
    String releasedAt,
    List<String> genres,
    String note,
    Integer position
) {}
