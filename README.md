# 🌸 桜游戏屋 (Sakura Games Site)

> 一个精美的在线小游戏合集网站，支持游戏列表展示、搜索、在线游玩。
> 本项目 95%+ 由 AI（Claude Sonnet 4.6+）生成

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
├── backend/
│   ├── config/
│   │   └── database.js           # MySQL 连接池 + 自动重连 + 慢查询日志
│   ├── middleware/
│   │   ├── auth.js               # JWT + bcrypt 密码哈希 + Token 黑名单
│   │   ├── validate.js           # 统一参数校验（express-validator）
│   │   └── logger.js             # Winston 日志中间件
│   ├── routes/
│   │   ├── games.js              # 游戏 CRUD + 搜索 + 排序（写操作需鉴权）
│   │   ├── upload.js             # 文件上传 + 安全扫描 + 解析入库（需鉴权）
│   │   ├── saves.js              # 游戏存档 CRUD（公开，以 save_key 标识客户端）
│   │   ├── assets.js             # 资源管理器 CRUD（图片/音频/JSON，需鉴权写操作）★
│   │   └── admin.js              # 管理员登录/登出 + 站点配置 + 游戏管理 + 统计 + 接口文档
│   ├── logs/
│   │   └── .gitkeep
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── server.js                 # Express 入口（含存档路由挂载 + DB 健康检查）
├── frontend/
│   └── src/
│       ├── api/
│       │   ├── games.ts          # 游戏接口（sort / publishGame / uploadGame，含 authHttp 鉴权实例）
│       │   ├── admin.ts          # 管理员接口（token 拦截器 / stats / adminGetGames）
│       │   ├── saves.ts          # 存档接口（getSaveSlots / loadSave / writeSave / deleteSave）
│       │   └── assets.ts         # 资源管理器接口（上传/列表/详情/删除/配额）★
│       ├── assets/
│       │   └── main.css
│       ├── components/
│       │   ├── GameCard.vue
│       │   ├── SearchBar.vue
│       │   ├── ToastContainer.vue  # 全局 Toast
│       │   ├── ErrorBoundary.vue   # 组件级错误边界
│       │   ├── ConfirmDialog.vue   # 全局确认弹窗（替代原生 confirm()）
│       │   └── AssetManager.vue    # 资源管理器浮层组件★
│       ├── composables/
│       │   ├── useCodeMirror.ts
│       │   ├── useGameStorage.ts   # 本地游戏存档/进度/设置（localStorage，3层存储）
│       │   ├── useToast.ts         # Toast 状态
│       │   └── useConfirm.ts       # 确认弹窗状态
│       ├── router/
│       │   └── index.ts            # 含 404 兜底路由 + 功能开关守卫 + 管理员鉴权守卫
│       ├── stores/
│       │   ├── games.ts            # 在线游戏状态（前台，sort / 页码分页）
│       │   ├── onlineGames.ts      # 在线游戏管理状态（后台，含 status 筛选）
│       │   ├── localGames.ts       # 本地游戏状态（publishToServer / uploadToServer）
│       │   └── admin.ts            # 管理员状态 + 站点配置
│       ├── types/
│       │   └── game.ts
│       ├── views/
│       │   ├── HomeView.vue        # 首页（搜索 + 排序 + 页码分页）
│       │   ├── GameView.vue        # 游戏详情 + iframe 沙盒运行
│       │   ├── EditorView.vue      # 游戏编辑器（含资源管理器入口）★ 更新
│       │   ├── LocalGamesView.vue  # 本地游戏（含一键发布到线上）
│       │   ├── AddGameView.vue     # 文件上传
│       │   ├── OnlineGamesView.vue # 在线游戏管理（编辑/下架/删除/预览/资源管理器）★ 更新
│       │   ├── AdminView.vue       # 管理面板（功能开关/统计/接口文档）
│       │   └── NotFoundView.vue    # 404 页面（桜主题，含飘落花瓣动画）
│       ├── App.vue                 # 含：ErrorBoundary + ToastContainer + ConfirmDialog
│       │                           #      + 存储管理面板 + 游戏管理导航入口（登录后显示）
│       ├── main.ts                 # 全局错误处理
│       └── shims-vue.d.ts
├── database/
│   ├── init.sql                    # 建库建表（s_g_games）
│   ├── saves.sql                   # 存档表（s_g_saves）
│   ├── assets.sql                  # 资源管理器表（s_g_assets）★
│   ├── game.sql                    # 内置游戏数据
│   └── settings.sql                # 站点配置表
├── package.json                    # 根目录：一键启动（concurrently）
├── .gitignore
├── LICENSE
├── UPDATE.md
├── version.json
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

```bash
node -v
npm -v
```

### 安装 MySQL

前往 [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/) 下载安装。

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

按顺序执行初始化脚本：

```bash
mysql -u root -p < database/init.sql
mysql -u root -p < database/saves.sql
mysql -u root -p < database/assets.sql
mysql -u root -p < database/game.sql
mysql -u root -p < database/settings.sql
```

> `saves.sql` 创建游戏存档表 `s_g_saves`，如不需要服务端存档可跳过（游戏内置 localStorage 存档仍可用）。
> `assets.sql` 创建资源管理器表 `s_g_assets`，如不需要资源管理器功能可跳过。

### 3. 配置后端环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env`：

```env
PORT=8802
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=sakura_game_site
DB_CONNECTION_LIMIT=10
NODE_ENV=development

ADMIN_PASSWORD=你的管理员密码
ADMIN_TOKEN_SECRET=自定义签名密钥（32位以上随机字符串）
```

> **⚠️ 重要：跨域配置**
>
> `CORS_ORIGINS` 必须与你实际访问的前端地址完全一致，否则浏览器会拦截所有 API 请求。
>
> ```env
> # 本地开发（默认）
> CORS_ORIGINS=http://localhost:8801
>
> # 多个来源用英文逗号分隔
> CORS_ORIGINS=http://localhost:8801,http://192.168.1.100:8801
>
> # 局域网访问（把 192.168.x.x 换成你机器的实际内网 IP）
> CORS_ORIGINS=http://localhost:8801,http://192.168.1.100:8801
>
> # 生产环境（换成实际域名，禁止使用 *）
> CORS_ORIGINS=https://yourdomain.com
> ```
>
> 修改后需要**重启后端**才能生效。  
> 如果出现 `CORS policy` 错误，优先检查这里。

### 4. 挂载资源路由

在 `backend/server.js` 中新增资源路由挂载（放在其他路由之后）：

```js
const assetsRouter = require('./routes/assets')
app.use('/api/assets', assetsRouter)
```

### 5. 安装所有依赖

```bash
cd ..

# 根目录（concurrently + npx）
npm install
npm install -D npx

# 前后端
npm install --prefix frontend
npm install --prefix backend
```

### 6. 一键启动

```bash
npm run dev
```

访问 [http://localhost:8801](http://localhost:8801)，看到以下输出说明启动成功：

```
[后端] 🌸  桜游戏屋 API 运行在 http://localhost:8802
[后端] ✅  MySQL 连接成功
[前端] VITE ready in xxx ms
[前端] ➜  Local:   http://localhost:8801/
```

按 `Ctrl+C` 同时关闭前后端。

### 单独启动（可选）

```bash
npm run dev:frontend   # 仅前端
npm run dev:backend    # 仅后端
```

---

## 页面说明

| 路径            | 页面         | 说明                                                                       |
| --------------- | ------------ | -------------------------------------------------------------------------- |
| `/`             | 首页         | 在线游戏列表，支持搜索、标签筛选、排序、页码分页                           |
| `/game/:id`     | 游戏页       | iframe 沙盒运行游戏，支持全屏                                              |
| `/editor`       | 编辑器       | 本地编写游戏代码 + 实时预览 + 草稿暂存 + 资源管理器（可被管理员关闭）      |
| `/local`        | 本地游戏     | 管理本地保存的游戏，支持游玩/编辑/导出/删除/一键发布到线上                 |
| `/add`          | 上传游戏     | 上传 `.html` / `.vue` / `.ts` 文件，解析后入库（可被管理员关闭）           |
| `/online-games` | 在线游戏管理 | 查看/编辑/下架/删除/预览数据库中全部游戏 + 资源管理器（**需管理员登录**）★ |
| `/admin`        | 管理面板     | 功能开关 + 数据统计 + 接口文档                                             |
| `/*`            | 404 页面     | 未匹配路由的兜底页，提供返回首页/上一页操作                                |

---

## API 文档

### 基础地址

```
http://localhost:8802/api
```

> 登录管理后台后，点击「📋 接口文档」Tab 可查看完整的交互式文档。

### 游戏接口

| 方法   | 路径              | 鉴权  | 说明                                   |
| ------ | ----------------- | :---: | -------------------------------------- |
| GET    | `/games`          |   —   | 游戏列表（分页 + 搜索 + 标签 + 排序）  |
| GET    | `/games/:id`      |   —   | 游戏详情（含 game_code）               |
| POST   | `/games`          |   ✅   | 新增游戏（本地游戏一键发布也走此接口） |
| PUT    | `/games/:id`      |   ✅   | 更新游戏                               |
| DELETE | `/games/:id`      |   ✅   | 下架游戏（软删除）                     |
| POST   | `/games/:id/play` |   —   | 记录游玩次数                           |
| GET    | `/health`         |   —   | 健康检查（含 DB 连接状态）             |

#### 列表查询参数

| 参数   | 类型   | 可选值                         | 说明                                     |
| ------ | ------ | ------------------------------ | ---------------------------------------- |
| search | string | —                              | 关键词（全文搜索 name/description/tags） |
| tags   | string | —                              | 标签精确筛选                             |
| page   | number | —                              | 页码，默认 1                             |
| limit  | number | —                              | 每页数量，默认 12，最大 50               |
| sort   | string | `order` / `newest` / `hottest` | 排序方式，默认 `order`（权重降序）       |

### 存档接口

| 方法   | 路径                   | 鉴权  | 说明                                 |
| ------ | ---------------------- | :---: | ------------------------------------ |
| GET    | `/saves/:gameId`       |   —   | 获取某游戏所有存档槽（不含存档数据） |
| GET    | `/saves/:gameId/:slot` |   —   | 读取单个存档槽（含完整存档数据）     |
| POST   | `/saves/:gameId/:slot` |   —   | 写入/覆盖存档（slot 范围 1~5）       |
| DELETE | `/saves/:gameId/:slot` |   —   | 删除存档                             |

#### 存档接口说明

所有存档接口均需携带 `save_key`（客户端唯一标识），由前端 `src/api/saves.ts` 自动基于浏览器指纹生成，无需手动传入。存档数据以 JSON 字符串存储，单条上限 **500KB**，每款游戏最多 **5** 个槽位。

### 上传接口

| 方法 | 路径           | 鉴权  | 说明                                |
| ---- | -------------- | :---: | ----------------------------------- |
| POST | `/upload/game` |   ✅   | 上传游戏文件（multipart/form-data） |

#### 上传参数

| 字段        | 类型   | 说明                                |
| ----------- | ------ | ----------------------------------- |
| file        | File   | 游戏文件，支持 `.html` `.vue` `.ts` |
| name        | string | 游戏名称（必填）                    |
| description | string | 游戏介绍                            |
| tags        | string | 标签，逗号分隔                      |
| author      | string | 作者                                |
| sort_order  | number | 排序权重                            |

> ⚠️ 上传时**不要**手动设置 `Content-Type`，让浏览器自动生成含 boundary 的 `multipart/form-data` 头，否则服务端 multer 无法解析。

#### 文件解析规则

| 文件类型 | 处理方式                                               |
| -------- | ------------------------------------------------------ |
| `.html`  | 直接存入数据库                                         |
| `.vue`   | 提取 `<template>` `<script>` `<style>` 拼装为完整 HTML |
| `.ts`    | 移除类型注解，包装进 HTML + Canvas 模板                |

### 管理员接口

| 方法   | 路径                      | 鉴权  | 说明                                           |
| ------ | ------------------------- | :---: | ---------------------------------------------- |
| POST   | `/admin/login`            |   —   | 管理员登录，返回 JWT token                     |
| POST   | `/admin/logout`           |   ✅   | 登出（Token 加入黑名单立即失效）               |
| GET    | `/admin/settings`         |   —   | 获取站点配置（公开）                           |
| PUT    | `/admin/settings`         |   ✅   | 更新站点配置                                   |
| GET    | `/admin/games`            |   ✅   | 管理游戏列表（含下架，支持搜索/状态/排序筛选） |
| PUT    | `/admin/games/:id`        |   ✅   | 编辑游戏（名称/描述/标签/作者/权重/代码）      |
| DELETE | `/admin/games/:id`        |   ✅   | 永久删除游戏                                   |
| PUT    | `/admin/games/:id/toggle` |   ✅   | 切换游戏上下架状态                             |
| GET    | `/admin/stats`            |   ✅   | 数据统计（总数/游玩数/排行榜）                 |
| GET    | `/admin/api-list`         |   ✅   | 查看全部接口列表                               |

> 需要 token 的接口须在请求头携带 `x-admin-token: <token>`，有效期 8 小时，登出后立即失效。

#### 管理游戏列表查询参数（`GET /admin/games`）

| 参数   | 类型   | 可选值                         | 说明                     |
| ------ | ------ | ------------------------------ | ------------------------ |
| search | string | —                              | 关键词（名称/描述/标签） |
| status | string | `active` / `inactive` / 不传   | 状态筛选，不传返回全部   |
| sort   | string | `newest` / `hottest` / `order` | 排序方式                 |
| page   | number | —                              | 页码                     |
| limit  | number | —                              | 每页数量                 |

### 资源管理器接口 ★

| 方法   | 路径                   | 鉴权  | 说明                                         |
| ------ | ---------------------- | :---: | -------------------------------------------- |
| GET    | `/assets/quota`        |   —   | 全站资源用量与上限                           |
| GET    | `/assets/game/:gameId` |   —   | 获取游戏可用资源（游戏专属 + 公共资源）      |
| GET    | `/assets`              |   —   | 资源列表（分页 + type / game_id 筛选）       |
| GET    | `/assets/:id`          |   —   | 单个资源详情（含 data_uri，可直接嵌入 HTML） |
| POST   | `/assets`              |   ✅   | 上传资源文件                                 |
| DELETE | `/assets/:id`          |   ✅   | 删除资源                                     |

#### 上传资源参数（`POST /assets`）

| 字段    | 类型   | 说明                                |
| ------- | ------ | ----------------------------------- |
| file    | File   | 资源文件（见支持类型表）            |
| game_id | string | 关联游戏 ID；传 `"null"` = 公共资源 |

#### 支持的文件类型

| 分类 | MIME 类型                                                         |
| ---- | ----------------------------------------------------------------- |
| 图片 | `image/png` `image/jpeg` `image/gif` `image/webp` `image/svg+xml` |
| 音频 | `audio/mpeg` `audio/ogg` `audio/wav` `audio/webm`                 |
| 数据 | `application/json` `text/plain` `text/csv`                        |

#### 资源限制

| 限制项     | 值                           |
| ---------- | ---------------------------- |
| 单文件上限 | **2 MB**                     |
| 全站总容量 | **100 MB**                   |
| 存储方式   | Base64 编码存入 `MEDIUMBLOB` |

---

## 数据库设计

数据库名：`sakura_game_site`，共四张表。

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

### 表 `s_g_saves` — 游戏存档

| 字段       | 类型         | 说明                             |
| ---------- | ------------ | -------------------------------- |
| id         | INT PK AI    | 主键                             |
| game_id    | INT          | 关联游戏 ID                      |
| slot       | TINYINT      | 存档槽位（1~5）                  |
| save_key   | VARCHAR(64)  | 客户端唯一标识（浏览器指纹哈希） |
| save_data  | MEDIUMTEXT   | 存档 JSON 数据（≤500KB）         |
| save_name  | VARCHAR(100) | 存档名称（玩家自定义）           |
| play_time  | INT          | 累计游玩秒数                     |
| created_at | DATETIME     | 创建时间                         |
| updated_at | DATETIME     | 最后更新时间                     |

> 唯一约束：`(game_id, slot, save_key)`，写入时自动 UPSERT。

### 表 `s_g_assets` — 资源管理器 ★

| 字段       | 类型         | 说明                                                |
| ---------- | ------------ | --------------------------------------------------- |
| id         | INT PK AI    | 主键                                                |
| name       | VARCHAR(255) | 文件原始名称                                        |
| type       | VARCHAR(50)  | 分类：`image` / `audio` / `json` / `text` / `other` |
| mime       | VARCHAR(120) | MIME 类型，如 `image/png`                           |
| size       | INT          | 原始文件字节数（未 Base64 前）                      |
| data       | MEDIUMBLOB   | Base64 编码的文件内容（单条上限 16MB）              |
| data_uri   | TEXT VIRTUAL | 虚拟列：`data:<mime>;base64,<data>`（不占实际存储） |
| game_id    | INT NULL     | 关联游戏 ID；`NULL` = 公共资源，所有游戏均可使用    |
| uploader   | VARCHAR(100) | 上传者标识（默认 admin）                            |
| created_at | DATETIME     | 上传时间                                            |

> `data_uri` 是 MySQL **生成列**（`GENERATED ALWAYS ... VIRTUAL`），查询时自动拼接，不占实际存储空间。需要 MySQL ≥ 5.7。

### 表 `s_g_settings` — 站点配置

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

## 本地存储机制

前端使用 `localStorage` 按固定前缀命名空间存储所有本地数据，`App.vue` 提供**存储管理面板**（导航栏 🗄️ 按钮）统一查看和清理。

### 存储键规范

| 键名                   | 来源文件                        | 说明                           |
| ---------------------- | ------------------------------- | ------------------------------ |
| `sakura_local_games`   | `stores/localGames.ts`          | 本地游戏列表（JSON 数组）      |
| `sakura_editor_draft`  | `stores/localGames.ts`          | 编辑器未保存草稿               |
| `sakura_save:<gameId>` | `composables/useGameStorage.ts` | 游戏存档（多槽位，最多 10 个） |
| `sakura_prog:<gameId>` | `composables/useGameStorage.ts` | 游戏进度（最高分/关卡/统计）   |
| `admin_token`          | `api/admin.ts`                  | 管理员登录 Token（登出时清除） |

### 存储管理面板功能

导航栏右侧点击 🗄️ 图标打开，存储使用量超过 75% 时显示红点警告。

| 功能             | 说明                                             |
| ---------------- | ------------------------------------------------ |
| 总览             | 已用 KB / 游戏数 / 存档数 / 容量占比             |
| 清除编辑器草稿   | 删除 `sakura_editor_draft`                       |
| 展开本地游戏列表 | 逐条清除存档或删除整个游戏（含存档和进度）       |
| 清除全部存档     | 删除所有 `sakura_save:*` 键                      |
| 清除全部进度     | 删除所有 `sakura_prog:*` 键                      |
| 一键清除全部     | 删除所有 `sakura_*` 前缀键（保留 `admin_token`） |

---

## 功能特性

### 在线游戏库
- 🔍 **实时搜索** — 防抖关键词搜索 + 标签快捷筛选
- 🔃 **排序切换** — 默认权重 / 最新上架 / 最多游玩
- 📄 **页码分页** — 智能省略号页码，切换自动回顶
- 🎮 **iframe 沙盒** — 游戏代码安全隔离执行
- ⛶ **全屏模式** — 游戏页支持全屏游玩
- 📊 **游玩统计** — 自动记录游玩次数

### 在线游戏管理（`/online-games`）★
- 📋 **完整列表** — 展示全部游戏（含已下架），支持搜索、状态筛选、排序
- ✏️ **行级编辑** — 弹窗编辑名称/描述/标签/作者/封面/权重/游戏代码，保存即时生效
- ⬇⬆ **一键上下架** — 切换 `is_active` 状态，对玩家立即生效
- 🗑 **永久删除** — 二次确认后从数据库彻底删除
- 👁 **弹窗预览** — 在管理界面直接预览游戏运行效果，支持全屏
- 📊 **概览卡片** — 实时显示总计 / 上架中 / 已下架数量
- 🗂 **资源管理器** — 编辑游戏时可调出，上传/插入图片音频等资源到代码
- 🔒 **路由鉴权** — 未登录自动跳转至 `/admin` 登录页，登录后自动重定向回来

### 游戏编辑器
- ✏️ **CodeMirror 6** — 语法高亮（HTML/JS/CSS）、行号、括号匹配、代码折叠
- ↩ **撤销/重做** — `Ctrl+Z` / `Ctrl+Y`
- 🎨 **主题/语言切换** — 暗色 One Dark / 亮色，HTML/JS/CSS 动态切换
- 👁 **实时预览** — 600ms 防抖刷新
- 📐 **布局切换** — 分栏 / 仅编辑 / 仅预览，支持拖拽调比例
- 📦 **草稿暂存** — 3 秒无操作自动写入 localStorage，下次可恢复
- 💾 **本地保存** — `Ctrl+S` 快捷键
- 🗂 **资源管理器** — 工具栏「🗂 资源」按钮调出，使用公共资源库，插入到光标位置 ★

### 资源管理器 ★
- 🗂 **浮层面板** — 编辑器/在线游戏管理均可调出，不离开当前页面
- 🖼️🎵📋 **多类型支持** — 图片（PNG/JPG/GIF/WebP/SVG）、音频（MP3/OGG/WAV）、JSON、文本
- 🔍 **类型筛选** — 快速定位所需资源
- 🌐 **作用域切换** — 当前游戏专属 / 全部公共资源
- 👁 **实时预览** — 图片缩略图、音频播放控件、文本内容预览
- ⬅ **一键插入** — 代码片段精确插入到编辑器光标位置
- 📋 **复制引用** — 快速复制 `<img src="data:...">` 等代码
- 📊 **容量监控** — 实时用量进度条，≥70% 橙色预警，≥90% 红色告警
- 🔒 **写操作鉴权** — 上传/删除需管理员 token

### 本地游戏
- 📋 列表管理 / ▶ 直接游玩 / ✏️ 跳转编辑
- ⬇ **导出 HTML** — 下载为独立可运行文件
- 🚀 **一键发布** — 登录管理员后直接推送到线上游戏库

### 文件上传
- 📤 拖拽上传 + 代码预览（前 30 行）
- 🔄 `.vue` / `.ts` 自动转换为可运行 HTML
- 🛡 **内容安全扫描** — 拦截外链脚本 / eval / fetch / XHR / sendBeacon

### 游戏存档
- 💾 **localStorage 存档** — `useGameStorage.ts` 提供三层存储（存档槽 / 进度 / 设置），最多 10 个槽位
- 🌐 **服务端存档 API** — `/api/saves` 提供 CRUD，支持跨设备（需部署后端）
- 🔑 **客户端标识** — 基于浏览器指纹自动生成 `save_key`
- 🗄️ **存储管理面板** — `App.vue` 内置，可查看用量、分类清理、一键清除

### 管理员模块
- 🔐 JWT 登录（bcrypt 密码验证，8 小时有效）
- 🔒 登录限流（60 秒内最多 10 次）
- 🚪 Token 黑名单（登出立即失效）
- 🎛 功能开关（编辑器/上传）
- 🎮 **在线游戏管理**（独立页面，编辑/上下架/删除/预览）
- 📊 数据统计（总数/游玩数/最热 TOP5/最新入库）
- 📋 接口文档（内置交互式 API 面板）
- 🚫 路由守卫（关闭功能自动重定向；在线游戏管理页未登录自动跳转）

### 安全与稳定
- 🛡 全部写操作需管理员 Token
- 🔑 bcrypt（cost=12）密码哈希
- 🚫 Token 黑名单 + 8 小时自动清理
- 🧹 上传内容安全扫描
- ✅ express-validator 参数校验
- 📝 Winston 日志（请求 + 慢查询 + 管理员操作，5MB 轮转）
- 🔄 数据库自动重连（最多 3 次）
- 🚦 全局限流（300 次/分钟）
- 💥 uncaughtException + unhandledRejection 兜底
- 🏥 `/api/health` 返回 DB 真实连接状态

### 前端工程
- 🧱 ErrorBoundary 错误边界（防白屏）
- 🔔 全局 Toast（替代 alert）
- 💬 全局 ConfirmDialog（替代 confirm）
- 🌐 全局错误监听（errorHandler + unhandledrejection + window.error）
- 🔗 404 兜底路由（NotFoundView，桜主题 + 飘落花瓣动画）
- 📱 响应式设计
- 🌸 桜主题 + 动态页面 Title

---

## 日志

```
backend/logs/
├── combined.log   # 所有请求 + 管理员操作
└── error.log      # 仅错误级别
```

单文件上限 **5MB**，自动滚动，最多保留 **5** 份。

---

## 常见问题

| 问题                                | 原因                        | 解决                                                                          |
| ----------------------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `Cannot find module 'express'`      | 未安装依赖                  | `npm install --prefix backend`                                                |
| `Cannot find module 'bcryptjs'`     | 缺少 bcryptjs               | `cd backend && npm install bcryptjs`                                          |
| `MySQL 连接失败`                    | 密码或库名错误              | 检查 `.env`                                                                   |
| `EADDRINUSE`                        | 端口被占用                  | 修改 `.env` 中的端口号                                                        |
| 前端空白无内容                      | 后端未启动                  | 先启动后端再刷新前端                                                          |
| **API 请求被 CORS 拦截**            | **`CORS_ORIGINS` 配置错误** | **检查 `.env` 中 `CORS_ORIGINS` 是否与实际前端地址完全一致，修改后重启后端**  |
| 上传文件报 413                      | 文件超过限制                | 游戏文件需小于 10MB；资源文件需小于 2MB                                       |
| 上传文件报「包含不允许的内容」      | 安全扫描拦截                | 检查文件是否含外链脚本/eval/fetch，改用自包含代码                             |
| 发布/上传报「未授权，请重新登录」   | 未使用带 token 的实例       | 确认 `games.ts` 中 `publishGame` 和 `uploadGame` 使用 `authHttp` 而非 `http`  |
| 上传文件服务端解析失败              | Content-Type 设置错误       | 删除手动设置的 `Content-Type: multipart/form-data`，让浏览器自动补全 boundary |
| 管理员登录提示密码错误              | `.env` 未读取到             | 检查 `.env` 是否存在，`injecting env (0)` 表示文件为空                        |
| 管理员登录提示密码错误              | 密码混淆                    | 登录密码是 `ADMIN_PASSWORD`，不是 `ADMIN_TOKEN_SECRET`                        |
| 登出后 Token 仍可使用               | 重启清空内存黑名单          | 重启后黑名单归零；生产环境建议接入 Redis 持久化                               |
| `/api/health` 返回 503              | DB 连接断开                 | 检查 MySQL 服务是否运行，查看 `backend/logs/error.log`                        |
| 存档读取返回 404                    | save_key 不匹配             | 浏览器指纹变化（更换设备/隐身模式）会导致 save_key 变化                       |
| 功能开关保存后前端未生效            | 缓存未刷新                  | 刷新页面，settings 会在启动时重新拉取                                         |
| 编辑器无法输入内容                  | ref 绑定失败                | 确认 `useCodeMirror` 返回值已解构，模板中使用顶层变量名绑定 ref               |
| `npm run dev` 报找不到 concurrently | 根目录依赖未装              | 在根目录执行 `npm install && npm install -D npx`                              |
| 首页分页不显示 / 排序无效           | store 结构不匹配            | 确认 `stores/games.ts` 中 `pagination` 含 `page` 和 `pages` 字段              |
| 404 页面未生效                      | 路由顺序错误                | 确认 `router/index.ts` 中 `/:pathMatch(.*)*` 路由放在最后                     |
| 游戏管理页报「未授权，请重新登录」  | 未登录或 token 失效         | 前往 `/admin` 重新登录，登录后导航栏出现「🎮 游戏管理」入口                    |
| 游戏管理页访问被重定向到 `/admin`   | 路由鉴权生效                | 正常行为，登录后 redirect 参数会自动跳回原页面                                |
| 游戏管理页编辑后保存失败            | token 已过期（8小时）       | 前往 `/admin` 重新登录                                                        |
| 游戏管理页「状态」筛选无效          | 后端不支持 status 参数      | 确认 `routes/admin.js` 的 `GET /games` 处理了 `status` 查询参数               |
| 编辑弹窗代码显示 0B                 | 列表接口不含 game_code      | 已修复：点击编辑时异步拉取详情接口获取完整 game_code                          |
| 资源上传报「资源库已满」            | 全站超过 100MB 上限         | 删除不再使用的旧资源后重试                                                    |
| 资源上传报「不支持的文件类型」      | MIME 不在白名单             | 见 API 文档「支持的文件类型」表                                               |
| 资源插入后游戏加载变慢              | Base64 图片体积较大         | 建议图片 512×512 以内，文件 ≤ 200KB                                           |
| 编辑器资源管理器只显示公共资源      | 正常行为                    | 编辑器中尚无 gameId，固定使用公共资源库；在线游戏管理编辑时可见专属资源       |
| `assets.sql` 执行报虚拟列语法错误   | MySQL 版本过低              | 升级至 MySQL ≥ 5.7，或移除 `data_uri` 虚拟列，改为应用层拼接 data URI         |
| 存储面板数据不刷新                  | 未调用 refresh              | 关闭后重新打开面板，每次打开时自动刷新                                        |

---

## License

[MIT](./LICENSE) © 2026 Sakura Games Site Contributors