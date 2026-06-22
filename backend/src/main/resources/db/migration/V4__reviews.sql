CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    game_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    score DECIMAL(3,1) NULL,
    contains_spoilers TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_slot TINYINT AS (CASE WHEN status = 'PUBLISHED' THEN 1 ELSE NULL END) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    CONSTRAINT chk_reviews_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'HIDDEN')),
    CONSTRAINT chk_reviews_score CHECK (score IS NULL OR (score >= 0 AND score <= 10))
);

CREATE UNIQUE INDEX uk_reviews_user_game_published ON reviews(user_id, game_id, published_slot);
CREATE INDEX idx_reviews_game_published_at ON reviews(game_id, published_at DESC);
CREATE INDEX idx_reviews_user_created_at ON reviews(user_id, created_at DESC);
