package com.tfg.gamelist.review.repository;

import com.tfg.gamelist.common.exception.ApiException;
import com.tfg.gamelist.review.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @SuppressWarnings("null")
    default Review getOrThrow(Long id) {
        return findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Reseña no encontrada"));
    }

    Optional<Review> findByUserIdAndGameId(Long userId, Long gameId);

    Page<Review> findByGameIdAndStatus(Long gameId, String status, Pageable pageable);

    List<Review> findByUserIdAndStatusOrderByPublishedAtDesc(Long userId, String status);

    List<Review> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserId(Long userId);

    long countByStatus(String status);

    @Query(value = """
        SELECT g.name, g.cover_url, COUNT(r.id) AS cnt
        FROM reviews r
        JOIN games g ON r.game_id = g.id
        WHERE r.status = 'PUBLISHED'
        GROUP BY g.id, g.name, g.cover_url
        ORDER BY cnt DESC
        LIMIT 10
    """, nativeQuery = true)
    List<Object[]> topGamesByReviews();
}
