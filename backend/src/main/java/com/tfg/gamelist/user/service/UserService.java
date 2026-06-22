package com.tfg.gamelist.user.service;

import com.tfg.gamelist.activity.service.ActivityService;
import com.tfg.gamelist.common.exception.ApiException;
import com.tfg.gamelist.user.dto.UpdateProfileRequest;
import com.tfg.gamelist.user.dto.UserProfileResponse;
import com.tfg.gamelist.user.entity.User;
import com.tfg.gamelist.user.entity.UserFollow;
import com.tfg.gamelist.user.repository.UserFollowRepository;
import com.tfg.gamelist.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserFollowRepository userFollowRepository;
    private final ActivityService activityService;

    public UserService(UserRepository userRepository,
                       UserFollowRepository userFollowRepository,
                       ActivityService activityService) {
        this.userRepository       = userRepository;
        this.userFollowRepository = userFollowRepository;
        this.activityService      = activityService;
    }

    public UserProfileResponse getMe(User principal) {
        return toResponse(principal, principal);
    }

    public UserProfileResponse updateMe(User principal, UpdateProfileRequest req) {
        if (req.getUsername() != null) {
            if (userRepository.existsByUsername(req.getUsername())
                    && !req.getUsername().equals(principal.getDisplayUsername())) {
                throw new ApiException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
            }
            principal.setUsername(req.getUsername());
        }

        if (req.getBio() != null) {
            principal.setBio(req.getBio());
        }

        if (req.getCountryCode() != null) {
            principal.setCountryCode(req.getCountryCode());
        }

        if (req.getAvatarUrl() != null) {
            principal.setAvatarUrl(req.getAvatarUrl());
        }

        User saved = userRepository.save(principal);
        return toResponse(saved, saved);
    }

    public UserProfileResponse getUserByUsername(String username, User viewer) {
        User user = userRepository.getByUsernameOrThrow(username);
        return toResponse(user, viewer);
    }

    @SuppressWarnings("null")
    public UserProfileResponse followUser(User follower, String username) {
        User target = userRepository.getByUsernameOrThrow(username);

        if (follower.getId().equals(target.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No puedes seguirte a ti mismo");
        }

        if (!userFollowRepository.existsByFollowerIdAndFollowedId(follower.getId(), target.getId())) {
            userFollowRepository.save(
                    UserFollow.builder()
                            .followerId(follower.getId())
                            .followedId(target.getId())
                            .build()
            );
            activityService.recordFollowedUser(follower.getId(), target.getDisplayUsername(), target.getAvatarUrl());
        }

        return toResponse(target, follower);
    }

    public UserProfileResponse unfollowUser(User follower, String username) {
        User target = userRepository.getByUsernameOrThrow(username);

        if (userFollowRepository.existsByFollowerIdAndFollowedId(follower.getId(), target.getId())) {
            userFollowRepository.deleteByFollowerIdAndFollowedId(follower.getId(), target.getId());
        }

        return toResponse(target, follower);
    }

    public Page<UserProfileResponse> searchUsers(String query, int page, int size) {
        return userRepository
                .searchNonAdminByUsername(query, PageRequest.of(page, size))
                .map(user -> toResponse(user, null));
    }

    public Page<UserProfileResponse> getFollowers(String username, User viewer, int page, int size) {
        User user = userRepository.getByUsernameOrThrow(username);
        return userRepository
                .findFollowersOf(user.getId(), PageRequest.of(page, size))
                .map(u -> toResponse(u, viewer));
    }

    public Page<UserProfileResponse> getFollowing(String username, User viewer, int page, int size) {
        User user = userRepository.getByUsernameOrThrow(username);
        return userRepository
                .findFollowingOf(user.getId(), PageRequest.of(page, size))
                .map(u -> toResponse(u, viewer));
    }

    // viewer == null  → anonymous (isFollowing = null)
    // viewer == user  → own profile (isFollowing = null)
    // viewer != user  → another user (isFollowing computed)
    UserProfileResponse toResponse(User user, User viewer) {
        long followersCount = userFollowRepository.countByFollowedId(user.getId());
        long followingCount = userFollowRepository.countByFollowerId(user.getId());

        Boolean isFollowing = null;
        if (viewer != null && !viewer.getId().equals(user.getId())) {
            isFollowing = userFollowRepository.existsByFollowerIdAndFollowedId(viewer.getId(), user.getId());
        }

        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getDisplayUsername())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .countryCode(user.getCountryCode())
                .createdAt(user.getCreatedAt())
                .followersCount(followersCount)
                .followingCount(followingCount)
                .isFollowing(isFollowing)
                .build();
    }
}
