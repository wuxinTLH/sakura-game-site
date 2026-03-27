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
│   │   ├── assets.js             # 资源管理器 CRUD（图片/音频/JSON，需鉴权写操作）
│   │   ├── tags.js               # 标签枚举接口（GET /api/tags，聚合去重 + 末尾「其他」）★ 新增
│   │   ├── export.js             # 数据导出接口（JSON / CSV / 完整备份，需鉴权）★ 新增
│   │   └── admin.js              # 管理员登录/登出 + 站点配置 + 游戏管理 + 统计 + 接口文档
│   ├── watchdog/
│   │   └── engine.js             # 安全监控（封禁列表、请求计数、异常检测）
│   ├── logs/
│   │   └── .gitkeep
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── server.js                 # Express 入口（路由挂载 + 限流 + WatchDog + 健康检查）
├── frontend/
│   └── src/
│       ├── api/
│       │   ├── games.ts          # 游戏接口（含 authHttp 鉴权实例 / publishGame / uploadGame）
│       │   ├── admin.ts          # 管理员接口（token 拦截器 / stats / adminGetGames）
│       │   ├── saves.ts          # 存档接口（getSaveSlots / loadSave / writeSave / deleteSave）
│       │   ├── assets.ts         # 资源管理器接口（上传/列表/详情/删除/配额）
│       │   ├── tags.ts           # 标签枚举接口（fetchTags）★ 新增
│       │   └── export.ts         # 数据导出接口（exportGamesJson / Csv / Backup）★ 新增
│       ├── assets/
│       │   └── main.css
│       ├── components/
│       │   ├── GameCard.vue      # 游戏卡片（含默认桜主题 SVG 封面）★ 更新
│       │   ├── SearchBar.vue
│       │   ├── ToastContainer.vue
│       │   ├── ErrorBoundary.vue
│       │   ├── ConfirmDialog.vue
│       │   └── AssetManager.vue  # 资源管理器浮层（双模式：本地 / 云端）
│       ├── composables/
│       │   ├── useCodeMirror.ts
│       │   ├── useGameStorage.ts # 本地游戏存档/进度/设置（localStorage，3 层存储）
│       │   ├── useGameCache.ts   # 离线游戏代码本地缓存（30 天自动过期）★ 新增
│       │   ├── useToast.ts
│       │   └── useConfirm.ts
│       ├── router/
│       │   └── index.ts          # 含 404 兜底路由 + 功能开关守卫 + 管理员鉴权守卫
│       ├── stores/
│       │   ├── games.ts          # 在线游戏状态（前台，sort / 页码分页）
│       │   ├── onlineGames.ts    # 在线游戏管理状态（后台，含 status 筛选）
│       │   ├── localGames.ts     # 本地游戏状态（publishToServer / uploadToServer）
│       │   └── admin.ts          # 管理员状态 + 站点配置
│       ├── types/
│       │   └── game.ts
│       ├── views/
│       │   ├── HomeView.vue         # 首页（搜索 + 动态标签筛选 + 排序 + 页码分页）★ 更新
│       │   ├── GameView.vue         # 游戏详情（iframe 沙盒 + 离线缓存加速 + 默认封面）★ 更新
│       │   ├── EditorView.vue       # 游戏编辑器（含资源管理器入口）
│       │   ├── LocalGamesView.vue
│       │   ├── AddGameView.vue
│       │   ├── OnlineGamesView.vue  # 在线游戏管理（批量操作 + 封面上传 + 标签枚举 + 数据导出）★ 更新
│       │   ├── AdminView.vue        # 管理面板（功能开关/统计/素材管理/接口文档）★ 更新
│       │   ├── AdminAssetsView.vue  # 素材管理页（嵌入 AdminView 的 assets Tab）
│       │   └── NotFoundView.vue
│       ├── App.vue               # ErrorBoundary + Toast + ConfirmDialog + 存储管理面板
│       ├── main.ts
│       └── shims-vue.d.ts
├── database/
│   ├── init.sql                  # 建库建表（s_g_games）
│   ├── saves.sql                 # 存档表（s_g_saves）
│   ├── assets.sql                # 资源管理器表（s_g_assets）
│   ├── game.sql                  # 内置游戏数据
│   └── settings.sql              # 站点配置表
├── package.json                  # 根目录：一键启动（concurrently）
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

> `saves.sql` 创建游戏存档表 `s_g_saves`，如不需要服务端存档可跳过。
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
> # 生产环境（换成实际域名，禁止使用 *）
> CORS_ORIGINS=https://yourdomain.com
> ```
>
> 修改后需要**重启后端**才能生效。如果出现 `CORS policy` 错误，优先检查这里。

### 4. 确认路由挂载

`backend/server.js` 的路由挂载区应包含以下全部条目（均须在 `const app = express()` **之后**）：

```js
app.use('/api/games',   gamesRouter)
app.use('/api/upload',  uploadRouter)
app.use('/api/admin/login', loginLimiter)
app.use('/api/admin',   adminRouter)
app.use('/api/saves',   savesRouter)
app.use('/api/assets',  assetsRouter)
app.use('/api/tags',    tagsRouter)    // ★ 标签枚举
app.use('/api/export',  exportRouter)  // ★ 数据导出
```

### 5. 安装所有依赖

```bash
cd ..

# 根目录
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

| 路径            | 页面         | 说明                                                                                     |
| --------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `/`             | 首页         | 在线游戏列表，搜索 + **动态标签筛选** + 排序 + 页码分页 ★                               |
| `/game/:id`     | 游戏页       | iframe 沙盒运行游戏，全屏模式，**离线游戏自动缓存加速** ★                               |
| `/editor`       | 编辑器       | 本地编写游戏代码 + 实时预览 + 草稿暂存 + 资源管理器（可被管理员关闭）                    |
| `/local`        | 本地游戏     | 管理本地保存的游戏，支持游玩/编辑/导出/删除/一键发布到线上                               |
| `/add`          | 上传游戏     | 上传 `.html` / `.vue` / `.ts` 文件，解析后入库（可被管理员关闭）                         |
| `/online-games` | 在线游戏管理 | **批量操作** + **封面图上传** + **标签枚举** + **数据导出** + 编辑/预览（需管理员登录）★ |
| `/admin`        | 管理面板     | 功能开关 + 游戏管理 + 数据统计 + **素材管理** + 接口文档 ★                              |
| `/*`            | 404 页面     | 桜主题兜底页，提供返回首页/上一页操作                                                    |

---

## API 文档

### 基础地址

```
http://localhost:8802/api
```

> 登录管理后台后，点击「📋 接口文档」Tab 可查看完整的内嵌交互式文档（前端硬编码，离线可用）。

### 🏥 健康检查

| 方法 | 路径      | 鉴权 | 说明                                         |
| ---- | --------- | :--: | -------------------------------------------- |
| GET  | `/health` |  —   | 服务健康检查，返回 DB 实际连接状态及运行时间 |

### 🎮 游戏接口

| 方法   | 路径              | 鉴权 | 说明                                   |
| ------ | ----------------- | :--: | -------------------------------------- |
| GET    | `/games`          |  —   | 游戏列表（分页 + 搜索 + 标签 + 排序）  |
| GET    | `/games/:id`      |  —   | 游戏详情（含完整 game_code）           |
| POST   | `/games`          |  ✅  | 新增游戏                               |
| PUT    | `/games/:id`      |  ✅  | 更新游戏（字段全可选）                 |
| DELETE | `/games/:id`      |  ✅  | 下架游戏（软删除，is_active=0）        |
| POST   | `/games/:id/play` |  —   | 记录游玩次数（play_count + 1）         |

#### 列表查询参数

| 参数   | 类型   | 可选值                         | 说明                                     |
| ------ | ------ | ------------------------------ | ---------------------------------------- |
| search | string | —                              | 关键词（全文搜索 name/description/tags） |
| tags   | string | —                              | 标签精确筛选                             |
| page   | number | —                              | 页码，默认 1                             |
| limit  | number | —                              | 每页数量，默认 12，最大 50               |
| sort   | string | `order` / `newest` / `hottest` | 排序方式，默认 `order`（权重降序）       |

### 🏷 标签枚举接口 ★ 新增

| 方法 | 路径    | 鉴权 | 说明                                                     |
| ---- | ------- | :--: | -------------------------------------------------------- |
| GET  | `/tags` |  —   | 聚合数据库所有上架游戏标签（去重排序），末尾追加「其他」 |

**响应示例：**

```json
{
  "success": true,
  "data": ["动作", "益智", "休闲", "策略", "其他"]
}
```

### ⬇ 数据导出接口 ★ 新增

所有导出接口均需在请求头携带 `x-admin-token`。

| 方法 | 路径                   | 鉴权 | 说明                                    |
| ---- | ---------------------- | :--: | --------------------------------------- |
| GET  | `/export/games/json`   |  ✅  | 导出游戏元数据 JSON（不含 game_code）   |
| GET  | `/export/games/csv`    |  ✅  | 导出游戏元数据 CSV（Excel 可直接打开）  |
| GET  | `/export/games/backup` |  ✅  | 完整备份 JSON（含 game_code，用于迁移） |

> 导出文件名自动包含时间戳，例如 `sakura_games_20260327_120000.json`。
> CSV 含 UTF-8 BOM，可在中文 Windows Excel 中正确显示。

### 💾 存档接口

| 方法   | 路径                   | 鉴权 | 说明                                 |
| ------ | ---------------------- | :--: | ------------------------------------ |
| GET    | `/saves/:gameId`       |  —   | 获取某游戏所有存档槽（不含存档数据） |
| GET    | `/saves/:gameId/:slot` |  —   | 读取单个存档槽（含完整 save_data）   |
| POST   | `/saves/:gameId/:slot` |  —   | 写入/覆盖存档（slot 范围 1~5）       |
| DELETE | `/saves/:gameId/:slot` |  —   | 删除存档                             |

所有存档接口均需携带 `save_key`（由前端 `src/api/saves.ts` 基于浏览器指纹自动生成）。存档数据上限 **500KB**，每款游戏最多 **5** 个槽位。

### 📤 上传接口

| 方法 | 路径           | 鉴权 | 说明                                |
| ---- | -------------- | :--: | ----------------------------------- |
| POST | `/upload/game` |  ✅  | 上传游戏文件（multipart/form-data） |

| 字段        | 说明                                         |
| ----------- | -------------------------------------------- |
| file        | 游戏文件，支持 `.html` `.vue` `.ts`，≤ 10MB  |
| name        | 游戏名称（必填）                             |
| description | 游戏介绍                                     |
| tags        | 标签，逗号分隔                               |
| author      | 作者                                         |
| sort_order  | 排序权重                                     |

> ⚠️ 上传时**不要**手动设置 `Content-Type`，让浏览器自动生成含 boundary 的 `multipart/form-data` 头。

### 🗂 资源管理器接口

| 方法   | 路径                   | 鉴权 | 说明                                                    |
| ------ | ---------------------- | :--: | ------------------------------------------------------- |
| GET    | `/assets/quota`        |  —   | 全站云端资源用量与上限（used/limit/pct）                |
| GET    | `/assets/game/:gameId` |  —   | 获取游戏可用资源（游戏专属 + 公共资源）                 |
| GET    | `/assets`              |  —   | 资源列表（分页，不含 data 字段）                        |
| GET    | `/assets/:id`          |  —   | 单个资源详情（含 data_uri，可直接嵌入 HTML）            |
| POST   | `/assets`              |  ✅  | 上传资源文件（multipart，≤ 2MB，见支持的 MIME 类型）   |
| DELETE | `/assets/:id`          |  ✅  | 删除资源（不会自动移除已嵌入游戏代码的引用）            |

**上传参数：** `file`（资源文件）、`game_id`（关联游戏 ID，传 `"null"` = 公共资源）

**支持的文件类型：**

| 分类 | MIME 类型                                                          |
| ---- | ------------------------------------------------------------------ |
| 图片 | `image/png` `image/jpeg` `image/gif` `image/webp` `image/svg+xml` |
| 音频 | `audio/mpeg` `audio/ogg` `audio/wav` `audio/webm`                 |
| 数据 | `application/json` `text/plain` `text/csv`                        |

| 限制项     | 值                           |
| ---------- | ---------------------------- |
| 单文件上限 | **2 MB**                     |
| 全站总容量 | **100 MB**                   |
| 存储方式   | Base64 编码存入 `MEDIUMBLOB` |

### 🔐 管理员接口

| 方法   | 路径                      | 鉴权 | 说明                                              |
| ------ | ------------------------- | :--: | ------------------------------------------------- |
| POST   | `/admin/login`            |  —   | 管理员登录，返回 JWT token（有效期 8 小时）       |
| POST   | `/admin/logout`           |  ✅  | 登出（token 加入黑名单立即失效）                  |
| GET    | `/admin/settings`         |  —   | 获取站点配置（公开）                              |
| PUT    | `/admin/settings`         |  ✅  | 更新站点配置                                      |
| GET    | `/admin/games`            |  ✅  | 管理游戏列表（含下架，支持搜索/状态/排序筛选）    |
| PUT    | `/admin/games/:id`        |  ✅  | 编辑游戏（名称/描述/标签/作者/封面/权重/代码）    |
| DELETE | `/admin/games/:id`        |  ✅  | 永久删除游戏（不可恢复）                          |
| PUT    | `/admin/games/:id/toggle` |  ✅  | 切换游戏上下架（is_active 取反）                  |
| GET    | `/admin/stats`            |  ✅  | 数据统计（总数/游玩数/最热 TOP5/最新入库）        |
| GET    | `/admin/api-list`         |  ✅  | 查看全部接口列表                                  |

> 需要 token 的接口须在请求头携带 `x-admin-token: <token>`，有效期 8 小时，登出后立即失效。

---

## 数据库设计

数据库名：`sakura_game_site`，共四张表。

### 表 `s_g_games` — 游戏列表

| 字段        | 类型          | 说明                             |
| ----------- | ------------- | -------------------------------- |
| id          | INT PK AI     | 主键                             |
| name        | VARCHAR(255)  | 游戏名称                         |
| description | TEXT          | 游戏介绍                         |
| image_url   | VARCHAR(1000) | 封面图（URL 或 base64 Data URI） |
| game_code   | LONGTEXT      | 游戏完整 HTML 代码               |
| game_type   | VARCHAR(50)   | html / canvas                    |
| tags        | VARCHAR(500)  | 标签，逗号分隔                   |
| author      | VARCHAR(100)  | 作者                             |
| play_count  | INT           | 游玩次数                         |
| is_active   | TINYINT(1)    | 1=上架 0=下架                    |
| sort_order  | INT           | 排序权重（降序）                 |
| created_at  | DATETIME      | 创建时间                         |
| updated_at  | DATETIME      | 更新时间                         |

### 表 `s_g_saves` — 游戏存档

| 字段       | 类型         | 说明                             |
| ---------- | ------------ | -------------------------------- |
| id         | INT PK AI    | 主键                             |
| game_id    | INT          | 关联游戏 ID                      |
| slot       | TINYINT      | 存档槽位（1~5）                  |
| save_key   | VARCHAR(64)  | 客户端唯一标识（浏览器指纹哈希） |
| save_data  | MEDIUMTEXT   | 存档 JSON 数据（≤ 500KB）        |
| save_name  | VARCHAR(100) | 存档名称（玩家自定义）           |
| play_time  | INT          | 累计游玩秒数                     |
| created_at | DATETIME     | 创建时间                         |
| updated_at | DATETIME     | 最后更新时间                     |

> 唯一约束：`(game_id, slot, save_key)`，写入时自动 UPSERT。

### 表 `s_g_assets` — 资源管理器

| 字段       | 类型         | 说明                                                |
| ---------- | ------------ | --------------------------------------------------- |
| id         | INT PK AI    | 主键                                                |
| name       | VARCHAR(255) | 文件原始名称                                        |
| type       | VARCHAR(50)  | 分类：`image` / `audio` / `json` / `text` / `other` |
| mime       | VARCHAR(120) | MIME 类型，如 `image/png`                           |
| size       | INT          | 原始文件字节数（未 Base64 前）                      |
| data       | MEDIUMBLOB   | Base64 编码的文件内容                               |
| data_uri   | TEXT VIRTUAL | 虚拟列：`data:<mime>;base64,<data>`（不占实际存储） |
| game_id    | INT NULL     | 关联游戏 ID；`NULL` = 公共资源                      |
| uploader   | VARCHAR(100) | 上传者标识（默认 admin）                            |
| created_at | DATETIME     | 上传时间                                            |

> `data_uri` 是 MySQL **生成列**（`GENERATED ALWAYS ... VIRTUAL`），需要 MySQL ≥ 5.7。

### 表 `s_g_settings` — 站点配置

| 字段       | 类型            | 说明                         |
| ---------- | --------------- | ---------------------------- |
| key        | VARCHAR(100) PK | 配置键                       |
| value      | VARCHAR(500)    | 配置值（`1`=开启，`0`=关闭） |
| updated_at | DATETIME        | 最后更新时间                 |

| key              | 默认值 | 说明               |
| ---------------- | ------ | ------------------ |
| `editor_enabled` | `1`    | 游戏编辑器功能开关 |
| `upload_enabled` | `1`    | 游戏上传功能开关   |

---

## 本地存储机制

前端使用 `localStorage` 按固定前缀命名空间存储所有本地数据，`App.vue` 提供**存储管理面板**（导航栏 🗄️ 按钮）统一查看和清理。

### 存储键规范

| 键名                         | 来源文件                        | 说明                               |
| ---------------------------- | ------------------------------- | ---------------------------------- |
| `sakura_local_games`         | `stores/localGames.ts`          | 本地游戏列表（JSON 数组）          |
| `sakura_editor_draft`        | `stores/localGames.ts`          | 编辑器未保存草稿                   |
| `sakura_save:<gameId>`       | `composables/useGameStorage.ts` | 游戏存档（多槽位，最多 10 个）     |
| `sakura_prog:<gameId>`       | `composables/useGameStorage.ts` | 游戏进度（最高分/关卡/统计）       |
| `sakura_game_cache:<gameId>` | `composables/useGameCache.ts`   | 离线游戏代码缓存（30 天自动过期）★ |
| `admin_token`                | `api/admin.ts`                  | 管理员登录 Token（登出时清除）     |

### 存储管理面板功能

| 功能             | 说明                                             |
| ---------------- | ------------------------------------------------ |
| 总览             | 已用 KB / 游戏数 / 存档数 / 容量占比             |
| 清除编辑器草稿   | 删除 `sakura_editor_draft`                       |
| 展开本地游戏列表 | 逐条清除存档或删除整个游戏（含存档和进度）       |
| 清除全部存档     | 删除所有 `sakura_save:*` 键                      |
| 清除全部进度     | 删除所有 `sakura_prog:*` 键                      |
| 清除游戏缓存 ★   | 删除所有 `sakura_game_cache:*` 键                |
| 一键清除全部     | 删除所有 `sakura_*` 前缀键（保留 `admin_token`） |

---

## 功能特性

### 在线游戏库

- 🔍 **实时搜索** — 防抖关键词搜索
- 🏷 **动态标签筛选** — 从 `/api/tags` 实时聚合枚举标签，末尾含「其他」★
- 🔃 **排序切换** — 默认权重 / 最新上架 / 最多游玩
- 📄 **页码分页** — 智能省略号页码，切换自动回顶
- 🎮 **iframe 沙盒** — 游戏代码安全隔离执行
- ⛶ **全屏模式** — 游戏页支持全屏游玩，ESC 退出
- ⚡ **离线游戏缓存** — 首次加载后写入 localStorage，再次打开秒开，游戏更新后自动失效，30 天自动过期 ★

### 在线游戏管理（`/online-games`）

- 📋 **完整列表** — 展示全部游戏（含已下架），支持搜索、状态筛选、排序
- ☑️ **批量操作** — 勾选多个游戏后批量上架 / 下架 / 删除 ★
- 🖼 **封面图上传** — 编辑时可上传图片（FileReader → base64），或直接粘贴 URL；无封面时显示默认桜 SVG ★
- 🏷 **标签枚举选择** — 编辑时从数据库动态枚举标签多选，支持手动追加自定义标签 ★
- ⬇ **数据导出** — 元数据 JSON / CSV（Excel 可直接打开）/ 完整备份（含 game_code）★
- ✏️ **行级编辑** — 弹窗编辑名称/描述/标签/作者/封面/权重/代码
- ⬇⬆ **一键上下架** — 切换 `is_active` 状态，对玩家立即生效
- 🗑 **永久删除** — 二次确认后从数据库彻底删除
- 👁 **弹窗预览** — 直接预览游戏运行效果，支持全屏
- 🗂 **资源管理器** — 编辑游戏时可调出，上传/插入资源到代码
- 🔒 **路由鉴权** — 未登录自动跳转至 `/admin`，登录后自动重定向回来

### 管理面板（`/admin`）

- 🎛 **功能开关** — 编辑器 / 上传功能的全局开关
- 🎮 **游戏管理** — 内联编辑名称/标签/作者/权重，一键上下架/删除
- 📊 **数据统计** — 总数/游玩数/最热 TOP5/最新入库
- 🗂 **素材管理** — 内嵌 AdminAssetsView，无需跳转页面 ★
- 📋 **接口文档** — 前端硬编码，覆盖全部接口，离线可查 ★

### 游戏编辑器

- ✏️ **CodeMirror 6** — 语法高亮（HTML/JS/CSS）、行号、括号匹配、代码折叠
- ↩ **撤销/重做** — `Ctrl+Z` / `Ctrl+Y`
- 👁 **实时预览** — 600ms 防抖刷新
- 📐 **布局切换** — 分栏 / 仅编辑 / 仅预览，支持拖拽调比例
- 📦 **草稿暂存** — 3 秒无操作自动写入 localStorage
- 💾 **本地保存** — `Ctrl+S` 快捷键
- 🗂 **资源管理器** — 工具栏调出，插入资源到光标位置

### 资源管理器

- 🗂 **双模式** — 本地模式（localStorage，无需登录）/ 云端模式（数据库，需管理员 token）
- 🖼️🎵📋 **多类型支持** — 图片、音频、JSON、文本
- 🔍 **类型筛选** / 🌐 **作用域切换** — 游戏专属 / 全部公共
- ⬅ **一键插入** — 代码片段精确插入到编辑器光标位置
- 📊 **容量监控** — ≥ 70% 橙色预警，≥ 90% 红色告警

### 安全与稳定

- 🛡 全部写操作需管理员 Token
- 🔑 bcrypt（cost=12）密码哈希
- 🚫 Token 黑名单 + 8 小时自动清理
- 🐕 WatchDog 安全监控（封禁列表 + 请求计数 + 异常检测）
- 🧹 上传内容安全扫描（拦截外链脚本 / eval / fetch / XHR）
- ✅ express-validator 参数校验
- 📝 Winston 日志（5MB 轮转，最多 5 份）
- 🔄 数据库自动重连（最多 3 次）
- 🚦 全局限流（300 次/分钟）+ 登录限流（60 秒内最多 10 次）
- 💥 uncaughtException + unhandledRejection 兜底
- 🏥 `/api/health` 返回 DB 真实连接状态

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

| 问题                                                         | 原因                              | 解决                                                                                                         |
| ------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Cannot find module 'express'`                               | 未安装依赖                        | `npm install --prefix backend`                                                                               |
| `Cannot find module 'bcryptjs'`                              | 缺少 bcryptjs                     | `cd backend && npm install bcryptjs`                                                                         |
| `MySQL 连接失败`                                             | 密码或库名错误                    | 检查 `.env`                                                                                                  |
| `EADDRINUSE`                                                 | 端口被占用                        | 修改 `.env` 中的端口号                                                                                       |
| `ReferenceError: Cannot access 'app' before initialization`  | 路由挂载放在 `app = express()` 前 | 将所有 `app.use(...)` 移动到 `const app = express()` 之后                                                    |
| 前端空白无内容                                               | 后端未启动                        | 先启动后端再刷新前端                                                                                         |
| **API 请求被 CORS 拦截**                                     | **`CORS_ORIGINS` 配置错误**       | **检查 `.env` 中 `CORS_ORIGINS` 是否与实际前端地址完全一致，修改后重启后端**                                 |
| 首页标签筛选为空                                             | `/api/tags` 路由未挂载            | 确认 `server.js` 已挂载 `tagsRouter`，且位于 `const app = express()` 之后                                   |
| 导出按钮报「未授权」                                         | Token 未携带或已过期              | 前往 `/admin` 重新登录                                                                                       |
| 导出 CSV 中文乱码                                            | Excel 未识别 UTF-8 BOM            | 文件已含 BOM，双击 Excel 打开即可；或通过「数据→从文本」导入                                                 |
| 游戏页不显示缓存标识                                         | 游戏类型非 html                   | 缓存仅对 `game_type=html` 的离线游戏生效                                                                     |
| 游戏更新后仍加载旧版本                                       | 缓存版本未失效                    | 正常情况不会出现（以 `updated_at` 作版本号控制）；如有异常可在存储管理面板手动清除游戏缓存                   |
| 封面图上传后不显示                                           | 图片过大或格式不支持              | 建议 ≤ 500KB，格式 PNG/JPG/GIF/WebP                                                                          |
| `<tr> cannot be child of <table>` 警告                       | `<table>` 缺少 `<tbody>`          | 用最新版 `AssetManager.vue` 替换，已添加 `<tbody>` 包裹                                                      |
| 上传文件报 413                                               | 文件超过限制                      | 游戏文件需 ≤ 10MB；资源文件需 ≤ 2MB                                                                          |
| 上传文件报「包含不允许的内容」                               | 安全扫描拦截                      | 检查文件是否含外链脚本/eval/fetch，改用自包含代码                                                            |
| 发布/上传报「未授权，请重新登录」                            | 未使用带 token 的实例             | 确认 `games.ts` 中 `publishGame` 和 `uploadGame` 使用 `authHttp` 而非 `http`                                 |
| 管理员登录提示密码错误                                       | `.env` 未读取到                   | 检查 `.env` 是否存在，`injecting env (0)` 表示文件为空                                                       |
| 管理员登录提示密码错误                                       | 密码混淆                          | 登录密码是 `ADMIN_PASSWORD`，不是 `ADMIN_TOKEN_SECRET`                                                       |
| 登出后 Token 仍可使用                                        | 重启清空内存黑名单                | 重启后黑名单归零；生产环境建议接入 Redis 持久化                                                              |
| `/api/health` 返回 503                                       | DB 连接断开                       | 检查 MySQL 服务是否运行，查看 `backend/logs/error.log`                                                       |
| 存档读取返回 404                                             | save_key 不匹配                   | 浏览器指纹变化（更换设备/隐身模式）会导致 save_key 变化                                                      |
| 功能开关保存后前端未生效                                     | 缓存未刷新                        | 刷新页面，settings 会在启动时重新拉取                                                                        |
| `npm run dev` 报找不到 concurrently                          | 根目录依赖未安装                  | 在根目录执行 `npm install && npm install -D npx`                                                             |
| 首页分页不显示 / 排序无效                                    | store 结构不匹配                  | 确认 `stores/games.ts` 中 `pagination` 含 `totalPages` 字段                                                  |
| 游戏管理页报「未授权，请重新登录」                           | 未登录或 token 失效               | 前往 `/admin` 重新登录，登录后导航栏出现「🎮 游戏管理」入口                                                   |
| 游戏管理页访问被重定向到 `/admin`                            | 路由鉴权生效                      | 正常行为，登录后 redirect 参数会自动跳回原页面                                                               |
| 资源上传报「资源库已满」                                     | 全站超过 100MB 上限               | 删除不再使用的旧资源后重试                                                                                   |
| `assets.sql` 执行报虚拟列语法错误                            | MySQL 版本过低                    | 升级至 MySQL ≥ 5.7，或移除 `data_uri` 虚拟列，改为应用层拼接 data URI                                        |

---

## License

[MIT](./LICENSE) © 2026 Sakura Games Site Contributors