package com.tfg.gamelist.list.dto;

import jakarta.validation.constraints.Size;

public record UpdateListRequest(
    @Size(max = 100) String name,
    @Size(max = 500) String description,
    Boolean isPublic
) {}
