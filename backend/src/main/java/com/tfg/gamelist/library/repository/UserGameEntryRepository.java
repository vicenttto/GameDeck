package com.tfg.gamelist.library.repository;

import com.tfg.gamelist.common.exception.ApiException;
import com.tfg.gamelist.library.entity.UserGameEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface UserGameEntryRepository extends JpaRepository<UserGameEntry, Long> {

    @SuppressWarnings("null")
    default UserGameEntry getOrThrow(Long id) {
        return findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Entrada no encontrada"));
    }

    Optional<UserGameEntry> findByUserIdAndGameId(Long userId, Long gameId);

    Page<UserGameEntry> findByUserId(Long userId, Pageable pageable);

    Page<UserGameEntry> findByUserIdAndStatus(Long userId, String status, Pageable pageable);

    List<UserGameEntry> findByUserIdAndIsFavoriteTrue(Long userId);

    long countByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, String status);

    @Query(value = """
        SELECT g.rawg_game_id
        FROM user_game_entries e
        JOIN games g ON g.id = e.game_id
        WHERE e.user_id = :userId
    """, nativeQuery = true)
    List<Long> findRawgGameIdsByUserId(@Param("userId") Long userId);

    @Query("""
        SELECT AVG(e.score)
        FROM UserGameEntry e
        WHERE e.userId = :userId AND e.score IS NOT NULL
    """)
    BigDecimal averageScoreByUserId(@Param("userId") Long userId);

    @Query("""
        SELECT COALESCE(SUM(e.progressHours), 0)
        FROM UserGameEntry e
        WHERE e.userId = :userId
    """)
    BigDecimal sumProgressHoursByUserId(@Param("userId") Long userId);

    @Query("SELECT e FROM UserGameEntry e WHERE e.userId = :userId AND (e.notePublic IS NOT NULL OR e.notePrivate IS NOT NULL) ORDER BY e.updatedAt DESC")
    List<UserGameEntry> findWithNotesByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(e) FROM UserGameEntry e WHERE e.userId = :userId AND e.notePublic IS NOT NULL")
    long countPublicNotesByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(e) FROM UserGameEntry e WHERE e.userId = :userId AND e.notePrivate IS NOT NULL")
    long countPrivateNotesByUserId(@Param("userId") Long userId);

    @Query(value = "SELECT status, COUNT(*) FROM user_game_entries GROUP BY status", nativeQuery = true)
    List<Object[]> countByStatus();

    @Query(value = "SELECT ROUND(score) AS score, COUNT(*) FROM user_game_entries WHERE score IS NOT NULL GROUP BY ROUND(score) ORDER BY score", nativeQuery = true)
    List<Object[]> scoreHistogram();

    @Query(value = """
        SELECT g.name, g.cover_url, COUNT(e.id) AS cnt
        FROM user_game_entries e
        JOIN games g ON e.game_id = g.id
        GROUP BY g.id, g.name, g.cover_url
        ORDER BY cnt DESC
        LIMIT 10
    """, nativeQuery = true)
    List<Object[]> topGamesByEntries();

    @Query("SELECT COALESCE(AVG(e.score), 0) FROM UserGameEntry e WHERE e.score IS NOT NULL")
    double globalAverageScore();

    @Query(value = """
        SELECT g.genres_json, COUNT(e.id) AS cnt
        FROM user_game_entries e
        JOIN games g ON e.game_id = g.id
        WHERE g.genres_json IS NOT NULL AND g.genres_json != 'null' AND g.genres_json != '[]'
        GROUP BY g.id, g.genres_json
    """, nativeQuery = true)
    List<Object[]> genresByGame();

    @Modifying
    @Query("UPDATE UserGameEntry e SET e.notePublic = null WHERE e.id = :entryId")
    void clearNotePublic(@Param("entryId") Long entryId);

    @Modifying
    @Query("UPDATE UserGameEntry e SET e.notePrivate = null WHERE e.id = :entryId")
    void clearNotePrivate(@Param("entryId") Long entryId);
}
