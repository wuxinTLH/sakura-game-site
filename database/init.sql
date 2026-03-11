-- =============================================
-- 桜游戏屋 数据库初始化脚本
-- Database: sakura_game_site
-- =============================================
CREATE DATABASE IF NOT EXISTS sakura_game_site CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sakura_game_site;
CREATE TABLE IF NOT EXISTS s_g_games (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '游戏ID',
  name VARCHAR(255) NOT NULL COMMENT '游戏名称',
  description TEXT COMMENT '游戏介绍',
  image_url VARCHAR(1000) COMMENT '游戏封面图片URL（支持base64或外链）',
  game_code LONGTEXT COMMENT '游戏完整代码（HTML+CSS+JS）',
  game_type VARCHAR(50) DEFAULT 'html' COMMENT '游戏代码类型: html | canvas',
  tags VARCHAR(500) COMMENT '游戏标签，逗号分隔，如: 益智,休闲',
  author VARCHAR(100) DEFAULT '匿名' COMMENT '游戏作者',
  play_count INT DEFAULT 0 COMMENT '累计游玩次数',
  is_active TINYINT(1) DEFAULT 1 COMMENT '是否上架：1上架 0下架',
  sort_order INT DEFAULT 0 COMMENT '排序权重，越大越靠前',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  INDEX idx_name (name),
  INDEX idx_is_active (is_active),
  INDEX idx_sort (sort_order DESC, created_at DESC),
  FULLTEXT INDEX ft_search (name, description, tags)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '桜游戏屋 - 游戏列表';