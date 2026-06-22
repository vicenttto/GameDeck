package com.tfg.gamelist.user.controller;

import com.tfg.gamelist.user.dto.UpdateProfileRequest;
import com.tfg.gamelist.user.dto.UserProfileResponse;
import com.tfg.gamelist.user.entity.User;
import com.tfg.gamelist.user.service.UserService;
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

@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMe(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.getMe(user));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateMe(
            @AuthenticationPrincipal User user,
            @RequestBody @Validated UpdateProfileRequest req) {
        return ResponseEntity.ok(userService.updateMe(user, req));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<UserProfileResponse>> searchUsers(
            @RequestParam @NotBlank @Size(max = 100) String query,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(userService.searchUsers(query, page, size));
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserProfileResponse> getUserByUsername(
            @PathVariable @NotBlank @Size(max = 40) String username,
            Authentication authentication) {
        User viewer = authentication != null ? (User) authentication.getPrincipal() : null;
        return ResponseEntity.ok(userService.getUserByUsername(username, viewer));
    }

    @PostMapping("/{username}/follow")
    public ResponseEntity<UserProfileResponse> follow(
            @PathVariable @NotBlank @Size(max = 40) String username,
            @AuthenticationPrincipal User principal) {
        return ResponseEntity.ok(userService.followUser(principal, username));
    }

    @DeleteMapping("/{username}/follow")
    public ResponseEntity<UserProfileResponse> unfollow(
            @PathVariable @NotBlank @Size(max = 40) String username,
            @AuthenticationPrincipal User principal) {
        return ResponseEntity.ok(userService.unfollowUser(principal, username));
    }

    @GetMapping("/{username}/followers")
    public ResponseEntity<Page<UserProfileResponse>> getFollowers(
            @PathVariable @NotBlank @Size(max = 40) String username,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            Authentication authentication) {
        User viewer = authentication != null ? (User) authentication.getPrincipal() : null;
        return ResponseEntity.ok(userService.getFollowers(username, viewer, page, size));
    }

    @GetMapping("/{username}/following")
    public ResponseEntity<Page<UserProfileResponse>> getFollowing(
            @PathVariable @NotBlank @Size(max = 40) String username,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            Authentication authentication) {
        User viewer = authentication != null ? (User) authentication.getPrincipal() : null;
        return ResponseEntity.ok(userService.getFollowing(username, viewer, page, size));
    }
}
