package com.tfg.gamelist.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Size(min = 3, max = 40)
    private String username;

    @Size(max = 1000)
    private String bio;

    @Size(max = 2)
    private String countryCode;

    @Size(max = 500)
    private String avatarUrl;
}
