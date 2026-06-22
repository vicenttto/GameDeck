package com.tfg.gamelist.library.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tfg.gamelist.activity.service.ActivityService;
import com.tfg.gamelist.common.exception.ApiException;
import com.tfg.gamelist.game.client.RawgClient;
import com.tfg.gamelist.library.dto.AddGameRequest;
import com.tfg.gamelist.library.dto.GameEntryResponse;
import com.tfg.gamelist.library.dto.LibraryStatsResponse;
import com.tfg.gamelist.library.dto.UpdateGameEntryRequest;
import com.tfg.gamelist.library.entity.Game;
import com.tfg.gamelist.library.entity.UserGameEntry;
import com.tfg.gamelist.library.repository.GameRepository;
import com.tfg.gamelist.library.repository.UserGameEntryRepository;
import com.tfg.gamelist.user.entity.User;
import com.tfg.gamelist.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
public class LibraryService {

    private static final String DEFAULT_STATUS = "PLAN_TO_PLAY";

    private final UserGameEntryRepository entryRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final RawgClient rawgClient;
    private final ObjectMapper objectMapper;
    private final ActivityService activityService;

    public LibraryService(UserGameEntryRepository entryRepository,
                          GameRepository gameRepository,
                          UserRepository userRepository,
                          RawgClient rawgClient,
                          ObjectMapper objectMapper,
                          ActivityService activityService) {
        this.entryRepository  = entryRepository;
        this.gameRepository   = gameRepository;
        this.userRepository   = userRepository;
        this.rawgClient       = rawgClient;
        this.objectMapper     = objectMapper;
        this.activityService  = activityService;
    }

    // ── Comandos ─────────────────────────────────────────────────────────────

    @Transactional
    public GameEntryResponse addGame(User user, AddGameRequest req) {
        Game game = gameRepository.findByRawgGameId(req.getRawgGameId())
                .orElseGet(() -> fetchAndSaveGame(req.getRawgGameId()));

        entryRepository.findByUserIdAndGameId(user.getId(), game.getId())
                .ifPresent(e -> {
                    throw new ApiException(HttpStatus.CONFLICT, "Este juego ya está en tu biblioteca");
                });

        UserGameEntry entry = UserGameEntry.builder()
                .userId(user.getId())
                .gameId(game.getId())
                .status(req.getStatus() != null ? req.getStatus() : DEFAULT_STATUS)
                .score(req.getScore())
                .progressHours(req.getProgressHours() != null ? req.getProgressHours() : BigDecimal.ZERO)
                .platformNote(req.getPlatformNote())
                .isFavorite(Boolean.TRUE.equals(req.getIsFavorite()))
                .notePrivate(req.getNotePrivate() != null && !req.getNotePrivate().isBlank() ? req.getNotePrivate() : null)
                .notePublic(req.getNotePublic() != null && !req.getNotePublic().isBlank() ? req.getNotePublic() : null)
                .visibility("PUBLIC")
                .build();

        applyStatusSideEffects(entry, entry.getStatus(), null);
        UserGameEntry saved = entryRepository.save(entry);
        activityService.recordStatusChanged(user.getId(), game.getId(), game.getName(), game.getCoverUrl(), saved.getStatus());
        return toResponse(saved, game, user.getId());
    }

    @Transactional
    public GameEntryResponse updateEntry(User user, Long entryId, UpdateGameEntryRequest req) {
        UserGameEntry entry = entryRepository.getOrThrow(entryId);

        if (!entry.getUserId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "No puedes editar entradas de otro usuario");
        }

        String previousStatus   = entry.getStatus();
        java.math.BigDecimal previousScore = entry.getScore();
        boolean previousFavorite = entry.isFavorite();

        if (req.getStatus()        != null) entry.setStatus(req.getStatus());
        if (req.getScore()         != null) entry.setScore(req.getScore());
        if (req.getProgressHours() != null) entry.setProgressHours(req.getProgressHours());
        if (req.getPlatformNote()  != null) entry.setPlatformNote(req.getPlatformNote().isBlank() ? null : req.getPlatformNote());
        if (req.getIsFavorite()    != null) entry.setFavorite(req.getIsFavorite());
        if (req.getNotePrivate()   != null) entry.setNotePrivate(req.getNotePrivate().isBlank() ? null : req.getNotePrivate());
        if (req.getNotePublic()    != null) entry.setNotePublic(req.getNotePublic().isBlank() ? null : req.getNotePublic());

        applyStatusSideEffects(entry, entry.getStatus(), previousStatus);

        UserGameEntry saved = entryRepository.save(entry);
        Game game = gameRepository.getOrThrow(saved.getGameId());

        if (!saved.getStatus().equals(previousStatus)) {
            activityService.recordStatusChanged(user.getId(), game.getId(), game.getName(), game.getCoverUrl(), saved.getStatus());
        }
        if (saved.getScore() != null && !saved.getScore().equals(previousScore)) {
            activityService.recordScoreUpdated(user.getId(), game.getId(), game.getName(), game.getCoverUrl(), saved.getScore().doubleValue());
        }
        if (saved.isFavorite() && !previousFavorite) {
            activityService.recordFavorited(user.getId(), game.getId(), game.getName(), game.getCoverUrl());
        }
        return toResponse(saved, game, user.getId());
    }

    @Transactional
    public void deleteEntry(User user, Long entryId) {
        UserGameEntry entry = entryRepository.getOrThrow(entryId);

        if (!entry.getUserId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "No puedes borrar entradas de otro usuario");
        }
        entryRepository.delete(entry);
    }

    // ── Consultas ────────────────────────────────────────────────────────────

    public Page<GameEntryResponse> listByUsername(String username, String statusFilter, int page, int size, Long viewerId) {
        User user = resolveUser(username);
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));

        Page<UserGameEntry> entries = (statusFilter == null || statusFilter.isBlank() || "ALL".equalsIgnoreCase(statusFilter))
                ? entryRepository.findByUserId(user.getId(), pageable)
                : entryRepository.findByUserIdAndStatus(user.getId(), statusFilter, pageable);

        return entries.map(e -> toResponseLoadingGame(e, viewerId));
    }

    public List<GameEntryResponse> listFavorites(String username, Long viewerId) {
        User user = resolveUser(username);
        return entryRepository.findByUserIdAndIsFavoriteTrue(user.getId()).stream()
                .map(e -> toResponseLoadingGame(e, viewerId))
                .toList();
    }

    public Optional<GameEntryResponse> findEntryByRawgGameId(User user, Long rawgGameId) {
        return gameRepository.findByRawgGameId(rawgGameId)
            .flatMap(game -> entryRepository.findByUserIdAndGameId(user.getId(), game.getId())
                .map(entry -> toResponse(entry, game, user.getId())));
    }

    public List<Long> getRawgGameIds(User user) {
        return entryRepository.findRawgGameIdsByUserId(user.getId());
    }

    public LibraryStatsResponse getStats(String username) {
        User user = resolveUser(username);
        Long uid = user.getId();

        BigDecimal mean = entryRepository.averageScoreByUserId(uid);
        if (mean != null) mean = mean.setScale(1, RoundingMode.HALF_UP);

        BigDecimal totalHours = entryRepository.sumProgressHoursByUserId(uid);
        if (totalHours == null) totalHours = BigDecimal.ZERO;

        return LibraryStatsResponse.builder()
                .total(      entryRepository.countByUserId(uid))
                .playing(    entryRepository.countByUserIdAndStatus(uid, "PLAYING"))
                .completed(  entryRepository.countByUserIdAndStatus(uid, "COMPLETED"))
                .replaying(  entryRepository.countByUserIdAndStatus(uid, "REPLAYING"))
                .onHold(     entryRepository.countByUserIdAndStatus(uid, "ON_HOLD"))
                .dropped(    entryRepository.countByUserIdAndStatus(uid, "DROPPED"))
                .planToPlay( entryRepository.countByUserIdAndStatus(uid, "PLAN_TO_PLAY"))
                .meanScore(mean)
                .totalHours(totalHours)
                .build();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private User resolveUser(String username) {
        return userRepository.getByUsernameOrThrow(username);
    }

    /**
     * Trae los datos del juego desde RAWG y los persiste en {@code games}.
     * Se llama sólo la primera vez que cualquier usuario añade ese juego.
     */
    private Game fetchAndSaveGame(Long rawgGameId) {
        Map<String, Object> raw;
        try {
            raw = rawgClient.getGameById(rawgGameId);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "No se pudo obtener el juego de RAWG");
        }
        if (raw == null || raw.get("id") == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Juego no encontrado en RAWG");
        }

        String name = Objects.toString(raw.get("name"), null);
        String slug = Objects.toString(raw.get("slug"), null);
        if (name == null || slug == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Respuesta de RAWG inválida");
        }

        Game game = Game.builder()
                .rawgGameId(rawgGameId)
                .slug(slug)
                .name(name)
                .descriptionShort(truncate(stripHtml(Objects.toString(raw.get("description_raw"), null)), 1000))
                .releasedAt(parseDate(Objects.toString(raw.get("released"), null)))
                .coverUrl(truncate(Objects.toString(raw.get("background_image"), null), 500))
                .backgroundUrl(truncate(Objects.toString(raw.get("background_image_additional"), null), 500))
                .metacritic(raw.get("metacritic") instanceof Number n ? n.intValue() : null)
                .rawgRating(raw.get("rating") instanceof Number n ? BigDecimal.valueOf(n.doubleValue()).setScale(2, RoundingMode.HALF_UP) : null)
                .ratingsCount(raw.get("ratings_count") instanceof Number n ? n.intValue() : null)
                .platformsJson(toJsonArrayOfNames(raw.get("platforms"), "platform"))
                .genresJson(toJsonArrayOfNames(raw.get("genres"), null))
                .developersJson(toJsonArrayOfNames(raw.get("developers"), null))
                .publishersJson(toJsonArrayOfNames(raw.get("publishers"), null))
                .lastRawgSyncAt(LocalDateTime.now())
                .build();

        return gameRepository.save(game);
    }

    /**
     * Aplica started_at/finished_at automáticamente según las transiciones de estado.
     * Estas son convenciones del proyecto: simplifican el UX (el usuario no rellena fechas).
     */
    private void applyStatusSideEffects(UserGameEntry entry, String newStatus, String previousStatus) {
        LocalDate today = LocalDate.now();

        if ("PLAYING".equals(newStatus) && entry.getStartedAt() == null) {
            entry.setStartedAt(today);
        }
        if ("COMPLETED".equals(newStatus) && entry.getFinishedAt() == null) {
            entry.setFinishedAt(today);
            if (entry.getStartedAt() == null) entry.setStartedAt(today);
        }
        // Rejugando: parte de un juego ya completado, reseteamos el inicio de la partida
        // actual y dejamos finished_at como histórico del primer completado.
        if ("REPLAYING".equals(newStatus) && !"REPLAYING".equals(previousStatus)) {
            entry.setStartedAt(today);
        }
        if ("PLAN_TO_PLAY".equals(newStatus) && !"PLAN_TO_PLAY".equals(previousStatus)) {
            entry.setStartedAt(null);
            entry.setFinishedAt(null);
        }
    }

    private GameEntryResponse toResponseLoadingGame(UserGameEntry entry, Long viewerId) {
        Game game = gameRepository.getOrThrow(entry.getGameId());
        return toResponse(entry, game, viewerId);
    }

    private GameEntryResponse toResponse(UserGameEntry entry, Game game, Long viewerId) {
        boolean isOwner = viewerId != null && viewerId.equals(entry.getUserId());

        return GameEntryResponse.builder()
                .id(entry.getId())
                .status(entry.getStatus())
                .score(entry.getScore())
                .progressHours(entry.getProgressHours())
                .platformNote(entry.getPlatformNote())
                .startedAt(entry.getStartedAt())
                .finishedAt(entry.getFinishedAt())
                .isFavorite(entry.isFavorite())
                .notePrivate(isOwner ? entry.getNotePrivate() : null)
                .notePublic(entry.getNotePublic())
                .updatedAt(entry.getUpdatedAt())
                .gameId(game.getId())
                .rawgGameId(game.getRawgGameId())
                .title(game.getName())
                .coverUrl(game.getCoverUrl())
                .releasedAt(game.getReleasedAt())
                .genres(parseJsonList(game.getGenresJson()))
                .platforms(parseJsonList(game.getPlatformsJson()))
                .rawgRating(game.getRawgRating())
                .metacritic(game.getMetacritic())
                .build();
    }

    // ── Parsing de la respuesta RAWG ─────────────────────────────────────────

    /**
     * Extrae los nombres de una lista de objetos RAWG.
     * Algunos arrays (platforms) están envueltos en {@code {"platform": {"name": ...}}};
     * en ese caso se pasa el {@code nestedKey}.
     */
    @SuppressWarnings("unchecked")
    private String toJsonArrayOfNames(Object input, String nestedKey) {
        if (!(input instanceof List<?> list) || list.isEmpty()) return "[]";
        List<String> names = list.stream()
                .filter(Map.class::isInstance)
                .map(o -> (Map<String, Object>) o)
                .map(m -> nestedKey != null && m.get(nestedKey) instanceof Map<?, ?> inner
                        ? Objects.toString(((Map<String, Object>) inner).get("name"), null)
                        : Objects.toString(m.get("name"), null))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        try {
            return objectMapper.writeValueAsString(names);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private List<String> parseJsonList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    private static String stripHtml(String input) {
        if (input == null) return null;
        return input.replaceAll("<[^>]+>", "").trim();
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDate.parse(raw);
        } catch (Exception e) {
            return null;
        }
    }

}
