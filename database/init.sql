-- ============================================================
-- 🌸 桜游戏屋 (Sakura Games Site) — 数据库完整初始化脚本
-- ============================================================
-- 文件：database/init.sql
-- 替代：init.sql + saves.sql + settings.sql + assets.sql + watchdog.sql
-- 执行：mysql -u root -p < database/init.sql
-- 兼容：MySQL 8.0+（虚拟列语法需要 >= 5.7）
-- ============================================================

-- ── 建库 ─────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS `sakura_game_site`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `sakura_game_site`;

-- ============================================================
-- §1  游戏主表  s_g_games
-- ============================================================
CREATE TABLE IF NOT EXISTS `s_g_games` (
  `id`          INT            NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(255)   NOT NULL                      COMMENT '游戏名称',
  `description` TEXT                                         COMMENT '游戏介绍',
  `image_url`   VARCHAR(1000)  DEFAULT NULL                  COMMENT '封面图（URL 或 base64）',
  `game_code`   LONGTEXT                                     COMMENT '游戏完整 HTML 代码',
  `game_type`   VARCHAR(50)    NOT NULL DEFAULT 'html'       COMMENT 'html / canvas',
  `tags`        VARCHAR(500)   DEFAULT ''                    COMMENT '标签，逗号分隔',
  `author`      VARCHAR(100)   DEFAULT ''                    COMMENT '作者',
  `play_count`  INT            NOT NULL DEFAULT 0            COMMENT '游玩次数',
  `is_active`   TINYINT(1)     NOT NULL DEFAULT 1            COMMENT '1=上架 0=下架',
  `sort_order`  INT            NOT NULL DEFAULT 0            COMMENT '排序权重（降序）',
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_is_active`  (`is_active`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_play_count` (`play_count`),
  KEY `idx_created_at` (`created_at`),
  FULLTEXT KEY `ft_search` (`name`, `description`, `tags`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='游戏主表';

-- ============================================================
-- §2  游戏存档表  s_g_saves
-- ============================================================
CREATE TABLE IF NOT EXISTS `s_g_saves` (
  `id`          INT            NOT NULL AUTO_INCREMENT,
  `game_id`     INT            NOT NULL                      COMMENT '关联游戏 ID',
  `slot`        TINYINT        NOT NULL                      COMMENT '存档槽位（1~5）',
  `save_key`    VARCHAR(64)    NOT NULL                      COMMENT '客户端唯一标识（浏览器指纹哈希）',
  `save_data`   MEDIUMTEXT                                   COMMENT '存档 JSON 数据（≤500KB）',
  `save_name`   VARCHAR(100)   DEFAULT '存档'                COMMENT '存档名称（玩家自定义）',
  `play_time`   INT            NOT NULL DEFAULT 0            COMMENT '累计游玩秒数',
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_game_slot_key` (`game_id`, `slot`, `save_key`)  COMMENT '同一游戏+槽位+客户端唯一，实现 UPSERT',
  KEY `idx_game_id`   (`game_id`),
  KEY `idx_save_key`  (`save_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='游戏存档表';

-- ============================================================
-- §3  站点配置表  s_g_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS `s_g_settings` (
  `key`         VARCHAR(100)   NOT NULL                      COMMENT '配置键',
  `value`       VARCHAR(500)   NOT NULL DEFAULT '1'          COMMENT '配置值（"1"=开启，"0"=关闭）',
  `updated_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='站点配置表';

-- 初始配置：编辑器和上传功能默认全部开启
INSERT INTO `s_g_settings` (`key`, `value`) VALUES
  ('editor_enabled', '1'),
  ('upload_enabled', '1')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- ============================================================
-- §4  资源管理器表  s_g_assets
-- ============================================================
CREATE TABLE IF NOT EXISTS `s_g_assets` (
  `id`          INT            NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(255)   NOT NULL                      COMMENT '文件原始名称',
  `type`        VARCHAR(50)    NOT NULL                      COMMENT '资源类型：image / audio / json / text / other',
  `mime`        VARCHAR(120)   NOT NULL                      COMMENT 'MIME 类型，如 image/png',
  `size`        INT            NOT NULL DEFAULT 0            COMMENT '原始文件字节数（未 Base64 前）',
  `data`        MEDIUMBLOB     NOT NULL                      COMMENT 'Base64 编码后的文件内容（上限 16MB）',
  -- 虚拟列：查询详情时自动拼接完整 data URI，不占实际存储
  -- 需要 MySQL >= 5.7；若版本不支持，删除此列并在应用层拼接
  `data_uri`    TEXT GENERATED ALWAYS AS (
                  CONCAT('data:', `mime`, ';base64,', `data`)
                ) VIRTUAL                                    COMMENT '自动生成的 data URI（虚拟列，不存储）',
  `game_id`     INT            DEFAULT NULL                  COMMENT '关联游戏 ID（NULL = 公共资源，所有游戏可用）',
  `uploader`    VARCHAR(100)   DEFAULT 'admin'               COMMENT '上传者标识',
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_game_id` (`game_id`),
  KEY `idx_type`    (`type`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='游戏资源管理器 - 存储图片/音频/JSON等资源（Base64）';

-- ============================================================
-- §5  WatchDog — 安全事件日志  wd_events
-- ============================================================
CREATE TABLE IF NOT EXISTS `wd_events` (
  `id`          BIGINT         NOT NULL AUTO_INCREMENT,
  `event_type`  VARCHAR(50)    NOT NULL                      COMMENT '事件类型：SQL_INJECT/XSS/PATH_TRAVERSAL/CMD_INJECT/UPLOAD_THREAT/AUTH_FAIL/TOKEN_ABUSE/RATE_LIMIT/PATH_SCAN/BLOCKED_ACCESS/ANOMALY',
  `severity`    TINYINT        NOT NULL DEFAULT 2            COMMENT '严重程度：1=INFO 2=WARN 3=ERROR 4=CRITICAL',
  `ip`          VARCHAR(45)    NOT NULL                      COMMENT '来源 IP（含 IPv6）',
  `method`      VARCHAR(10)    DEFAULT NULL                  COMMENT 'HTTP 方法',
  `path`        VARCHAR(500)   DEFAULT NULL                  COMMENT '请求路径',
  `payload`     TEXT           DEFAULT NULL                  COMMENT '触发检测的载荷片段（已脱敏，截断120字符）',
  `user_agent`  VARCHAR(500)   DEFAULT NULL                  COMMENT 'User-Agent',
  `detail`      TEXT           DEFAULT NULL                  COMMENT '详细描述',
  `resolved`    TINYINT(1)     NOT NULL DEFAULT 0            COMMENT '是否已处置（0=待处置 1=已处置）',
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ip`          (`ip`),
  KEY `idx_event_type`  (`event_type`),
  KEY `idx_severity`    (`severity`),
  KEY `idx_created`     (`created_at`),
  KEY `idx_resolved`    (`resolved`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='WatchDog 安全事件日志（30天自动清理 WARN 级以下）';

-- ============================================================
-- §6  WatchDog — IP 封禁表  wd_blocklist
-- ============================================================
CREATE TABLE IF NOT EXISTS `wd_blocklist` (
  `id`          INT            NOT NULL AUTO_INCREMENT,
  `ip`          VARCHAR(45)    NOT NULL                      COMMENT 'IP 地址或 CIDR 段',
  `reason`      VARCHAR(200)   NOT NULL                      COMMENT '封禁原因',
  `source`      VARCHAR(20)    NOT NULL DEFAULT 'auto'       COMMENT '来源：auto=自动封禁 manual=手动封禁',
  `ban_score`   INT            NOT NULL DEFAULT 0            COMMENT '触发自动封禁时的累计威胁分',
  `expires_at`  DATETIME       DEFAULT NULL                  COMMENT 'NULL=永久封禁；有值=到期自动解封',
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ip`    (`ip`),
  KEY `idx_expires`     (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='WatchDog IP 封禁列表';

-- ============================================================
-- §7  WatchDog — IP 威胁评分  wd_ip_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS `wd_ip_scores` (
  `ip`           VARCHAR(45)   NOT NULL,
  `score`        INT           NOT NULL DEFAULT 0            COMMENT '当前威胁分（1小时窗口衰减）',
  `fail_count`   INT           NOT NULL DEFAULT 0            COMMENT '累计认证失败次数',
  `req_count`    INT           NOT NULL DEFAULT 0            COMMENT '当前1分钟内请求次数',
  `last_seen`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `window_start` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '当前评分窗口起点',
  PRIMARY KEY (`ip`),
  KEY `idx_score`     (`score`),
  KEY `idx_last_seen` (`last_seen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='WatchDog IP 威胁评分（内存优先，DB 持久化备份）';

-- ============================================================
-- §8  WatchDog — 系统健康快照  wd_health_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS `wd_health_snapshots` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `req_per_min`   INT          NOT NULL DEFAULT 0            COMMENT '5分钟窗口平均每分钟请求数',
  `error_rate`    FLOAT        NOT NULL DEFAULT 0            COMMENT '错误率（0~1，4xx+5xx / 总请求）',
  `blocked_ips`   INT          NOT NULL DEFAULT 0            COMMENT '当前有效封禁 IP 数',
  `events_1h`     INT          NOT NULL DEFAULT 0            COMMENT '近1小时安全事件总数',
  `db_latency_ms` INT          NOT NULL DEFAULT 0            COMMENT 'SELECT 1 探测数据库延迟（毫秒）',
  `memory_mb`     INT          NOT NULL DEFAULT 0            COMMENT 'Node.js 进程 RSS 内存（MB）',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='WatchDog 系统健康快照（每5分钟写入，保留30天）';

-- ============================================================
-- §9  自动清理定时任务（可选，需 event_scheduler = ON）
-- ============================================================
-- 如需启用，取消注释并确保 MySQL event_scheduler 已开启：
--   SET GLOBAL event_scheduler = ON;
--
-- -- 每小时清理过期封禁
-- CREATE EVENT IF NOT EXISTS `wd_cleanup_expired_bans`
--   ON SCHEDULE EVERY 1 HOUR
--   COMMENT '自动清理过期封禁记录'
--   DO DELETE FROM wd_blocklist
--      WHERE expires_at IS NOT NULL AND expires_at < NOW();
--
-- -- 每天凌晨2点清理30天前的 INFO/WARN 事件和健康快照
-- CREATE EVENT IF NOT EXISTS `wd_cleanup_old_data`
--   ON SCHEDULE EVERY 1 DAY STARTS '2026-01-01 02:00:00'
--   COMMENT '自动清理过期监控数据'
--   DO BEGIN
--     DELETE FROM wd_events
--       WHERE created_at < NOW() - INTERVAL 30 DAY AND severity <= 2;
--     DELETE FROM wd_health_snapshots
--       WHERE created_at < NOW() - INTERVAL 30 DAY;
--   END;

-- ============================================================
-- 初始化完成摘要
-- ============================================================
-- 数据表：8 张
--   业务表（4）：s_g_games / s_g_saves / s_g_settings / s_g_assets
--   安全表（4）：wd_events / wd_blocklist / wd_ip_scores / wd_health_snapshots
--
-- 初始数据：
--   s_g_settings: editor_enabled=1, upload_enabled=1
--
-- 替代的原始文件：
--   database/init.sql      → §1 s_g_games
--   database/saves.sql     → §2 s_g_saves
--   database/settings.sql  → §3 s_g_settings（含初始数据）
--   database/assets.sql    → §4 s_g_assets
--   database/watchdog.sql  → §5~§8 WatchDog 安全表
--
-- 执行方式：
--   mysql -u root -p < database/init.sql
-- ============================================================