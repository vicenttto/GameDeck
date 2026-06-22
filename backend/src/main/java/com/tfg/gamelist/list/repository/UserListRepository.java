package com.tfg.gamelist.list.repository;

import com.tfg.gamelist.common.exception.ApiException;
import com.tfg.gamelist.list.entity.UserList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

public interface UserListRepository extends JpaRepository<UserList, Long> {

    @SuppressWarnings("null")
    default UserList getOrThrow(Long id) {
        return findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Lista no encontrada"));
    }

    List<UserList> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<UserList> findByUserIdAndIsPublicTrueOrderByCreatedAtDesc(Long userId);

    Optional<UserList> findByIdAndUserId(Long id, Long userId);

    boolean existsByUserIdAndName(Long userId, String name);

    long countByUserId(Long userId);
}
