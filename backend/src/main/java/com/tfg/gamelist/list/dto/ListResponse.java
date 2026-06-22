package com.tfg.gamelist.list.dto;

import java.util.List;

public record ListResponse(
    Long id,
    String name,
    String description,
    boolean isPublic,
    int gameCount,
    List<String> covers,
    List<ListItemResponse> items
) {}
