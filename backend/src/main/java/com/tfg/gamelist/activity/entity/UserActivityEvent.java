package com.tfg.gamelist.activity.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_activity_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserActivityEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_user_id", nullable = false)
    private Long actorUserId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "review_id")
    private Long reviewId;

    @Column(name = "payload_json", columnDefinition = "JSON")
    private String payloadJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
