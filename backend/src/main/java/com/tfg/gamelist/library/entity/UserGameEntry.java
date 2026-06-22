package com.tfg.gamelist.library.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entrada de un juego en la biblioteca de un usuario.
 * Único por (user_id, game_id). El estado es uno de
 * PLAN_TO_PLAY, PLAYING, COMPLETED, ON_HOLD, DROPPED.
 */
@Entity
@Table(name = "user_game_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserGameEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(precision = 3, scale = 1)
    private BigDecimal score;

    @Column(name = "progress_hours", precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal progressHours = BigDecimal.ZERO;

    @Column(name = "platform_note", length = 100)
    private String platformNote;

    @Column(name = "started_at")
    private LocalDate startedAt;

    @Column(name = "finished_at")
    private LocalDate finishedAt;

    @Column(name = "is_favorite", nullable = false)
    @Builder.Default
    private boolean isFavorite = false;

    @Column(name = "note_private", length = 2000)
    private String notePrivate;

    @Column(name = "note_public", length = 2000)
    private String notePublic;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String visibility = "PUBLIC";

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
