package com.tfg.gamelist.list.repository;

import com.tfg.gamelist.list.entity.UserListItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserListItemRepository extends JpaRepository<UserListItem, Long> {

    List<UserListItem> findByListIdOrderByPositionAscCreatedAtAsc(Long listId);

    Optional<UserListItem> findByListIdAndGameId(Long listId, Long gameId);

    boolean existsByListIdAndGameId(Long listId, Long gameId);

    long countByListId(Long listId);

    @Query("SELECT COALESCE(MAX(i.position), -1) FROM UserListItem i WHERE i.listId = :listId")
    int findMaxPositionByListId(@Param("listId") Long listId);
}
