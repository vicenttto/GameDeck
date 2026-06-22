package com.tfg.gamelist.game.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class RawgClient {

    private final RestClient restClient;
    private final String baseUrl;
    private final String apiKey;

    public RawgClient(
        RestClient restClient,
        @Value("${app.rawg.base-url}") String baseUrl,
        @Value("${app.rawg.api-key}") String apiKey
    ) {
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("RAWG_API_KEY no configurada");
        }
        this.restClient = restClient;
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    public Map<String, Object> searchGames(String query, int page, int pageSize, boolean exact) {
        UriComponentsBuilder builder = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games")
            .queryParam("key", apiKey)
            .queryParam("search", query)
            .queryParam("page", page)
            .queryParam("page_size", pageSize);

        if (exact) {
            builder.queryParam("search_precise", "true");
        } else {
            builder.queryParam("ordering", "-added");
        }

        return restClient.get()
            .uri(builder.toUriString())
            .retrieve()
            .body(Map.class);
    }

    public Map<String, Object> browseGames(String query, String genres, String platforms, String ordering, int page, int pageSize) {
        UriComponentsBuilder builder = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games")
            .queryParam("key", apiKey)
            .queryParam("page", page)
            .queryParam("page_size", pageSize)
            .queryParam("ordering", ordering != null && !ordering.isBlank() ? ordering : "-added");

        if (query != null && !query.isBlank()) builder.queryParam("search", query);
        if (genres   != null && !genres.isBlank())   builder.queryParam("genres",    genres);
        if (platforms != null && !platforms.isBlank()) builder.queryParam("platforms", platforms);

        return restClient.get()
            .uri(builder.toUriString())
            .retrieve()
            .body(Map.class);
    }

    public Map<String, Object> fetchNewReleases(int pageSize) {
        String today = java.time.LocalDate.now().toString();
        String threeYearsAgo = java.time.LocalDate.now().minusYears(3).toString();
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games")
            .queryParam("key", apiKey)
            .queryParam("ordering", "-released")
            .queryParam("dates", threeYearsAgo + "," + today)
            .queryParam("ratings_count", "10")
            .queryParam("page_size", Math.min(pageSize * 3, 40))
            .toUriString();

        return restClient.get()
            .uri(uri)
            .retrieve()
            .body(Map.class);
    }

    public Map<String, Object> getGameById(long rawgGameId) {
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games/" + rawgGameId)
            .queryParam("key", apiKey)
            .toUriString();

        return restClient.get()
            .uri(uri)
            .retrieve()
            .body(Map.class);
    }

    public Map<String, Object> fetchUpcoming(int pageSize) {
        String tomorrow = java.time.LocalDate.now().plusDays(1).toString();
        String twoYearsAhead = java.time.LocalDate.now().plusYears(2).toString();
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games")
            .queryParam("key", apiKey)
            .queryParam("ordering", "-added")
            .queryParam("dates", tomorrow + "," + twoYearsAhead)
            .queryParam("page_size", 40)
            .toUriString();

        return restClient.get()
            .uri(uri)
            .retrieve()
            .body(Map.class);
    }

    public Map<String, Object> fetchMostPlayed(int pageSize) {
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games")
            .queryParam("key", apiKey)
            .queryParam("ordering", "-added")
            .queryParam("ratings_count", "50")
            .queryParam("page_size", pageSize)
            .toUriString();

        return restClient.get()
            .uri(uri)
            .retrieve()
            .body(Map.class);
    }

    public Map<String, Object> fetchTopGames(int pageSize) {
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games")
            .queryParam("key", apiKey)
            .queryParam("ordering", "-rating")
            .queryParam("metacritic", "85,100")
            .queryParam("page_size", pageSize)
            .toUriString();

        return restClient.get()
            .uri(uri)
            .retrieve()
            .body(Map.class);
    }

    public Map<String, Object> fetchTrending(int pageSize) {
        String today       = java.time.LocalDate.now().toString();
        String sixMonthsAgo = java.time.LocalDate.now().minusMonths(6).toString();
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games")
            .queryParam("key", apiKey)
            .queryParam("ordering", "-added")
            .queryParam("dates", sixMonthsAgo + "," + today)
            .queryParam("ratings_count", "5")
            .queryParam("page_size", pageSize)
            .toUriString();

        return restClient.get()
            .uri(uri)
            .retrieve()
            .body(Map.class);
    }

    public Map<String, Object> fetchBestMetacritic(int pageSize) {
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games")
            .queryParam("key", apiKey)
            .queryParam("ordering", "-metacritic")
            .queryParam("metacritic", "1,100")
            .queryParam("page_size", pageSize)
            .toUriString();

        return restClient.get()
            .uri(uri)
            .retrieve()
            .body(Map.class);
    }

    public Map<String, Object> getGameScreenshots(long rawgGameId) {
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games/" + rawgGameId + "/screenshots")
            .queryParam("key", apiKey)
            .queryParam("page_size", 8)
            .toUriString();
        return restClient.get().uri(uri).retrieve().body(Map.class);
    }

    public Map<String, Object> getGameMovies(long rawgGameId) {
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games/" + rawgGameId + "/movies")
            .queryParam("key", apiKey)
            .toUriString();
        return restClient.get().uri(uri).retrieve().body(Map.class);
    }

    public Map<String, Object> getGameAchievements(long rawgGameId) {
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games/" + rawgGameId + "/achievements")
            .queryParam("key", apiKey)
            .queryParam("page_size", 12)
            .toUriString();
        return restClient.get().uri(uri).retrieve().body(Map.class);
    }

    public Map<String, Object> getGameDlcs(long rawgGameId) {
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games/" + rawgGameId + "/additions")
            .queryParam("key", apiKey)
            .toUriString();
        return restClient.get().uri(uri).retrieve().body(Map.class);
    }

    public Map<String, Object> fetchReleasesByMonth(int year, int month, int page) {
        java.time.YearMonth ym = java.time.YearMonth.of(year, month);
        String start = ym.atDay(1).toString();
        String end   = ym.atEndOfMonth().toString();
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games")
            .queryParam("key", apiKey)
            .queryParam("dates", start + "," + end)
            .queryParam("ordering", "-added")
            .queryParam("page_size", 40)
            .queryParam("page", page)
            .toUriString();
        return restClient.get().uri(uri).retrieve().body(Map.class);
    }

    public Map<String, Object> fetchMostReviewed(int pageSize) {
        String uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/games")
            .queryParam("key", apiKey)
            .queryParam("ordering", "-ratings_count")
            .queryParam("page_size", pageSize)
            .toUriString();

        return restClient.get()
            .uri(uri)
            .retrieve()
            .body(Map.class);
    }
}
