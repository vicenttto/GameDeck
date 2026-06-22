package com.tfg.gamelist.game.dto;

import java.util.List;

public record GameSummaryResponse(
    Integer externalId,
    String title,
    String released,
    String coverUrl,
    Double rawgRating,
    List<String> genres,
    Integer added,
    Integer metacritic,
    Integer ratingsCount,
    Boolean hot,
    List<String> platforms,
    List<String> developers
) {
}
