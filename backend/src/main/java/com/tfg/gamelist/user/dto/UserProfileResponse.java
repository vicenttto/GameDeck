package com.tfg.gamelist.user.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserProfileResponse {

    private Long id;
    private String username;
    private String email;
    private String avatarUrl;
    private String bio;
    private String countryCode;
    private LocalDateTime createdAt;
    private long followersCount;
    private long followingCount;
    /** null when viewing own profile; true/false when viewing another user's profile. */
    private Boolean isFollowing;
}
