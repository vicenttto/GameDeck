package com.tfg.gamelist.list.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_list_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserListItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "list_id", nullable = false)
    private Long listId;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @Column(name = "added_by_user_id", nullable = false)
    private Long addedByUserId;

    @Column(length = 500)
    private String note;

    @Column
    private Integer position;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
