package com.tfg.gamelist.game.service;

import com.tfg.gamelist.common.exception.ApiException;
import com.tfg.gamelist.game.client.RawgClient;
import com.tfg.gamelist.game.dto.GameDetailResponse;
import com.tfg.gamelist.game.dto.GameSummaryResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class GameService {

    private final RawgClient rawgClient;

    public GameService(RawgClient rawgClient) {
        this.rawgClient = rawgClient;
    }

    public List<GameSummaryResponse> search(String query, int page, int pageSize, boolean exact) {
        Map<String, Object> rawResponse = rawgClient.searchGames(query, page, pageSize + 10, exact);
        return extractResults(rawResponse).stream()
            .limit(pageSize)
            .toList();
    }

    public List<GameSummaryResponse> newReleases(int size) {
        Map<String, Object> rawResponse = rawgClient.fetchNewReleases(size);
        return extractResults(rawResponse).stream()
            .filter(g -> g.coverUrl() != null)
            .limit(size)
            .toList();
    }

    public List<GameSummaryResponse> upcoming(int size) {
        Map<String, Object> rawResponse = rawgClient.fetchUpcoming(size);
        return extractResults(rawResponse).stream()
            .limit(size)
            .toList();
    }

    public List<GameSummaryResponse> mostPlayed(int size) {
        Map<String, Object> rawResponse = rawgClient.fetchMostPlayed(size);
        return extractResults(rawResponse).stream()
            .filter(g -> g.coverUrl() != null)
            .limit(size)
            .toList();
    }

    public List<GameSummaryResponse> topGames(int size) {
        Map<String, Object> rawResponse = rawgClient.fetchTopGames(size);
        return extractResults(rawResponse);
    }

    public List<GameSummaryResponse> trending(int size) {
        Map<String, Object> rawResponse = rawgClient.fetchTrending(size);
        return extractResults(rawResponse).stream()
            .filter(g -> g.coverUrl() != null)
            .limit(size)
            .toList();
    }

    public List<GameSummaryResponse> bestMetacritic(int size) {
        Map<String, Object> rawResponse = rawgClient.fetchBestMetacritic(size + 5);
        return extractResults(rawResponse).stream()
            .filter(g -> g.coverUrl() != null && g.metacritic() != null)
            .limit(size)
            .toList();
    }

    public List<GameSummaryResponse> releasesByMonth(int year, int month) {
        List<GameSummaryResponse> all = new ArrayList<>();
        for (int page = 1; page <= 3; page++) {
            List<GameSummaryResponse> pageResults = extractResults(rawgClient.fetchReleasesByMonth(year, month, page))
                .stream()
                .filter(g -> g.coverUrl() != null)
                .toList();
            all.addAll(pageResults);
            if (pageResults.size() < 40) break;
        }
        return all;
    }

    public List<GameSummaryResponse> browse(String query, String genres, String platforms, String ordering, int page, int pageSize) {
        Map<String, Object> rawResponse = rawgClient.browseGames(query, genres, platforms, ordering, page, pageSize + 10);
        return extractResults(rawResponse).stream()
            .filter(g -> g.coverUrl() != null)
            .limit(pageSize)
            .toList();
    }

    public List<GameSummaryResponse> mostReviewed(int size) {
        Map<String, Object> rawResponse = rawgClient.fetchMostReviewed(size);
        return extractResults(rawResponse).stream()
            .filter(g -> g.coverUrl() != null)
            .limit(size)
            .toList();
    }

    @SuppressWarnings("unchecked")
    public GameDetailResponse getGameDetail(long rawgGameId) {
        Map<String, Object> raw;
        try {
            raw = rawgClient.getGameById(rawgGameId);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "No se pudo obtener el juego de RAWG");
        }
        if (raw == null || raw.get("id") == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Juego no encontrado");
        }

        String title       = Objects.toString(raw.get("name"),             null);
        String description = Objects.toString(raw.get("description_raw"),  null);
        String released    = Objects.toString(raw.get("released"),         null);
        String coverUrl    = Objects.toString(raw.get("background_image"), null);
        String backgroundUrl = Objects.toString(raw.get("background_image_additional"), null);
        Double rawgRating  = raw.get("rating")     instanceof Number n ? n.doubleValue() : null;
        Integer metacritic = raw.get("metacritic") instanceof Number n ? n.intValue()    : null;
        Integer playtime   = raw.get("playtime")   instanceof Number n ? n.intValue()    : null;
        String website     = raw.get("website") instanceof String s && !s.isBlank() ? s : null;

        String esrbRating = null;
        if (raw.get("esrb_rating") instanceof Map<?, ?> esrb) {
            esrbRating = Objects.toString(esrb.get("name"), null);
        }

        List<String> genres     = extractNames(raw.get("genres"),     null);
        List<String> platforms  = extractNames(raw.get("platforms"),  "platform");
        List<String> developers = extractNames(raw.get("developers"), null);
        List<String> publishers = extractNames(raw.get("publishers"), null);

        List<String> screenshots = new ArrayList<>();
        try {
            Map<String, Object> ssRaw = rawgClient.getGameScreenshots(rawgGameId);
            if (ssRaw != null && ssRaw.get("results") instanceof List<?> results) {
                for (Object r : results) {
                    if (r instanceof Map<?, ?> m && m.get("image") instanceof String url) {
                        screenshots.add(url);
                    }
                }
            }
        } catch (Exception ignored) {}

        String trailerUrl = null;
        try {
            Map<String, Object> moviesRaw = rawgClient.getGameMovies(rawgGameId);
            if (moviesRaw != null && moviesRaw.get("results") instanceof List<?> results && !results.isEmpty()) {
                if (results.get(0) instanceof Map<?, ?> movie && movie.get("data") instanceof Map<?, ?> data) {
                    Object url = data.get("480");
                    if (!(url instanceof String)) url = data.get("max");
                    if (url instanceof String s) trailerUrl = s;
                }
            }
        } catch (Exception ignored) {}

        Integer communityPlanning  = null;
        Integer communityPlaying   = null;
        Integer communityCompleted = null;
        Integer communityDropped   = null;
        if (raw.get("added_by_status") instanceof Map<?, ?> abs) {
            communityPlanning  = abs.get("toplay")  instanceof Number n ? n.intValue() : null;
            communityPlaying   = abs.get("playing") instanceof Number n ? n.intValue() : null;
            communityCompleted = abs.get("beaten")  instanceof Number n ? n.intValue() : null;
            communityDropped   = abs.get("dropped") instanceof Number n ? n.intValue() : null;
        }

        List<GameDetailResponse.AchievementInfo> achievements = new ArrayList<>();
        try {
            Map<String, Object> achRaw = rawgClient.getGameAchievements(rawgGameId);
            if (achRaw != null && achRaw.get("results") instanceof List<?> results) {
                for (Object r : results) {
                    if (!(r instanceof Map<?, ?> m)) continue;
                    String achName  = Objects.toString(m.get("name"),        null);
                    String achDesc  = Objects.toString(m.get("description"), null);
                    String achImg   = Objects.toString(m.get("image"),       null);
                    String achPct = null;
                    Object pctObj = m.get("percent");
                    if (pctObj instanceof Number n) {
                        achPct = String.format("%.1f%%", n.doubleValue());
                    } else if (pctObj instanceof String s && !s.isBlank()) {
                        try { achPct = String.format("%.1f%%", Double.parseDouble(s)); }
                        catch (NumberFormatException ignored2) { achPct = s + "%"; }
                    }
                    if (achName != null) achievements.add(new GameDetailResponse.AchievementInfo(achName, achDesc, achImg, achPct));
                }
            }
        } catch (Exception ignored) {}

        List<GameDetailResponse.DlcInfo> dlcs = new ArrayList<>();
        try {
            Map<String, Object> dlcRaw = rawgClient.getGameDlcs(rawgGameId);
            if (dlcRaw != null && dlcRaw.get("results") instanceof List<?> results) {
                for (Object r : results) {
                    if (!(r instanceof Map<?, ?> m)) continue;
                    Long   dlcId      = m.get("id")               instanceof Number n ? n.longValue() : null;
                    String dlcTitle   = Objects.toString(m.get("name"),             null);
                    String dlcCover   = Objects.toString(m.get("background_image"), null);
                    String dlcRelease = Objects.toString(m.get("released"),         null);
                    if (dlcId != null && dlcTitle != null) dlcs.add(new GameDetailResponse.DlcInfo(dlcId, dlcTitle, dlcCover, dlcRelease));
                }
            }
        } catch (Exception ignored) {}

        Number idNum = (Number) raw.get("id");
        return new GameDetailResponse(
            idNum.longValue(), title, description, released,
            coverUrl, backgroundUrl, rawgRating, metacritic,
            genres, platforms, developers, publishers,
            website, playtime, esrbRating, screenshots, trailerUrl,
            communityPlanning, communityPlaying, communityCompleted, communityDropped,
            achievements, dlcs
        );
    }

    @SuppressWarnings("unchecked")
    private List<String> extractNames(Object input, String nestedKey) {
        if (!(input instanceof List<?> list)) return Collections.emptyList();
        return list.stream()
            .filter(Map.class::isInstance)
            .map(o -> (Map<String, Object>) o)
            .map(m -> nestedKey != null && m.get(nestedKey) instanceof Map<?, ?> inner
                ? Objects.toString(((Map<String, Object>) inner).get("name"), null)
                : Objects.toString(m.get("name"), null))
            .filter(Objects::nonNull)
            .distinct()
            .toList();
    }

    private static final Set<String> ADULT_TAG_SLUGS = Set.of(
        "nsfw", "hentai", "eroge", "adult-only", "erotic", "18+",
        "sexual-content", "explicit-content", "pornographic", "xxx"
    );

    private static final List<String> ADULT_TITLE_KEYWORDS = List.of(
        "porn", "xxx", "hentai", "eroge", "sex tape", "mega porn", "lewd pack",
        "uncensored patch", "adult game", "nsfw"
    );

    private boolean isAdultContent(Map<String, Object> gameMap) {
        // Check ESRB rating slug
        if (gameMap.get("esrb_rating") instanceof Map<?, ?> esrb) {
            String slug = Objects.toString(esrb.get("slug"), null);
            if ("adults-only".equals(slug)) return true;
        }

        // Check tags list for adult slugs
        if (gameMap.get("tags") instanceof List<?> tags) {
            for (Object tag : tags) {
                if (tag instanceof Map<?, ?> tagMap) {
                    String slug = Objects.toString(tagMap.get("slug"), null);
                    if (slug != null && ADULT_TAG_SLUGS.contains(slug)) return true;
                }
            }
        }

        // Fallback: keyword match on title (catches untagged adult games)
        String name = Objects.toString(gameMap.get("name"), "").toLowerCase();
        for (String keyword : ADULT_TITLE_KEYWORDS) {
            if (name.contains(keyword)) return true;
        }

        return false;
    }

    @SuppressWarnings("unchecked")
    private List<GameSummaryResponse> extractResults(Map<String, Object> rawResponse) {
        Object resultsObj = rawResponse.get("results");
        if (!(resultsObj instanceof List<?> results)) {
            return Collections.emptyList();
        }
        return results.stream()
            .filter(Map.class::isInstance)
            .map(m -> (Map<String, Object>) m)
            .filter(m -> !isAdultContent(m))
            .map(this::mapToGameSummary)
            .toList();
    }

    private GameSummaryResponse mapToGameSummary(Map<String, Object> gameMap) {
        Integer id           = gameMap.get("id")           instanceof Number n ? n.intValue()    : null;
        Double  rating       = gameMap.get("rating")       instanceof Number n ? n.doubleValue() : null;
        Integer added        = gameMap.get("added")        instanceof Number n ? n.intValue()    : null;
        Integer metacritic   = gameMap.get("metacritic")   instanceof Number n ? n.intValue()    : null;
        Integer ratingsCount = gameMap.get("ratings_count") instanceof Number n ? n.intValue()   : null;
        String title    = Objects.toString(gameMap.get("name"),             null);
        String released = Objects.toString(gameMap.get("released"),         null);
        String cover    = Objects.toString(gameMap.get("background_image"), null);

        List<String> genres = Collections.emptyList();
        if (gameMap.get("genres") instanceof List<?> genreList) {
            genres = genreList.stream()
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .map(g -> Objects.toString(g.get("name"), null))
                .filter(Objects::nonNull)
                .toList();
        }

        boolean hot = (metacritic != null && metacritic >= 75)
            || (rating != null && rating >= 4.0 && ratingsCount != null && ratingsCount >= 10)
            || (metacritic == null && rating == null && added != null && added >= 500);

        List<String> platforms = Collections.emptyList();
        if (gameMap.get("platforms") instanceof List<?> pl) {
            platforms = pl.stream()
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .map(p -> p.get("platform") instanceof Map<?, ?> inner
                    ? Objects.toString(inner.get("name"), null) : null)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        }

        List<String> developers = Collections.emptyList();
        if (gameMap.get("developers") instanceof List<?> dl) {
            developers = dl.stream()
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .map(d -> Objects.toString(d.get("name"), null))
                .filter(Objects::nonNull)
                .toList();
        }

        return new GameSummaryResponse(id, title, released, cover, rating, genres, added, metacritic, ratingsCount, hot, platforms, developers);
    }
}
