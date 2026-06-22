package com.tfg.gamelist.review.controller;

import com.tfg.gamelist.review.dto.ReviewRequest;
import com.tfg.gamelist.review.dto.ReviewResponse;
import com.tfg.gamelist.review.dto.UserReviewResponse;
import com.tfg.gamelist.review.service.ReviewService;
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
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping("/api/me/games/{rawgGameId}/review")
    public ResponseEntity<ReviewResponse> upsertReview(
            @AuthenticationPrincipal User user,
            @PathVariable @Min(1) long rawgGameId,
            @RequestBody @Valid ReviewRequest req) {
        return ResponseEntity.ok(reviewService.upsert(user, rawgGameId, req));
    }

    @DeleteMapping("/api/me/games/{rawgGameId}/review")
    public ResponseEntity<Void> deleteReview(
            @AuthenticationPrincipal User user,
            @PathVariable @Min(1) long rawgGameId) {
        reviewService.delete(user, rawgGameId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/games/{rawgGameId}/reviews")
    public ResponseEntity<Page<ReviewResponse>> listReviews(
            @PathVariable @Min(1) long rawgGameId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            Authentication authentication) {
        Long viewerUserId = resolveViewerId(authentication);
        return ResponseEntity.ok(reviewService.listByRawgGameId(rawgGameId, page, size, viewerUserId));
    }

    @GetMapping("/api/users/{username}/reviews")
    public ResponseEntity<List<UserReviewResponse>> listUserReviews(
            @PathVariable @NotBlank @Size(max = 40) String username) {
        return ResponseEntity.ok(reviewService.listByUsername(username));
    }

    private static Long resolveViewerId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User u)) return null;
        return u.getId();
    }
}
