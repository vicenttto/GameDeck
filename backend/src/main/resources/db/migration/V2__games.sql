CREATE TABLE IF NOT EXISTS games (
    id BIGINT NOT NULL AUTO_INCREMENT,
    rawg_game_id BIGINT NOT NULL,
    slug VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description_short VARCHAR(1000) NULL,
    released_at DATE NULL,
    cover_url VARCHAR(500) NULL,
    background_url VARCHAR(500) NULL,
    metacritic INT NULL,
    rawg_rating DECIMAL(3,2) NULL,
    ratings_count INT NULL,
    platforms_json JSON NULL,
    genres_json JSON NULL,
    developers_json JSON NULL,
    publishers_json JSON NULL,
    last_rawg_sync_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_games_rawg_game_id UNIQUE (rawg_game_id),
    CONSTRAINT uk_games_slug UNIQUE (slug),
    CONSTRAINT chk_games_metacritic CHECK (metacritic IS NULL OR (metacritic >= 0 AND metacritic <= 100)),
    CONSTRAINT chk_games_rawg_rating CHECK (rawg_rating IS NULL OR (rawg_rating >= 0 AND rawg_rating <= 5))
);

CREATE INDEX idx_games_name ON games(name);
CREATE INDEX idx_games_released_at ON games(released_at);
