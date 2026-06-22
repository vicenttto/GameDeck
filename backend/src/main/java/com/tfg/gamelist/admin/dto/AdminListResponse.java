package com.tfg.gamelist.admin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminListResponse {
    private Long id;
    private Long userId;
    private String username;
    private String avatarUrl;
    private String name;
    private String description;
    @JsonProperty("isPublic")
    private boolean isPublic;
    private long itemCount;
    private LocalDateTime createdAt;
}
