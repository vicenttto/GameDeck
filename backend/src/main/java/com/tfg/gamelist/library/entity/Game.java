package com.tfg.gamelist.library.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Snapshot local del juego en BD. Se rellena la primera vez que un usuario
 * añade un juego de RAWG a su biblioteca. La fila se identifica externamente
 * por {@code rawgGameId}; el {@code id} es el PK interno usado por
 * {@link UserGameEntry}.
 */
@Entity
@Table(name = "games")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rawg_game_id", nullable = false, unique = true)
    private Long rawgGameId;

    @Column(nullable = false, length = 255)
    private String slug;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "description_short", length = 1000)
    private String descriptionShort;

    @Column(name = "released_at")
    private LocalDate releasedAt;

    @Column(name = "cover_url", length = 500)
    private String coverUrl;

    @Column(name = "background_url", length = 500)
    private String backgroundUrl;

    private Integer metacritic;

    @Column(name = "rawg_rating", precision = 3, scale = 2)
    private BigDecimal rawgRating;

    @Column(name = "ratings_count")
    private Integer ratingsCount;

    /** JSON con array de strings (nombres de plataformas). */
    @Column(name = "platforms_json", columnDefinition = "json")
    private String platformsJson;

    /** JSON con array de strings (nombres de géneros). */
    @Column(name = "genres_json", columnDefinition = "json")
    private String genresJson;

    @Column(name = "developers_json", columnDefinition = "json")
    private String developersJson;

    @Column(name = "publishers_json", columnDefinition = "json")
    private String publishersJson;

    @Column(name = "last_rawg_sync_at")
    private LocalDateTime lastRawgSyncAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
