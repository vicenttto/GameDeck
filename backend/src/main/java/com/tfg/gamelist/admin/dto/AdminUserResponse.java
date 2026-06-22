package com.tfg.gamelist.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminUserResponse {
    private Long id;
    private String username;
    private String email;
    private String avatarUrl;
    private LocalDateTime createdAt;
    private long reviewCount;
    private long listCount;
    private long noteCount;
    private boolean admin;
}
