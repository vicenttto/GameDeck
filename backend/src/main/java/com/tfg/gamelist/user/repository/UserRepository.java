package com.tfg.gamelist.user.repository;

import com.tfg.gamelist.common.exception.ApiException;
import com.tfg.gamelist.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    @SuppressWarnings("null")
    default User getOrThrow(Long id) {
        return findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    default User getByUsernameOrThrow(String username) {
        return findByUsername(username).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    @Query("""
        SELECT u FROM User u
        WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%'))
          AND NOT EXISTS (
              SELECT r FROM u.roles r WHERE r.name = 'ROLE_ADMIN'
          )
    """)
    Page<User> searchNonAdminByUsername(@Param("query") String query, Pageable pageable);

    @Query("""
        SELECT u FROM User u
        WHERE NOT EXISTS (
            SELECT r FROM u.roles r WHERE r.name = 'ROLE_ADMIN'
        )
    """)
    Page<User> findAllNonAdmin(Pageable pageable);

    @Query("""
        SELECT COUNT(u) FROM User u
        WHERE NOT EXISTS (
            SELECT r FROM u.roles r WHERE r.name = 'ROLE_ADMIN'
        )
    """)
    long countNonAdmin();

    @Query("SELECT u FROM User u WHERE u.id IN :ids")
    List<User> findByIds(@Param("ids") List<Long> ids);

    @Query(value = """
        SELECT u.id, u.username, u.avatar_url,
               COALESCE(COUNT(DISTINCT e.id), 0)                 AS entry_count,
               COALESCE(COUNT(DISTINCT r.id), 0)                 AS review_count,
               COALESCE(COUNT(DISTINCT l.id), 0)                 AS list_count
        FROM users u
        LEFT JOIN user_game_entries e ON u.id = e.user_id
        LEFT JOIN reviews           r ON u.id = r.user_id
        LEFT JOIN user_lists        l ON u.id = l.user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles ro ON ur.role_id = ro.id
            WHERE ur.user_id = u.id AND ro.name = 'ROLE_ADMIN'
        )
        GROUP BY u.id, u.username, u.avatar_url
        HAVING (COUNT(DISTINCT e.id) + COUNT(DISTINCT r.id) + COUNT(DISTINCT l.id)) > 0
        ORDER BY (COUNT(DISTINCT e.id) + COUNT(DISTINCT r.id) + COUNT(DISTINCT l.id)) DESC
        LIMIT 8
    """, nativeQuery = true)
    List<Object[]> findUserRankingRaw();

    @Query("""
        SELECT u FROM User u
        WHERE u.id IN (
            SELECT uf.followerId FROM UserFollow uf WHERE uf.followedId = :userId
        )
    """)
    Page<User> findFollowersOf(@Param("userId") Long userId, Pageable pageable);

    @Query("""
        SELECT u FROM User u
        WHERE u.id IN (
            SELECT uf.followedId FROM UserFollow uf WHERE uf.followerId = :userId
        )
    """)
    Page<User> findFollowingOf(@Param("userId") Long userId, Pageable pageable);
}
