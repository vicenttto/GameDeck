package com.tfg.gamelist.list.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateListRequest(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 500) String description,
    boolean isPublic
) {}
