package com.tfg.gamelist.activity.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tfg.gamelist.activity.dto.ActivityEventResponse;
import com.tfg.gamelist.activity.entity.UserActivityEvent;
import com.tfg.gamelist.activity.repository.UserActivityEventRepository;
import com.tfg.gamelist.user.entity.User;
import com.tfg.gamelist.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class ActivityService {

    private final UserActivityEventRepository repo;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ActivityService(UserActivityEventRepository repo,
                           UserRepository userRepository,
                           ObjectMapper objectMapper) {
        this.repo           = repo;
        this.userRepository = userRepository;
        this.objectMapper   = objectMapper;
    }

    // ── Registro de eventos ──────────────────────────────────────────────────

    public void recordStatusChanged(Long userId, Long gameId, String gameTitle, String coverUrl, String newStatus) {
        save(userId, "ENTRY_STATUS_CHANGED", gameId, null,
                Map.of("gameTitle", nvl(gameTitle), "gameCoverUrl", nvl(coverUrl), "newStatus", nvl(newStatus)));
    }

    public void recordReviewPublished(Long userId, Long reviewId, Long gameId, String gameTitle, String coverUrl, Double score) {
        var payload = score != null
                ? Map.of("gameTitle", nvl(gameTitle), "gameCoverUrl", nvl(coverUrl), "score", score.toString())
                : Map.of("gameTitle", nvl(gameTitle), "gameCoverUrl", nvl(coverUrl));
        save(userId, "REVIEW_PUBLISHED", gameId, reviewId, payload);
    }

    public void recordListCreated(Long userId, String listName) {
        save(userId, "LIST_CREATED", null, null,
                Map.of("listName", nvl(listName)));
    }

    public void recordFollowedUser(Long userId, String targetUsername, String targetAvatarUrl) {
        save(userId, "FOLLOWED_USER", null, null,
                Map.of("targetUsername", nvl(targetUsername), "targetAvatarUrl", nvl(targetAvatarUrl)));
    }

    public void recordScoreUpdated(Long userId, Long gameId, String gameTitle, String coverUrl, double score) {
        save(userId, "SCORE_UPDATED", gameId, null,
                Map.of("gameTitle", nvl(gameTitle), "gameCoverUrl", nvl(coverUrl), "score", String.valueOf(score)));
    }

    public void recordFavorited(Long userId, Long gameId, String gameTitle, String coverUrl) {
        save(userId, "GAME_FAVORITED", gameId, null,
                Map.of("gameTitle", nvl(gameTitle), "gameCoverUrl", nvl(coverUrl)));
    }

    // ── Consultas ────────────────────────────────────────────────────────────

    public List<ActivityEventResponse> getActivity(String username, int page, int size) {
        User user = userRepository.getByUsernameOrThrow(username);

        return repo.findByActorUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(page, size))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteEvents(User user, List<Long> ids) {
        repo.deleteByActorUserIdAndIdIn(user.getId(), ids);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void save(Long userId, String type, Long gameId, Long reviewId, Map<String, String> payload) {
        try {
            UserActivityEvent event = UserActivityEvent.builder()
                    .actorUserId(userId)
                    .eventType(type)
                    .gameId(gameId)
                    .reviewId(reviewId)
                    .payloadJson(objectMapper.writeValueAsString(payload))
                    .build();
            repo.save(event);
        } catch (JsonProcessingException ignored) {
        }
    }

    private ActivityEventResponse toResponse(UserActivityEvent e) {
        Map<String, String> p = parsePayload(e.getPayloadJson());
        return new ActivityEventResponse(
                e.getId(),
                e.getEventType(),
                p.get("gameTitle"),
                p.get("gameCoverUrl"),
                p.get("newStatus"),
                p.containsKey("score") ? Double.parseDouble(p.get("score")) : null,
                p.get("listName"),
                p.get("targetUsername"),
                p.get("targetAvatarUrl"),
                e.getCreatedAt()
        );
    }

    private Map<String, String> parsePayload(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyMap();
        }
    }

    private static String nvl(String s) {
        return s != null ? s : "";
    }
}
