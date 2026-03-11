USE sakura_game_site;
CREATE TABLE IF NOT EXISTS s_g_settings (
    `key` VARCHAR(100) PRIMARY KEY COMMENT '配置键',
    `value` VARCHAR(500) NOT NULL COMMENT '配置值',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '站点配置表';
INSERT INTO s_g_settings (`key`, `value`)
VALUES ('editor_enabled', '1'),
    ('upload_enabled', '1') ON DUPLICATE KEY
UPDATE `value` =
VALUES(`value`);