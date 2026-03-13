-- 游戏存档表
-- 适用于网页内嵌游戏通过 postMessage 或直接 localStorage 存档
-- 此表为可选扩展，用于将存档持久化到服务端（如需跨设备同步）
USE sakura_game_site;
CREATE TABLE IF NOT EXISTS `s_g_saves` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `game_id` INT NOT NULL COMMENT '关联游戏 ID',
    `slot` TINYINT NOT NULL DEFAULT 1 COMMENT '存档槽位 1~5',
    `save_key` VARCHAR(64) NOT NULL COMMENT '客户端标识（浏览器指纹或自定义）',
    `save_data` MEDIUMTEXT NOT NULL COMMENT '存档 JSON 数据',
    `save_name` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '存档名称（玩家自定义）',
    `play_time` INT NOT NULL DEFAULT 0 COMMENT '累计游玩秒数',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_game_slot_key` (`game_id`, `slot`, `save_key`),
    KEY `idx_game_id` (`game_id`),
    KEY `idx_save_key` (`save_key`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '游戏存档表';