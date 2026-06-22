CREATE TABLE IF NOT EXISTS user_lists (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    is_public TINYINT(1) NOT NULL DEFAULT 1,
    sort_mode VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_user_lists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_lists_user_name UNIQUE (user_id, name),
    CONSTRAINT chk_user_lists_sort_mode CHECK (
        sort_mode IN ('MANUAL', 'TITLE_ASC', 'TITLE_DESC', 'RATING_DESC', 'RELEASE_DATE_DESC')
    )
);

CREATE INDEX idx_user_lists_user_public ON user_lists(user_id, is_public);

CREATE TABLE IF NOT EXISTS user_list_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    list_id BIGINT NOT NULL,
    game_id BIGINT NOT NULL,
    added_by_user_id BIGINT NOT NULL,
    note VARCHAR(500) NULL,
    position INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_user_list_items_list FOREIGN KEY (list_id) REFERENCES user_lists(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_list_items_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_list_items_added_by FOREIGN KEY (added_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_list_items_list_game UNIQUE (list_id, game_id),
    CONSTRAINT chk_user_list_items_position CHECK (position IS NULL OR position >= 0)
);

CREATE INDEX idx_user_list_items_list_position ON user_list_items(list_id, position);
CREATE INDEX idx_user_list_items_game ON user_list_items(game_id);
