-- ============================================================
-- 资源管理器表  s_g_assets
-- 放置路径：database/assets.sql
-- 执行：mysql -u root -p < database/assets.sql
-- ============================================================
USE sakura_game_site;
CREATE TABLE IF NOT EXISTS `s_g_assets` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL COMMENT '文件原始名称',
    `type` VARCHAR(50) NOT NULL COMMENT '资源类型：image / audio / json / text / other',
    `mime` VARCHAR(120) NOT NULL COMMENT 'MIME 类型，如 image/png',
    `size` INT NOT NULL DEFAULT 0 COMMENT '文件字节数',
    `data` MEDIUMBLOB NOT NULL COMMENT 'Base64 编码后的文件内容',
    `data_uri` TEXT GENERATED ALWAYS AS (
        CONCAT('data:', `mime`, ';base64,', `data`)
    ) VIRTUAL COMMENT '自动生成的 data URI（虚拟列，不存储）',
    `game_id` INT DEFAULT NULL COMMENT '关联游戏 ID（NULL = 公共资源）',
    `uploader` VARCHAR(100) DEFAULT 'admin' COMMENT '上传者',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_game_id` (`game_id`),
    KEY `idx_type` (`type`),
    KEY `idx_created` (`created_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '游戏资源管理器 - 存储图片/音频/JSON等资源';
-- ============================================================
-- 说明
-- ============================================================
-- ① data 字段存储 Base64 编码后的二进制，MEDIUMBLOB 上限 16MB，
--   但后端限制单文件上传不超过 2MB（Base64 膨胀约 1.33 倍 ≈ 2.7MB 存储）
-- ② data_uri 虚拟列，查询详情时可直接获取可嵌入 HTML 的完整 data URI
-- ③ game_id = NULL 表示公共资源库，可在所有游戏中复用
-- ④ 全站总资源容量限制在应用层（后端 /api/admin/assets/quota）实现
-- ============================================================