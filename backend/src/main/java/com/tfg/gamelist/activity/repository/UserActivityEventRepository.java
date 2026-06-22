package com.tfg.gamelist.activity.repository;

import com.tfg.gamelist.activity.entity.UserActivityEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserActivityEventRepository extends JpaRepository<UserActivityEvent, Long> {
    List<UserActivityEvent> findByActorUserIdOrderByCreatedAtDesc(Long actorUserId, Pageable pageable);
    List<UserActivityEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);
    void deleteByActorUserIdAndIdIn(Long actorUserId, List<Long> ids);
}
