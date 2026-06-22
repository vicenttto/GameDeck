package com.tfg.gamelist.admin.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tfg.gamelist.activity.entity.UserActivityEvent;
import com.tfg.gamelist.activity.repository.UserActivityEventRepository;
import com.tfg.gamelist.admin.dto.*;
import com.tfg.gamelist.common.exception.ApiException;
import com.tfg.gamelist.library.entity.Game;
import com.tfg.gamelist.library.entity.UserGameEntry;
import com.tfg.gamelist.library.repository.GameRepository;
import com.tfg.gamelist.library.repository.UserGameEntryRepository;
import com.tfg.gamelist.list.entity.UserList;
import com.tfg.gamelist.list.repository.UserListItemRepository;
import com.tfg.gamelist.list.repository.UserListRepository;
import com.tfg.gamelist.review.entity.Review;
import com.tfg.gamelist.review.repository.ReviewRepository;
import com.tfg.gamelist.user.entity.User;
import com.tfg.gamelist.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final UserListRepository listRepository;
    private final UserListItemRepository listItemRepository;
    private final UserGameEntryRepository entryRepository;
    private final GameRepository gameRepository;
    private final UserActivityEventRepository activityRepository;
    private final ObjectMapper objectMapper;

    public AdminService(UserRepository userRepository,
                        ReviewRepository reviewRepository,
                        UserListRepository listRepository,
                        UserListItemRepository listItemRepository,
                        UserGameEntryRepository entryRepository,
                        GameRepository gameRepository,
                        UserActivityEventRepository activityRepository,
                        ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.listRepository = listRepository;
        this.listItemRepository = listItemRepository;
        this.entryRepository = entryRepository;
        this.gameRepository = gameRepository;
        this.activityRepository = activityRepository;
        this.objectMapper = objectMapper;
    }

    // ── Usuarios ─────────────────────────────────────────────────────────────

    public Page<AdminUserResponse> listUsers(int page, int size) {
        return userRepository.findAllNonAdmin(PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(this::toUserResponse);
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.getOrThrow(userId);
        if (user.isAdmin())
            throw new ApiException(HttpStatus.FORBIDDEN, "No se puede eliminar una cuenta de administrador");
        userRepository.delete(user);
    }

    // ── Reseñas ───────────────────────────────────────────────────────────────

    @Transactional
    public void deleteReview(Long reviewId) {
        Review review = reviewRepository.getOrThrow(reviewId);
        reviewRepository.delete(review);
    }

    // ── Listas ────────────────────────────────────────────────────────────────

    @Transactional
    public void deleteList(Long listId) {
        UserList list = listRepository.getOrThrow(listId);
        listRepository.delete(list);
    }

    // ── Notas ─────────────────────────────────────────────────────────────────

    @Transactional
    public void clearNotePublic(Long entryId) {
        if (!entryRepository.existsById(entryId))
            throw new ApiException(HttpStatus.NOT_FOUND, "Entrada no encontrada");
        entryRepository.clearNotePublic(entryId);
    }

    @Transactional
    public void clearNotePrivate(Long entryId) {
        if (!entryRepository.existsById(entryId))
            throw new ApiException(HttpStatus.NOT_FOUND, "Entrada no encontrada");
        entryRepository.clearNotePrivate(entryId);
    }

    // ── Por usuario ───────────────────────────────────────────────────────────

    public List<AdminReviewResponse> getUserReviews(Long userId) {
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toReviewResponse).toList();
    }

    public List<AdminListResponse> getUserLists(Long userId) {
        return listRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toListResponse).toList();
    }

    public List<AdminEntryResponse> getUserNotes(Long userId) {
        return entryRepository.findWithNotesByUserId(userId)
                .stream().map(this::toEntryResponse).toList();
    }

    // ── Estadísticas ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        long totalUsers   = userRepository.countNonAdmin();
        long totalReviews = reviewRepository.countByStatus("PUBLISHED");
        long totalLists   = listRepository.count();
        double avgScore   = entryRepository.globalAverageScore();

        List<AdminStatsResponse.StatusCount> statusDist = entryRepository.countByStatus().stream()
                .map(row -> new AdminStatsResponse.StatusCount((String) row[0], ((Number) row[1]).longValue()))
                .toList();

        List<AdminStatsResponse.ScoreCount> scoreHist = entryRepository.scoreHistogram().stream()
                .map(row -> new AdminStatsResponse.ScoreCount(((Number) row[0]).intValue(), ((Number) row[1]).longValue()))
                .toList();

        List<AdminStatsResponse.GameStat> topByEntries = entryRepository.topGamesByEntries().stream()
                .map(row -> new AdminStatsResponse.GameStat((String) row[0], (String) row[1], ((Number) row[2]).longValue()))
                .toList();

        List<AdminStatsResponse.GameStat> topByReviews = reviewRepository.topGamesByReviews().stream()
                .map(row -> new AdminStatsResponse.GameStat((String) row[0], (String) row[1], ((Number) row[2]).longValue()))
                .toList();

        List<AdminStatsResponse.GenreStat> genreDist = buildGenreDistribution();

        return AdminStatsResponse.builder()
                .totalUsers(totalUsers)
                .totalReviews(totalReviews)
                .totalLists(totalLists)
                .averageScore(Math.round(avgScore * 10.0) / 10.0)
                .statusDistribution(statusDist)
                .scoreHistogram(scoreHist)
                .topGamesByEntries(topByEntries)
                .topGamesByReviews(topByReviews)
                .genreDistribution(genreDist)
                .build();
    }

    // ── Géneros ───────────────────────────────────────────────────────────────

    private List<AdminStatsResponse.GenreStat> buildGenreDistribution() {
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : entryRepository.genresByGame()) {
            String genresJson = (String) row[0];
            long entryCount   = ((Number) row[1]).longValue();
            for (String genre : parseGenreArray(genresJson)) {
                counts.merge(genre, entryCount, Long::sum);
            }
        }
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(8)
                .map(e -> new AdminStatsResponse.GenreStat(e.getKey(), e.getValue()))
                .toList();
    }

    private List<String> parseGenreArray(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    // ── Feed global ───────────────────────────────────────────────────────────

    public List<AdminFeedItem> getGlobalFeed() {
        List<UserActivityEvent> events = activityRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 20));
        List<Long> userIds = events.stream().map(UserActivityEvent::getActorUserId).distinct().toList();
        Map<Long, User> userMap = userIds.isEmpty() ? Collections.emptyMap()
                : userRepository.findByIds(userIds).stream().collect(Collectors.toMap(User::getId, u -> u));
        return events.stream().map(e -> toFeedItem(e, userMap)).toList();
    }

    // ── Ranking de usuarios ───────────────────────────────────────────────────

    public List<AdminRankingUser> getUserRanking() {
        return userRepository.findUserRankingRaw().stream()
                .map(row -> {
                    long entries = ((Number) row[3]).longValue();
                    long reviews = ((Number) row[4]).longValue();
                    long lists   = ((Number) row[5]).longValue();
                    return AdminRankingUser.builder()
                            .id(((Number) row[0]).longValue())
                            .username((String) row[1])
                            .avatarUrl((String) row[2])
                            .entryCount(entries)
                            .reviewCount(reviews)
                            .listCount(lists)
                            .total(entries + reviews + lists)
                            .build();
                })
                .toList();
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private AdminUserResponse toUserResponse(User u) {
        return AdminUserResponse.builder()
                .id(u.getId())
                .username(u.getDisplayUsername())
                .email(u.getEmail())
                .avatarUrl(u.getAvatarUrl())
                .createdAt(u.getCreatedAt())
                .reviewCount(reviewRepository.countByUserId(u.getId()))
                .listCount(listRepository.countByUserId(u.getId()))
                .noteCount(entryRepository.countPublicNotesByUserId(u.getId()) + entryRepository.countPrivateNotesByUserId(u.getId()))
                .admin(u.isAdmin())
                .build();
    }

    private AdminReviewResponse toReviewResponse(Review r) {
        User user = userRepository.findById(r.getUserId()).orElse(null);
        Game game = gameRepository.findById(r.getGameId()).orElse(null);
        return AdminReviewResponse.builder()
                .id(r.getId())
                .userId(r.getUserId())
                .username(user != null ? user.getDisplayUsername() : "Eliminado")
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .gameId(r.getGameId())
                .gameName(game != null ? game.getName() : "Desconocido")
                .coverUrl(game != null ? game.getCoverUrl() : null)
                .title(r.getTitle())
                .body(r.getBody())
                .score(r.getScore())
                .containsSpoilers(r.isContainsSpoilers())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private AdminListResponse toListResponse(UserList l) {
        User user = userRepository.findById(l.getUserId()).orElse(null);
        long itemCount = listItemRepository.countByListId(l.getId());
        return AdminListResponse.builder()
                .id(l.getId())
                .userId(l.getUserId())
                .username(user != null ? user.getDisplayUsername() : "Eliminado")
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .name(l.getName())
                .description(l.getDescription())
                .isPublic(l.isPublic())
                .itemCount(itemCount)
                .createdAt(l.getCreatedAt())
                .build();
    }

    private AdminEntryResponse toEntryResponse(UserGameEntry e) {
        User user = userRepository.findById(e.getUserId()).orElse(null);
        Game game = gameRepository.findById(e.getGameId()).orElse(null);
        return AdminEntryResponse.builder()
                .id(e.getId())
                .userId(e.getUserId())
                .username(user != null ? user.getDisplayUsername() : "Eliminado")
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .gameId(e.getGameId())
                .gameName(game != null ? game.getName() : "Desconocido")
                .coverUrl(game != null ? game.getCoverUrl() : null)
                .status(e.getStatus())
                .score(e.getScore())
                .notePublic(e.getNotePublic())
                .notePrivate(e.getNotePrivate())
                .createdAt(e.getCreatedAt())
                .build();
    }

    private AdminFeedItem toFeedItem(UserActivityEvent e, Map<Long, User> userMap) {
        Map<String, String> p = parsePayload(e.getPayloadJson());
        User user = userMap.get(e.getActorUserId());
        String score = p.get("score");
        return AdminFeedItem.builder()
                .id(e.getId())
                .userId(e.getActorUserId())
                .username(user != null ? user.getDisplayUsername() : "Eliminado")
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .eventType(e.getEventType())
                .gameTitle(p.get("gameTitle"))
                .gameCoverUrl(p.get("gameCoverUrl"))
                .newStatus(p.get("newStatus"))
                .score(score != null && !score.isBlank() ? Double.parseDouble(score) : null)
                .listName(p.get("listName"))
                .targetUsername(p.get("targetUsername"))
                .createdAt(e.getCreatedAt())
                .build();
    }

    private Map<String, String> parsePayload(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }
}
