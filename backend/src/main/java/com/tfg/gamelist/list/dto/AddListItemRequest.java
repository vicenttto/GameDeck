package com.tfg.gamelist.list.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AddListItemRequest(
    @NotNull @Min(1) Long rawgGameId,
    @Size(max = 500) String note
) {}
