package com.tfg.gamelist.admin.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminRankingUser {
    private Long id;
    private String username;
    private String avatarUrl;
    private long entryCount;
    private long reviewCount;
    private long listCount;
    private long total;
}
