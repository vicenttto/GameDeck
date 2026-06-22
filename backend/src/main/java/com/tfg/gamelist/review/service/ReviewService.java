package com.tfg.gamelist.review.service;

import com.tfg.gamelist.activity.service.ActivityService;
import com.tfg.gamelist.common.exception.ApiException;
import com.tfg.gamelist.library.entity.Game;
import com.tfg.gamelist.library.repository.GameRepository;
import com.tfg.gamelist.review.dto.ReviewRequest;
import com.tfg.gamelist.review.dto.ReviewResponse;
import com.tfg.gamelist.review.dto.UserReviewResponse;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final ActivityService activityService;

    public ReviewService(ReviewRepository reviewRepository,
                         GameRepository gameRepository,
                         UserRepository userRepository,
                         ActivityService activityService) {
        this.reviewRepository = reviewRepository;
        this.gameRepository   = gameRepository;
        this.userRepository   = userRepository;
        this.activityService  = activityService;
    }

    @Transactional
    public ReviewResponse upsert(User user, long rawgGameId, ReviewRequest req) {
        Game game = gameRepository.findByRawgGameId(rawgGameId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                "Tienes que añadir el juego a tu biblioteca antes de reseñarlo"));

        Review review = reviewRepository.findByUserIdAndGameId(user.getId(), game.getId())
            .orElseGet(() -> Review.builder()
                .userId(user.getId())
                .gameId(game.getId())
                .build());

        review.setTitle(req.title());
        review.setBody(req.body());
        review.setScore(req.score());
        review.setContainsSpoilers(req.containsSpoilers());
        boolean isNew = review.getPublishedAt() == null;
        review.setStatus("PUBLISHED");
        if (isNew) review.setPublishedAt(LocalDateTime.now());

        Review saved = reviewRepository.save(review);
        if (isNew) {
            Double score = saved.getScore() != null ? saved.getScore().doubleValue() : null;
            activityService.recordReviewPublished(user.getId(), saved.getId(), game.getId(), game.getName(), game.getCoverUrl(), score);
        }
        return toResponse(saved, user.getDisplayUsername(), user.getAvatarUrl(), true);
    }

    @Transactional
    public void delete(User user, long rawgGameId) {
        Game game = gameRepository.findByRawgGameId(rawgGameId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Juego no encontrado"));

        Review review = reviewRepository.findByUserIdAndGameId(user.getId(), game.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No tienes ninguna reseña para este juego"));

        reviewRepository.deleteById(review.getId());
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> listByRawgGameId(long rawgGameId, int page, int size, Long viewerUserId) {
        return gameRepository.findByRawgGameId(rawgGameId)
            .map(game -> {
                PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "publishedAt"));
                return reviewRepository.findByGameIdAndStatus(game.getId(), "PUBLISHED", pageable)
                    .map(r -> {
                        User author = userRepository.findById(r.getUserId()).orElse(null);
                        String username = author != null ? author.getDisplayUsername() : "Usuario eliminado";
                        String avatarUrl = author != null ? author.getAvatarUrl() : null;
                        boolean own = viewerUserId != null && viewerUserId.equals(Long.valueOf(r.getUserId()));
                        return toResponse(r, username, avatarUrl, own);
                    });
            })
            .orElse(Page.empty());
    }

    @Transactional(readOnly = true)
    public List<UserReviewResponse> listByUsername(String username) {
        User author = userRepository.getByUsernameOrThrow(username);
        List<Review> reviews = reviewRepository.findByUserIdAndStatusOrderByPublishedAtDesc(author.getId(), "PUBLISHED");

        List<Long> gameIds = reviews.stream().map(Review::getGameId).distinct().toList();
        Map<Long, Game> gamesById = gameRepository.findAllById(gameIds).stream()
            .collect(Collectors.toMap(Game::getId, g -> g));

        return reviews.stream().map(r -> {
            Game game       = gamesById.get(r.getGameId());
            Long rawgId     = game != null ? game.getRawgGameId() : null;
            String gameName = game != null ? game.getName()       : "Juego eliminado";
            String coverUrl = game != null ? game.getCoverUrl()   : null;
            return new UserReviewResponse(
                r.getId(), rawgId, gameName, coverUrl,
                r.getTitle(), r.getBody(), r.getScore(),
                r.isContainsSpoilers(), r.getPublishedAt()
            );
        }).toList();
    }

    private ReviewResponse toResponse(Review r, String username, String avatarUrl, boolean own) {
        return new ReviewResponse(
            r.getId(), username, avatarUrl,
            r.getTitle(), r.getBody(), r.getScore(),
            r.isContainsSpoilers(), r.getPublishedAt(), own
        );
    }
}
