package com.tfg.gamelist.user.repository;

import com.tfg.gamelist.user.entity.UserFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface UserFollowRepository extends JpaRepository<UserFollow, Long> {

    long countByFollowedId(Long followedId);

    long countByFollowerId(Long followerId);

    boolean existsByFollowerIdAndFollowedId(Long followerId, Long followedId);

    @Transactional
    void deleteByFollowerIdAndFollowedId(Long followerId, Long followedId);
}
