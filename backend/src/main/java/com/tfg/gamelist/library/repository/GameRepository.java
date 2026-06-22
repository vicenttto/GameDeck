package com.tfg.gamelist.library.repository;

import com.tfg.gamelist.common.exception.ApiException;
import com.tfg.gamelist.library.entity.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;

import java.util.Optional;

public interface GameRepository extends JpaRepository<Game, Long> {

    @SuppressWarnings("null")
    default Game getOrThrow(Long id) {
        return findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Juego no encontrado"));
    }

    Optional<Game> findByRawgGameId(Long rawgGameId);
}
