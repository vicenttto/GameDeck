package com.tfg.gamelist.list.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tfg.gamelist.activity.service.ActivityService;
import com.tfg.gamelist.common.exception.ApiException;
import com.tfg.gamelist.game.client.RawgClient;
import com.tfg.gamelist.library.entity.Game;
import com.tfg.gamelist.library.repository.GameRepository;
import com.tfg.gamelist.list.dto.*;
import com.tfg.gamelist.list.entity.UserList;
import com.tfg.gamelist.list.entity.UserListItem;
import com.tfg.gamelist.list.repository.UserListItemRepository;
import com.tfg.gamelist.list.repository.UserListRepository;
import com.tfg.gamelist.user.entity.User;
import com.tfg.gamelist.user.repository.UserRepository;
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

@Service
public class ListService {

    private final UserListRepository listRepository;
    private final UserListItemRepository itemRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final RawgClient rawgClient;
    private final ObjectMapper objectMapper;
    private final ActivityService activityService;

    public ListService(UserListRepository listRepository,
                       UserListItemRepository itemRepository,
                       GameRepository gameRepository,
                       UserRepository userRepository,
                       RawgClient rawgClient,
                       ObjectMapper objectMapper,
                       ActivityService activityService) {
        this.listRepository  = listRepository;
        this.itemRepository  = itemRepository;
        this.gameRepository  = gameRepository;
        this.userRepository  = userRepository;
        this.rawgClient      = rawgClient;
        this.objectMapper    = objectMapper;
        this.activityService = activityService;
    }

    // ── Consultas ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ListResponse> listsByUsername(String username, Long viewerUserId) {
        User owner = userRepository.getByUsernameOrThrow(username);

        boolean isOwner = viewerUserId != null && viewerUserId.equals(owner.getId());

        List<UserList> lists = isOwner
                ? listRepository.findByUserIdOrderByCreatedAtDesc(owner.getId())
                : listRepository.findByUserIdAndIsPublicTrueOrderByCreatedAtDesc(owner.getId());

        return lists.stream().map(this::toResponse).toList();
    }

    // ── Comandos ─────────────────────────────────────────────────────────────

    @Transactional
    public ListResponse createList(User user, CreateListRequest req) {
        if (listRepository.existsByUserIdAndName(user.getId(), req.name().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya tienes una lista con ese nombre");
        }
        UserList list = UserList.builder()
                .userId(user.getId())
                .name(req.name().trim())
                .description(req.description() != null ? req.description().trim() : null)
                .isPublic(req.isPublic())
                .build();
        ListResponse response = toResponse(listRepository.save(list));
        activityService.recordListCreated(user.getId(), list.getName());
        return response;
    }

    @Transactional
    public ListResponse updateList(User user, Long listId, UpdateListRequest req) {
        UserList list = ownedList(user.getId(), listId);

        if (req.name() != null && !req.name().isBlank()) {
            String newName = req.name().trim();
            if (!newName.equals(list.getName()) && listRepository.existsByUserIdAndName(user.getId(), newName)) {
                throw new ApiException(HttpStatus.CONFLICT, "Ya tienes una lista con ese nombre");
            }
            list.setName(newName);
        }
        if (req.description() != null) {
            list.setDescription(req.description().isBlank() ? null : req.description().trim());
        }
        if (req.isPublic() != null) {
            list.setPublic(req.isPublic());
        }
        return toResponse(listRepository.save(list));
    }

    @Transactional
    public void deleteList(User user, Long listId) {
        UserList list = ownedList(user.getId(), listId);
        listRepository.delete(list);
    }

    @Transactional
    public ListResponse addItem(User user, Long listId, AddListItemRequest req) {
        UserList list = ownedList(user.getId(), listId);

        Game game = gameRepository.findByRawgGameId(req.rawgGameId())
                .orElseGet(() -> fetchAndSaveGame(req.rawgGameId()));

        if (itemRepository.existsByListIdAndGameId(listId, game.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Este juego ya está en la lista");
        }

        int nextPosition = itemRepository.findMaxPositionByListId(listId) + 1;

        UserListItem item = UserListItem.builder()
                .listId(listId)
                .gameId(game.getId())
                .addedByUserId(user.getId())
                .note(req.note() != null && !req.note().isBlank() ? req.note().trim() : null)
                .position(nextPosition)
                .build();

        itemRepository.save(item);
        return toResponse(list);
    }

    @Transactional
    public void removeItem(User user, Long listId, Long rawgGameId) {
        ownedList(user.getId(), listId);

        Game game = gameRepository.findByRawgGameId(rawgGameId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Juego no encontrado"));

        UserListItem item = itemRepository.findByListIdAndGameId(listId, game.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "El juego no está en esta lista"));

        itemRepository.delete(item);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private UserList ownedList(Long userId, Long listId) {
        return listRepository.findByIdAndUserId(listId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Lista no encontrada"));
    }

    private ListResponse toResponse(UserList list) {
        List<UserListItem> items = itemRepository.findByListIdOrderByPositionAscCreatedAtAsc(list.getId());

        List<ListItemResponse> itemResponses = items.stream().map(item -> {
            Game game = gameRepository.findById(item.getGameId()).orElse(null);
            if (game == null) return null;
            return new ListItemResponse(
                    item.getId(),
                    game.getRawgGameId(),
                    game.getName(),
                    game.getCoverUrl(),
                    game.getReleasedAt() != null ? game.getReleasedAt().getYear() + "" : null,
                    parseJsonList(game.getGenresJson()),
                    item.getNote(),
                    item.getPosition()
            );
        }).filter(Objects::nonNull).toList();

        List<String> covers = itemResponses.stream()
                .map(ListItemResponse::coverUrl)
                .filter(Objects::nonNull)
                .limit(2)
                .toList();

        return new ListResponse(
                list.getId(),
                list.getName(),
                list.getDescription(),
                list.isPublic(),
                itemResponses.size(),
                covers,
                itemResponses
        );
    }

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

    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDate.parse(raw);
        } catch (Exception e) {
            return null;
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
