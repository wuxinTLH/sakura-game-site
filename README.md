# 🌸 桜游戏屋 (Sakura Games Site)

> 一个精美的在线小游戏合集网站，支持游戏列表展示、搜索、在线游玩。

> 本项目95%+由AI（Claude Sonnet 4.6+）生成

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](./LICENSE)

---

## 技术栈

| 层     | 技术                                           |
| ------ | ---------------------------------------------- |
| 前端   | Vue 3 + TypeScript + Vite + Pinia + Vue Router |
| 后端   | Node.js + Express + mysql2 + multer            |
| 数据库 | MySQL 8.x                                      |

---

## 项目结构

```
sakura-games-site/
├── backend/                      # Node.js 后端
│   ├── config/
│   │   └── database.js           # MySQL 连接池
│   ├── middleware/
│   │   └── auth.js               # 管理员 Token 验证中间件
│   ├── routes/
│   │   ├── games.js              # 游戏 CRUD + 搜索 API
│   │   ├── upload.js             # 文件上传 + 解析入库
│   │   └── admin.js              # 管理员登录 + 站点配置接口
│   ├── .env                      # 环境变量（不提交 git）
│   ├── package.json
│   └── server.js                 # Express 入口
├── frontend/                     # Vue3 前端
│   ├── src/
│   │   ├── api/
│   │   │   ├── games.ts          # 游戏相关 Axios API 封装
│   │   │   └── admin.ts          # 管理员相关 Axios API 封装
│   │   ├── assets/
│   │   │   └── main.css          # 全局样式（桜主题）
│   │   ├── components/
│   │   │   ├── GameCard.vue      # 游戏卡片组件
│   │   │   └── SearchBar.vue     # 搜索框 + 标签筛选
│   │   ├── router/
│   │   │   └── index.ts          # Vue Router（含动态 title + 权限守卫）
│   │   ├── stores/
│   │   │   ├── games.ts          # Pinia 在线游戏状态
│   │   │   ├── localGames.ts     # Pinia 本地游戏状态（localStorage）
│   │   │   └── admin.ts          # Pinia 管理员状态 + 站点配置
│   │   ├── types/
│   │   │   └── game.ts           # TypeScript 类型定义
│   │   ├── views/
│   │   │   ├── HomeView.vue      # 首页（游戏列表 + 搜索）
│   │   │   ├── GameView.vue      # 游戏详情 + 运行页
│   │   │   ├── EditorView.vue    # 游戏编辑器 + 实时预览
│   │   │   ├── LocalGamesView.vue# 本地游戏列表
│   │   │   ├── AddGameView.vue   # 文件上传游戏页
│   │   │   └── AdminView.vue     # 管理员登录 + 站点配置面板
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── database/
│   ├── init.sql                  # 数据库初始化 + 内置游戏（建库建表）
│   ├── game.sql                  # 额外测试游戏数据
│   └── settings.sql              # 站点配置表 + 管理员开关初始数据
├── .gitignore
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
git clone https://github.com/wuxinTLH/sakura-games-site.git
cd sakura-games-site
```

### 2. 初始化数据库

登录 MySQL 并按顺序执行初始化脚本：
```bash
mysql -u root -p < database/init.sql
mysql -u root -p < database/game.sql
mysql -u root -p < database/settings.sql
```

或在 MySQL 命令行中：
```sql
source /path/to/sakura-games-site/database/init.sql;
source /path/to/sakura-games-site/database/game.sql;
source /path/to/sakura-games-site/database/settings.sql;
```

> `settings.sql` 会创建 `s_g_settings` 站点配置表，并写入编辑器和上传功能的开关初始值（默认全部开启）。

### 3. 配置并启动后端

```bash
cd backend

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env
```

编辑 `.env`，填写你的 MySQL 密码和管理员配置：
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

# 管理员配置
ADMIN_PASSWORD=你的管理员密码
ADMIN_TOKEN_SECRET=自定义签名密钥
```

> `ADMIN_PASSWORD` 是访问 `/admin` 管理面板的登录密码，`ADMIN_TOKEN_SECRET` 是 Token 签名密钥，两者均可自定义。

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

## 页面说明

| 路径        | 页面     | 说明                                                             |
| ----------- | -------- | ---------------------------------------------------------------- |
| `/`         | 首页     | 在线游戏列表，支持搜索和标签筛选                                 |
| `/game/:id` | 游戏页   | iframe 沙盒运行游戏，支持全屏                                    |
| `/editor`   | 编辑器   | 本地编写游戏代码 + 实时预览，保存至浏览器本地（可被管理员关闭）  |
| `/local`    | 本地游戏 | 管理编辑器保存的本地游戏，支持游玩/编辑/导出/删除                |
| `/add`      | 上传游戏 | 上传 `.html` / `.vue` / `.ts` 文件，解析后入库（可被管理员关闭） |
| `/admin`    | 管理面板 | 管理员登录 + 控制编辑器/上传功能开关                             |

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

### 上传接口

| 方法 | 路径           | 说明                                |
| ---- | -------------- | ----------------------------------- |
| POST | `/upload/game` | 上传游戏文件（multipart/form-data） |

### 管理员接口

| 方法 | 路径              | 说明                       |
| ---- | ----------------- | -------------------------- |
| POST | `/admin/login`    | 管理员登录，返回 token     |
| POST | `/admin/logout`   | 登出（需要 token）         |
| GET  | `/admin/settings` | 获取站点配置（公开）       |
| PUT  | `/admin/settings` | 更新站点配置（需要 token） |

> 需要 token 的接口须在请求头携带 `x-admin-token`。

#### 上传接口参数

| 字段        | 类型   | 说明                                |
| ----------- | ------ | ----------------------------------- |
| file        | File   | 游戏文件，支持 `.html` `.vue` `.ts` |
| name        | string | 游戏名称（必填）                    |
| description | string | 游戏介绍                            |
| tags        | string | 标签，逗号分隔                      |
| author      | string | 作者                                |
| sort_order  | number | 排序权重                            |

#### 文件解析规则

| 文件类型 | 处理方式                                               |
| -------- | ------------------------------------------------------ |
| `.html`  | 直接存入数据库，不做处理                               |
| `.vue`   | 提取 `<template>` `<script>` `<style>` 拼装为完整 HTML |
| `.ts`    | 移除 TypeScript 类型注解，包装进 HTML + Canvas 模板    |

#### 列表查询参数

| 参数   | 类型   | 说明                                     |
| ------ | ------ | ---------------------------------------- |
| search | string | 关键词（全文搜索 name/description/tags） |
| tags   | string | 标签精确筛选                             |
| page   | number | 页码，默认 1                             |
| limit  | number | 每页数量，默认 12                        |

---

## 数据库设计

数据库名：`sakura_game_site`，共两张表。

### 表 `s_g_games` — 游戏列表

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

### 表 `s_g_settings` — 站点配置（settings.sql）

| 字段       | 类型            | 说明                         |
| ---------- | --------------- | ---------------------------- |
| key        | VARCHAR(100) PK | 配置键                       |
| value      | VARCHAR(500)    | 配置值（`1`=开启，`0`=关闭） |
| updated_at | DATETIME        | 最后更新时间                 |

内置配置项：

| key              | 默认值 | 说明               |
| ---------------- | ------ | ------------------ |
| `editor_enabled` | `1`    | 游戏编辑器功能开关 |
| `upload_enabled` | `1`    | 游戏上传功能开关   |

---

## 功能特性

### 在线游戏库
- 🔍 **实时搜索** — 防抖关键词搜索 + 标签快捷筛选
- 📄 **分页加载** — 加载更多按钮式分页
- 🎮 **iframe 沙盒运行** — 游戏代码安全隔离执行
- ⛶ **全屏模式** — 游戏页支持全屏游玩
- 📊 **游玩统计** — 自动记录每局游玩次数

### 游戏编辑器
- ✏️ **实时预览** — 代码修改后 600ms 防抖自动刷新预览
- 🔢 **行号显示** — 编辑器左侧同步行号
- 📐 **布局切换** — 分栏 / 仅编辑 / 仅预览 三种模式
- ⛶ **全屏预览** — 新窗口全屏预览游戏效果
- 📋 **代码模板** — 内置空白 HTML 和 Canvas 两种模板
- 💾 **本地保存** — 游戏数据持久化至 localStorage

### 本地游戏
- 📋 **列表管理** — 查看所有本地保存的游戏
- ▶ **直接游玩** — 弹窗 iframe 沙盒运行
- ✏️ **跳转编辑** — 一键回到编辑器继续修改
- ⬇ **导出 HTML** — 下载为独立可运行的 HTML 文件
- 🗑 **删除管理** — 确认后删除本地游戏

### 文件上传
- 📤 **拖拽上传** — 支持拖拽或点击选择文件
- 🔍 **代码预览** — 上传前预览文件前 30 行
- 🔄 **自动解析** — `.vue` / `.ts` 自动转换为可运行 HTML
- ✅ **表单验证** — 必填项校验 + 错误提示

### 管理员模块
- 🔐 **密码登录** — Token 鉴权，登录状态持久化至 localStorage
- 🎛 **功能开关** — 实时控制编辑器、上传功能的启用/禁用
- 👁 **状态预览** — 面板内实时显示各功能当前运行状态
- 🚫 **路由守卫** — 被关闭的功能页面自动重定向至首页，导航入口同步隐藏

### 通用
- 📱 **响应式设计** — 适配桌面 / 平板 / 手机
- 🌸 **桜主题** — 日式樱花风格视觉设计
- 🔄 **动态页面 Title** — 进入游戏后 title 变为游戏名称

---

## 常见问题

| 问题                           | 原因            | 解决                                                             |
| ------------------------------ | --------------- | ---------------------------------------------------------------- |
| `Cannot find module 'express'` | 未安装依赖      | `npm install`                                                    |
| `Cannot find module 'multer'`  | 未安装 multer   | `npm install multer`                                             |
| `MySQL 连接失败`               | 密码或库名错误  | 检查 `.env`                                                      |
| `EADDRINUSE`                   | 端口被占用      | 修改 `.env` 中的端口号                                           |
| 前端空白无内容                 | 后端未启动      | 先启动后端再刷新前端                                             |
| 上传文件报 413                 | 文件超过限制    | 文件需小于 10MB                                                  |
| 管理员登录提示密码错误         | `.env` 未读取到 | 检查 `.env` 是否存在，`injecting env (0)` 表示文件为空或路径错误 |
| 管理员登录提示密码错误         | 密码混淆        | 登录密码是 `ADMIN_PASSWORD`，不是 `ADMIN_TOKEN_SECRET`           |
| 功能开关保存后前端未生效       | 缓存未刷新      | 刷新页面，settings 会在启动时重新拉取                            |

---

## License

[MIT](./LICENSE) © 2026 Sakura Games Site Contributors