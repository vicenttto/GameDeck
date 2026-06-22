CREATE TABLE IF NOT EXISTS user_follows (
    id BIGINT NOT NULL AUTO_INCREMENT,
    follower_id BIGINT NOT NULL,
    followed_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_user_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_follows_followed FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_follows_unique UNIQUE (follower_id, followed_id),
    CONSTRAINT chk_user_follows_not_self CHECK (follower_id <> followed_id)
);

CREATE INDEX idx_user_follows_followed ON user_follows(followed_id);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);

CREATE TABLE IF NOT EXISTS user_activity_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    actor_user_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    game_id BIGINT NULL,
    review_id BIGINT NULL,
    payload_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_user_activity_events_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_activity_events_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_activity_events_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE SET NULL,
    CONSTRAINT chk_user_activity_events_type CHECK (
        event_type IN (
            'ENTRY_STATUS_CHANGED',
            'REVIEW_PUBLISHED',
            'LIST_CREATED',
            'FOLLOWED_USER',
            'SCORE_UPDATED',
            'GAME_FAVORITED'
        )
    )
);

CREATE INDEX idx_user_activity_events_created_at ON user_activity_events(created_at DESC);
CREATE INDEX idx_user_activity_events_actor_created_at ON user_activity_events(actor_user_id, created_at DESC);
