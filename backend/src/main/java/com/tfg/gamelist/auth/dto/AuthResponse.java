package com.tfg.gamelist.auth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String token;
    private String username;
    private String email;
    private String avatarUrl;
    private boolean admin;
}
