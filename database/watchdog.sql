-- ============================================================
-- WatchDog 安全监控系统 — 数据库初始化
-- 文件: database/watchdog.sql
-- 执行: mysql -u root -p < database/watchdog.sql
-- ============================================================

USE sakura_game_site;

-- ── 安全事件日志表 ────────────────────────────────────────────
-- 记录所有安全相关事件（攻击尝试、异常行为、系统告警）
CREATE TABLE IF NOT EXISTS `wd_events` (
  `id`          BIGINT        NOT NULL AUTO_INCREMENT,
  `event_type`  VARCHAR(50)   NOT NULL COMMENT '事件类型：BRUTE_FORCE/SQL_INJECT/XSS/PATH_TRAVERSAL/RATE_LIMIT/ANOMALY/UPLOAD_THREAT/AUTH_FAIL/TOKEN_ABUSE',
  `severity`    TINYINT       NOT NULL DEFAULT 2 COMMENT '严重程度：1=INFO 2=WARN 3=ERROR 4=CRITICAL',
  `ip`          VARCHAR(45)   NOT NULL COMMENT '来源 IP（含 IPv6）',
  `method`      VARCHAR(10)   DEFAULT NULL COMMENT 'HTTP 方法',
  `path`        VARCHAR(500)  DEFAULT NULL COMMENT '请求路径',
  `payload`     TEXT          DEFAULT NULL COMMENT '触发检测的载荷片段（脱敏）',
  `user_agent`  VARCHAR(500)  DEFAULT NULL COMMENT 'User-Agent',
  `detail`      TEXT          DEFAULT NULL COMMENT '详细描述',
  `resolved`    TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '是否已处置',
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ip`         (`ip`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_severity`   (`severity`),
  KEY `idx_created`    (`created_at`),
  KEY `idx_resolved`   (`resolved`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='WatchDog 安全事件日志';

-- ── IP 封禁表 ─────────────────────────────────────────────────
-- 主动封禁/自动封禁的 IP 列表
CREATE TABLE IF NOT EXISTS `wd_blocklist` (
  `id`          INT           NOT NULL AUTO_INCREMENT,
  `ip`          VARCHAR(45)   NOT NULL COMMENT 'IP 地址或 CIDR',
  `reason`      VARCHAR(200)  NOT NULL COMMENT '封禁原因',
  `source`      VARCHAR(20)   NOT NULL DEFAULT 'auto' COMMENT '来源：auto=自动 manual=手动',
  `ban_score`   INT           NOT NULL DEFAULT 0 COMMENT '累计威胁分（自动封禁依据）',
  `expires_at`  DATETIME      DEFAULT NULL COMMENT 'NULL=永久封禁',
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ip` (`ip`),
  KEY `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='WatchDog IP 封禁列表';

-- ── IP 威胁评分表 ─────────────────────────────────────────────
-- 滑动窗口内各 IP 的累计威胁分，达到阈值自动封禁
CREATE TABLE IF NOT EXISTS `wd_ip_scores` (
  `ip`          VARCHAR(45)   NOT NULL,
  `score`       INT           NOT NULL DEFAULT 0 COMMENT '当前威胁分（TTL 1小时衰减）',
  `fail_count`  INT           NOT NULL DEFAULT 0 COMMENT '登录失败次数',
  `req_count`   INT           NOT NULL DEFAULT 0 COMMENT '1分钟内请求次数',
  `last_seen`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `window_start` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '当前统计窗口起点',
  PRIMARY KEY (`ip`),
  KEY `idx_score`    (`score`),
  KEY `idx_last_seen`(`last_seen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='WatchDog IP 威胁评分';

-- ── 系统健康快照表 ────────────────────────────────────────────
-- 每5分钟记录一次系统状态，用于异常趋势分析
CREATE TABLE IF NOT EXISTS `wd_health_snapshots` (
  `id`            INT      NOT NULL AUTO_INCREMENT,
  `req_per_min`   INT      NOT NULL DEFAULT 0 COMMENT '每分钟请求数',
  `error_rate`    FLOAT    NOT NULL DEFAULT 0 COMMENT '错误率（0~1）',
  `blocked_ips`   INT      NOT NULL DEFAULT 0 COMMENT '当前封禁 IP 数',
  `events_1h`     INT      NOT NULL DEFAULT 0 COMMENT '近1小时安全事件数',
  `db_latency_ms` INT      NOT NULL DEFAULT 0 COMMENT '数据库查询延迟(ms)',
  `memory_mb`     INT      NOT NULL DEFAULT 0 COMMENT '进程内存使用 MB',
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='WatchDog 系统健康快照';

-- ── 清理过期封禁的定时事件（需 MySQL 开启 event_scheduler）────
-- 可选：如未开启 event_scheduler，由后端定时任务替代
-- SET GLOBAL event_scheduler = ON;
-- CREATE EVENT IF NOT EXISTS `wd_cleanup_expired_bans`
--   ON SCHEDULE EVERY 1 HOUR
--   DO DELETE FROM wd_blocklist WHERE expires_at IS NOT NULL AND expires_at < NOW();