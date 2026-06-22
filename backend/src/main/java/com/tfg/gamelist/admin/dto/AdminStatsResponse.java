package com.tfg.gamelist.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AdminStatsResponse {

    private long totalUsers;
    private long totalReviews;
    private long totalLists;
    private double averageScore;

    private List<StatusCount> statusDistribution;
    private List<ScoreCount>  scoreHistogram;
    private List<GameStat>    topGamesByEntries;
    private List<GameStat>    topGamesByReviews;

    private List<GenreStat> genreDistribution;

    public record StatusCount(String status, long count) {}
    public record ScoreCount(int score, long count) {}
    public record GameStat(String gameName, String coverUrl, long count) {}
    public record GenreStat(String genre, long count) {}
}
