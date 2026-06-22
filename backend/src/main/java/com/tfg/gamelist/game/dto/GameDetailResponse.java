package com.tfg.gamelist.game.dto;

import java.util.List;

public record GameDetailResponse(
    Long rawgGameId,
    String title,
    String description,
    String released,
    String coverUrl,
    String backgroundUrl,
    Double rawgRating,
    Integer metacritic,
    List<String> genres,
    List<String> platforms,
    List<String> developers,
    List<String> publishers,
    String website,
    Integer playtime,
    String esrbRating,
    List<String> screenshots,
    String trailerUrl,
    Integer communityPlanning,
    Integer communityPlaying,
    Integer communityCompleted,
    Integer communityDropped,
    List<AchievementInfo> achievements,
    List<DlcInfo> dlcs
) {
    public record AchievementInfo(String name, String description, String imageUrl, String percent) {}
    public record DlcInfo(Long rawgGameId, String title, String coverUrl, String released) {}
}
