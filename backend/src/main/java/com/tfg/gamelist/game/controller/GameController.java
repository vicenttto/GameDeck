package com.tfg.gamelist.game.controller;

import com.tfg.gamelist.game.dto.GameDetailResponse;
import com.tfg.gamelist.game.dto.GameSummaryResponse;
import com.tfg.gamelist.game.service.GameService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/games")
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @GetMapping("/{rawgGameId}/detail")
    public GameDetailResponse detail(
        @PathVariable @Min(1) long rawgGameId
    ) {
        return gameService.getGameDetail(rawgGameId);
    }

    @GetMapping("/search")
    public List<GameSummaryResponse> search(
        @RequestParam @NotBlank String query,
        @RequestParam(defaultValue = "1") @Min(1) int page,
        @RequestParam(defaultValue = "10") @Min(1) @Max(40) int size,
        @RequestParam(defaultValue = "false") boolean exact
    ) {
        return gameService.search(query, page, size, exact);
    }

    @GetMapping("/new-releases")
    public List<GameSummaryResponse> newReleases(
        @RequestParam(defaultValue = "15") @Min(1) @Max(40) int size
    ) {
        return gameService.newReleases(size);
    }

    @GetMapping("/upcoming")
    public List<GameSummaryResponse> upcoming(
        @RequestParam(defaultValue = "15") @Min(1) @Max(40) int size
    ) {
        return gameService.upcoming(size);
    }

    @GetMapping("/most-played")
    public List<GameSummaryResponse> mostPlayed(
        @RequestParam(defaultValue = "9") @Min(1) @Max(20) int size
    ) {
        return gameService.mostPlayed(size);
    }

    @GetMapping("/top")
    public List<GameSummaryResponse> top(
        @RequestParam(defaultValue = "6") @Min(1) @Max(20) int size
    ) {
        return gameService.topGames(size);
    }

    @GetMapping("/trending")
    public List<GameSummaryResponse> trending(
        @RequestParam(defaultValue = "9") @Min(1) @Max(20) int size
    ) {
        return gameService.trending(size);
    }

    @GetMapping("/best-metacritic")
    public List<GameSummaryResponse> bestMetacritic(
        @RequestParam(defaultValue = "9") @Min(1) @Max(20) int size
    ) {
        return gameService.bestMetacritic(size);
    }

    @GetMapping("/releases")
    public List<GameSummaryResponse> releases(
        @RequestParam @Min(2000) @Max(2100) int year,
        @RequestParam @Min(1)    @Max(12)   int month
    ) {
        return gameService.releasesByMonth(year, month);
    }

    @GetMapping("/browse")
    public List<GameSummaryResponse> browse(
        @RequestParam(required = false) String query,
        @RequestParam(required = false) String genres,
        @RequestParam(required = false) String platforms,
        @RequestParam(defaultValue = "-added") String ordering,
        @RequestParam(defaultValue = "1") @Min(1) int page,
        @RequestParam(defaultValue = "24") @Min(1) @Max(40) int size
    ) {
        return gameService.browse(query, genres, platforms, ordering, page, size);
    }

    @GetMapping("/most-reviewed")
    public List<GameSummaryResponse> mostReviewed(
        @RequestParam(defaultValue = "9") @Min(1) @Max(20) int size
    ) {
        return gameService.mostReviewed(size);
    }
}
