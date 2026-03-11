# 🌸 桜游戏屋 (Sakura Games Site)

> 一个精美的在线小游戏合集网站，支持游戏列表展示、搜索、在线游玩。

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](./LICENSE)

---

## 技术栈

| 层     | 技术                                           |
| ------ | ---------------------------------------------- |
| 前端   | Vue 3 + TypeScript + Vite + Pinia + Vue Router |
| 后端   | Node.js + Express + mysql2                     |
| 数据库 | MySQL 8.x                                      |

---

## 项目结构

```
sakura-games-site/
├── backend/                    # Node.js 后端
│   ├── config/
│   │   └── database.js         # MySQL 连接池
│   ├── routes/
│   │   └── games.js            # 游戏 CRUD + 搜索 API
│   ├── .env.example            # 环境变量模板
│   ├── package.json
│   └── server.js               # Express 入口
├── frontend/                   # Vue3 前端
│   ├── src/
│   │   ├── api/games.ts        # Axios API 封装
│   │   ├── assets/main.css     # 全局样式（桜主题）
│   │   ├── components/
│   │   │   ├── GameCard.vue    # 游戏卡片组件
│   │   │   └── SearchBar.vue   # 搜索框 + 标签筛选
│   │   ├── router/index.ts     # Vue Router（含动态 title）
│   │   ├── stores/games.ts     # Pinia 状态管理
│   │   ├── types/game.ts       # TypeScript 类型定义
│   │   ├── views/
│   │   │   ├── HomeView.vue    # 首页（游戏列表 + 搜索）
│   │   │   └── GameView.vue    # 游戏详情 + 运行页
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── database/
│   ├── init.sql                # 数据库初始化 + 内置游戏
│   └── game.sql                # 额外测试游戏数据
├── LICENSE
└── README.md
```

---

## 前期准备

### 环境要求

| 工具    | 版本要求 |
| ------- | -------- |
| Node.js | >= 18.x  |
| npm     | >= 9.x   |
| MySQL   | >= 8.0   |

### 安装 Node.js

前往 [https://nodejs.org](https://nodejs.org) 下载 LTS 版本安装即可。

安装完成后验证：
```bash
node -v
npm -v
```

### 安装 MySQL

前往 [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/) 下载安装。

安装完成后确保 MySQL 服务正在运行：
```bash
# Windows
net start mysql

# Linux / macOS
sudo systemctl start mysql
```

---

## 快速启动

### 1. 克隆项目

```bash
git clone https://github.com/your-username/sakura-games-site.git
cd sakura-games-site
```

### 2. 初始化数据库

登录 MySQL 并执行初始化脚本：
```bash
mysql -u root -p < database/init.sql
mysql -u root -p < database/game.sql
```

或在 MySQL 命令行中：
```sql
source /path/to/sakura-games-site/database/init.sql;
source /path/to/sakura-games-site/database/game.sql;
```

### 3. 配置并启动后端

```bash
cd backend

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env
```

编辑 `.env`，填写你的 MySQL 密码：
```env
PORT=8802
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=sakura_game_site
DB_CONNECTION_LIMIT=10
CORS_ORIGINS=http://localhost:8801
NODE_ENV=development
```

启动后端：
```bash
# 开发模式（热重载）
npm run dev

# 或生产模式
npm start
```

看到以下输出说明后端正常：
```
🌸  桜游戏屋 API 运行在 http://localhost:8802
✅  MySQL 连接成功
```

### 4. 配置并启动前端

新开一个终端：
```bash
cd frontend

# 安装依赖
npm install

# 开发模式启动
npm run dev
```

看到以下输出后，访问 [http://localhost:8801](http://localhost:8801)：
```
VITE ready in xxx ms
➜  Local:   http://localhost:8801/
```

---

## API 文档

### 基础地址
```
http://localhost:8802/api
```

### 游戏接口

| 方法   | 路径              | 说明                        |
| ------ | ----------------- | --------------------------- |
| GET    | `/games`          | 游戏列表（支持分页 + 搜索） |
| GET    | `/games/:id`      | 游戏详情（含 game_code）    |
| POST   | `/games`          | 新增游戏                    |
| PUT    | `/games/:id`      | 更新游戏                    |
| DELETE | `/games/:id`      | 下架游戏（软删除）          |
| POST   | `/games/:id/play` | 记录游玩次数                |
| GET    | `/health`         | 健康检查                    |

#### 列表查询参数

| 参数   | 类型   | 说明                                     |
| ------ | ------ | ---------------------------------------- |
| search | string | 关键词（全文搜索 name/description/tags） |
| tags   | string | 标签精确筛选                             |
| page   | number | 页码，默认 1                             |
| limit  | number | 每页数量，默认 12                        |

---

## 数据库设计

```
数据库: sakura_game_site
表名:   s_g_games
```

| 字段        | 类型          | 说明                    |
| ----------- | ------------- | ----------------------- |
| id          | INT PK AI     | 主键                    |
| name        | VARCHAR(255)  | 游戏名称                |
| description | TEXT          | 游戏介绍                |
| image_url   | VARCHAR(1000) | 封面图（URL 或 base64） |
| game_code   | LONGTEXT      | 游戏完整 HTML 代码      |
| game_type   | VARCHAR(50)   | html / canvas           |
| tags        | VARCHAR(500)  | 标签，逗号分隔          |
| author      | VARCHAR(100)  | 作者                    |
| play_count  | INT           | 游玩次数                |
| is_active   | TINYINT(1)    | 1=上架 0=下架           |
| sort_order  | INT           | 排序权重（降序）        |
| created_at  | DATETIME      | 创建时间                |
| updated_at  | DATETIME      | 更新时间                |

---

## 如何添加新游戏

将游戏写成自包含的 HTML 文件（CSS+JS 内联），通过 API 添加：

```bash
curl -X POST http://localhost:8802/api/games \
  -H "Content-Type: application/json" \
  -d '{
    "name": "俄罗斯方块",
    "description": "经典的方块消除游戏",
    "game_code": "<!DOCTYPE html>...",
    "tags": "益智,经典",
    "author": "Sakura",
    "sort_order": 80
  }'
```

---

## 功能特性

- 🔍 **实时搜索** — 防抖关键词搜索 + 标签快捷筛选
- 📄 **分页加载** — 加载更多按钮式分页
- 🎮 **iframe 沙盒运行** — 游戏代码安全隔离执行
- ⛶ **全屏模式** — 游戏页支持全屏游玩
- 📱 **响应式设计** — 适配桌面 / 平板 / 手机
- 🌸 **桜主题** — 日式樱花风格视觉设计
- 🔄 **动态页面 Title** — 进入游戏后 title 变为游戏名称
- 📊 **游玩统计** — 自动记录每局游玩次数

---

## 常见问题

| 问题                           | 原因           | 解决                   |
| ------------------------------ | -------------- | ---------------------- |
| `Cannot find module 'express'` | 未安装依赖     | `npm install`          |
| `MySQL 连接失败`               | 密码或库名错误 | 检查 `.env`            |
| `EADDRINUSE`                   | 端口被占用     | 修改 `.env` 中的端口号 |
| 前端空白无内容                 | 后端未启动     | 先启动后端再刷新前端   |

---

## License

[MIT](./LICENSE) © 2026 Sakura Games Site Contributors