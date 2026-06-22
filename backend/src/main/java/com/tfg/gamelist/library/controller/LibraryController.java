package com.tfg.gamelist.library.controller;

import com.tfg.gamelist.library.dto.AddGameRequest;
import com.tfg.gamelist.library.dto.GameEntryResponse;
import com.tfg.gamelist.library.dto.LibraryStatsResponse;
import com.tfg.gamelist.library.dto.UpdateGameEntryRequest;
import com.tfg.gamelist.library.service.LibraryService;
import com.tfg.gamelist.user.entity.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Validated
public class LibraryController {

    private final LibraryService libraryService;

    public LibraryController(LibraryService libraryService) {
        this.libraryService = libraryService;
    }

    // ── Comandos sobre la biblioteca propia ─────────────────────────────────

    @PostMapping("/api/me/games")
    public ResponseEntity<GameEntryResponse> addGame(
            @AuthenticationPrincipal User user,
            @RequestBody @Valid AddGameRequest req) {
        return ResponseEntity.ok(libraryService.addGame(user, req));
    }

    @PutMapping("/api/me/games/{entryId}")
    public ResponseEntity<GameEntryResponse> updateEntry(
            @AuthenticationPrincipal User user,
            @PathVariable @Min(1) Long entryId,
            @RequestBody @Valid UpdateGameEntryRequest req) {
        return ResponseEntity.ok(libraryService.updateEntry(user, entryId, req));
    }

    @GetMapping("/api/me/games/by-rawg/{rawgGameId}")
    public ResponseEntity<GameEntryResponse> getMyEntryByRawgId(
            @AuthenticationPrincipal User user,
            @PathVariable @Min(1) Long rawgGameId) {
        return libraryService.findEntryByRawgGameId(user, rawgGameId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/api/me/games/rawg-ids")
    public ResponseEntity<List<Long>> getMyRawgIds(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(libraryService.getRawgGameIds(user));
    }

    @DeleteMapping("/api/me/games/{entryId}")
    public ResponseEntity<Void> deleteEntry(
            @AuthenticationPrincipal User user,
            @PathVariable @Min(1) Long entryId) {
        libraryService.deleteEntry(user, entryId);
        return ResponseEntity.noContent().build();
    }

    // ── Consultas sobre la biblioteca de cualquier usuario ──────────────────

    @GetMapping("/api/users/{username}/games")
    public ResponseEntity<Page<GameEntryResponse>> listGames(
            @PathVariable @NotBlank @Size(max = 40) String username,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            Authentication authentication) {
        Long viewerId = resolveViewerId(authentication);
        return ResponseEntity.ok(libraryService.listByUsername(username, status, page, size, viewerId));
    }

    @GetMapping("/api/users/{username}/games/favorites")
    public ResponseEntity<List<GameEntryResponse>> listFavorites(
            @PathVariable @NotBlank @Size(max = 40) String username,
            Authentication authentication) {
        Long viewerId = resolveViewerId(authentication);
        return ResponseEntity.ok(libraryService.listFavorites(username, viewerId));
    }

    private static Long resolveViewerId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) return null;
        if (authentication.getPrincipal() instanceof User u) return u.getId();
        return null;
    }

    @GetMapping("/api/users/{username}/games/stats")
    public ResponseEntity<LibraryStatsResponse> getStats(
            @PathVariable @NotBlank @Size(max = 40) String username) {
        return ResponseEntity.ok(libraryService.getStats(username));
    }
}
