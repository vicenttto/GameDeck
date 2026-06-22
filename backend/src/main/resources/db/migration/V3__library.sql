CREATE TABLE IF NOT EXISTS user_game_entries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    game_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    score DECIMAL(3,1) NULL,
    progress_hours DECIMAL(7,2) NULL DEFAULT 0,
    platform_note VARCHAR(100) NULL,
    started_at DATE NULL,
    finished_at DATE NULL,
    is_favorite TINYINT(1) NOT NULL DEFAULT 0,
    note_private VARCHAR(2000) NULL,
    note_public VARCHAR(2000) NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_user_game_entries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_game_entries_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_game_entries_user_game UNIQUE (user_id, game_id),
    CONSTRAINT chk_user_game_entries_status CHECK (
        status IN ('PLAN_TO_PLAY', 'PLAYING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'REPLAYING')
    ),
    CONSTRAINT chk_user_game_entries_score CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
    CONSTRAINT chk_user_game_entries_progress CHECK (progress_hours IS NULL OR progress_hours >= 0),
    CONSTRAINT chk_user_game_entries_visibility CHECK (visibility IN ('PUBLIC', 'FOLLOWERS', 'PRIVATE')),
    CONSTRAINT chk_user_game_entries_dates CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at)
);

CREATE INDEX idx_user_game_entries_user_status ON user_game_entries(user_id, status);
CREATE INDEX idx_user_game_entries_user_updated_at ON user_game_entries(user_id, updated_at DESC);
CREATE INDEX idx_user_game_entries_game ON user_game_entries(game_id);
