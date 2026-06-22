package com.tfg.gamelist.admin.controller;

import com.tfg.gamelist.admin.dto.*;
import com.tfg.gamelist.admin.service.AdminService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ── Estadísticas ─────────────────────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsResponse> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    // ── Usuarios ─────────────────────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<Page<AdminUserResponse>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.listUsers(page, size));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long userId) {
        adminService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    // ── Reseñas ───────────────────────────────────────────────────────────────

    @DeleteMapping("/reviews/{reviewId}")
    public ResponseEntity<Void> deleteReview(@PathVariable Long reviewId) {
        adminService.deleteReview(reviewId);
        return ResponseEntity.noContent().build();
    }

    // ── Listas ────────────────────────────────────────────────────────────────

    @DeleteMapping("/lists/{listId}")
    public ResponseEntity<Void> deleteList(@PathVariable Long listId) {
        adminService.deleteList(listId);
        return ResponseEntity.noContent().build();
    }

    // ── Notas ─────────────────────────────────────────────────────────────────

    @DeleteMapping("/entries/{entryId}/note-public")
    public ResponseEntity<Void> deleteNotePublic(@PathVariable Long entryId) {
        adminService.clearNotePublic(entryId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/entries/{entryId}/note-private")
    public ResponseEntity<Void> deleteNotePrivate(@PathVariable Long entryId) {
        adminService.clearNotePrivate(entryId);
        return ResponseEntity.noContent().build();
    }

    // ── Por usuario ───────────────────────────────────────────────────────────

    @GetMapping("/users/{userId}/reviews")
    public ResponseEntity<List<AdminReviewResponse>> getUserReviews(@PathVariable Long userId) {
        return ResponseEntity.ok(adminService.getUserReviews(userId));
    }

    @GetMapping("/users/{userId}/lists")
    public ResponseEntity<List<AdminListResponse>> getUserLists(@PathVariable Long userId) {
        return ResponseEntity.ok(adminService.getUserLists(userId));
    }

    @GetMapping("/users/{userId}/notes")
    public ResponseEntity<List<AdminEntryResponse>> getUserNotes(@PathVariable Long userId) {
        return ResponseEntity.ok(adminService.getUserNotes(userId));
    }

    // ── Feed y ranking ────────────────────────────────────────────────────────

    @GetMapping("/feed")
    public ResponseEntity<List<AdminFeedItem>> getFeed() {
        return ResponseEntity.ok(adminService.getGlobalFeed());
    }

    @GetMapping("/ranking")
    public ResponseEntity<List<AdminRankingUser>> getRanking() {
        return ResponseEntity.ok(adminService.getUserRanking());
    }
}
