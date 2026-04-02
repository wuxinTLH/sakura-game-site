# 🌸 桜游戏屋 (Sakura Games Site)

> 一个精美的在线小游戏合集网站，支持游戏列表展示、搜索、在线游玩。
> 本项目 95%+ 由 AI（Claude Sonnet 4.6+）生成

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](./LICENSE)

---

## 技术栈

| 层     | 技术                                                              |
| ------ | ----------------------------------------------------------------- |
| 前端   | Vue 3 + TypeScript + Vite + Pinia + Vue Router + **idb（IndexedDB）** |
| 后端   | Node.js + Express + mysql2 + multer + **esbuild**                 |
| 数据库 | MySQL 8.x                                                         |
| 本地存储 | **IndexedDB**（idb 库，替代原 localStorage，突破 5MB 限制）      |

---

## 项目结构

```
sakura-games-site/
├── backend/
│   ├── config/
│   │   └── database.js           # MySQL 连接池 + acquireTimeout + 慢查询日志（阈值500ms）
│   ├── middleware/
│   │   ├── auth.js               # JWT + bcrypt 密码哈希 + Token 黑名单
│   │   ├── validate.js           # 统一参数校验（express-validator）
│   │   └── logger.js             # Winston 日志中间件
│   ├── routes/
│   │   ├── games.js              # 游戏 CRUD + 搜索 + 排序（列表不含 game_code）
│   │   ├── upload.js             # 文件上传 + magic bytes 校验 + esbuild 编译 .ts ★
│   │   ├── saves.js              # 游戏存档 CRUD（公开，以 save_key 标识客户端）
│   │   ├── assets.js             # 资源管理器 CRUD（图片/音频/JSON，需鉴权写操作）
│   │   ├── tags.js               # 标签枚举接口（聚合去重 + 末尾「其他」）
│   │   ├── export.js             # 数据导出接口（JSON / CSV / 完整备份，需鉴权）
│   │   └── admin.js              # 管理员登录/登出 + 站点配置 + 游戏管理 + 统计（含趋势+标签分布）★
│   ├── watchdog/
│   │   └── engine.js             # 安全监控（封禁列表、请求计数、异常检测）
│   ├── logs/
│   │   └── .gitkeep
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   └── src/
│       ├── api/
│       │   ├── games.ts          # 游戏接口（含 authHttp / publishGame / uploadGame）
│       │   ├── admin.ts          # 管理员接口（token 拦截器 + 401 token-expired 事件）★
│       │   ├── saves.ts          # 存档接口（getSave 别名已修复）★
│       │   ├── assets.ts         # 资源管理器接口
│       │   ├── tags.ts           # 标签枚举接口
│       │   └── export.ts         # 数据导出接口
│       ├── components/
│       │   ├── GameCard.vue      # 游戏卡片（含默认桜主题 SVG 封面）
│       │   ├── SearchBar.vue
│       │   ├── ToastContainer.vue
│       │   ├── ErrorBoundary.vue
│       │   ├── ConfirmDialog.vue
│       │   └── AssetManager.vue  # 资源管理器浮层（双模式：本地 / 云端）
│       ├── composables/
│       │   ├── useCodeMirror.ts
│       │   ├── useGameStorage.ts # 游戏存档/进度/配置（IndexedDB，替代 localStorage）★
│       │   ├── useGameCache.ts   # 离线游戏代码缓存
│       │   ├── useToast.ts
│       │   └── useConfirm.ts
│       ├── router/
│       │   └── index.ts          # 路由守卫（settings 竞态已修复：await ensureSettings）★
│       ├── stores/
│       │   ├── games.ts          # 在线游戏状态（error 边界 + loadByCategory）★
│       │   ├── onlineGames.ts    # 在线游戏管理状态
│       │   ├── localGames.ts     # 本地游戏（IndexedDB，含 localStorage 历史迁移）★
│       │   ├── localAssets.ts    # 本地资源（IndexedDB）★
│       │   └── admin.ts          # 管理员状态（error 边界 + AdminStats 含 trend/tagDist）★
│       ├── types/
│       │   └── game.ts
│       ├── views/
│       │   ├── HomeView.vue         # 首页（搜索 + 动态标签筛选 + 排序 + 页码分页）
│       │   ├── GameView.vue         # 游戏页（iframe sandbox 已修复，去除 allow-same-origin）★
│       │   ├── EditorView.vue       # 编辑器（多文件标签页 + IndexedDB 草稿 + template 修复）★
│       │   ├── LocalGamesView.vue   # 本地游戏（导入/导出，异步 code 加载，sandbox 修复）★
│       │   ├── AddGameView.vue
│       │   ├── OnlineGamesView.vue  # 在线游戏管理
│       │   ├── AdminView.vue        # 管理面板（趋势折线图 + 标签分布 + WatchDog 接口文档）★
│       │   ├── AdminAssetsView.vue
│       │   └── NotFoundView.vue
│       ├── App.vue               # IndexedDB 初始化 + Token 失效监听 + 存储管理面板
│       ├── main.ts
│       └── shims-vue.d.ts
├── database/
│   └── init.sql                  # 数据库完整初始化（所有表已整合为单文件）
├── package.json
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

所有建表语句已整合为单文件，只需执行一次：

```bash
mysql -u root -p < database/init.sql
```

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
DB_ACQUIRE_TIMEOUT_MS=8000
CORS_ORIGINS=http://localhost:8801
NODE_ENV=development

# 管理员配置
ADMIN_PASSWORD=你的管理员密码
ADMIN_TOKEN_SECRET=自定义签名密钥（32位以上随机字符串）
```

> **`DB_ACQUIRE_TIMEOUT_MS`**：连接池获取连接超时（毫秒），默认 8000。高并发时防止请求无限挂起。
>
> **⚠️ 跨域配置**：`CORS_ORIGINS` 必须与前端实际地址完全一致，否则浏览器拦截 API 请求。多来源逗号分隔：
> ```env
> CORS_ORIGINS=http://localhost:8801,http://192.168.1.100:8801
> ```
> 修改后需重启后端。

### 4. 确认路由挂载

`backend/server.js` 的路由挂载区须包含以下全部条目：

```js
app.use('/api/games',   gamesRouter)
app.use('/api/upload',  uploadRouter)
app.use('/api/admin/login', loginLimiter)
app.use('/api/admin',   adminRouter)
app.use('/api/saves',   savesRouter)
app.use('/api/assets',  assetsRouter)
app.use('/api/tags',    tagsRouter)
app.use('/api/export',  exportRouter)
```

### 5. 安装所有依赖

```bash
cd ..

# 根目录
npm install
npm install -D npx

# 前端（含 idb）
npm install --prefix frontend

# 后端（含 esbuild）
npm install --prefix backend
```

### 6. 一键启动

```bash
npm run dev
```

访问 [http://localhost:8801](http://localhost:8801)：

```
[后端] 🌸  桜游戏屋 API 运行在 http://localhost:8802
[后端] ✅  MySQL 连接成功
[前端] VITE ready in xxx ms
[前端] ➜  Local:   http://localhost:8801/
```

`Ctrl+C` 同时关闭前后端。

### 单独启动（可选）

```bash
npm run dev:frontend   # 仅前端
npm run dev:backend    # 仅后端
```

---

## 页面说明

| 路径            | 页面         | 说明                                                                                     |
| --------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `/`             | 首页         | 在线游戏列表，搜索 + **动态标签筛选** + 排序 + 页码分页                                   |
| `/game/:id`     | 游戏页       | iframe 沙盒运行游戏，全屏模式，离线游戏自动缓存加速                                       |
| `/editor`       | 编辑器       | **多文件标签页**（HTML/CSS/JS 分离编辑）+ 实时预览 + **IndexedDB 草稿**（可被管理员关闭） ★ |
| `/local`        | 本地游戏     | **IndexedDB 存储**（无 5MB 限制），支持游玩/编辑/导出/导入/发布到线上                    ★ |
| `/add`          | 上传游戏     | 上传 `.html` / `.vue` / `.ts` 文件（magic bytes 校验 + esbuild 编译），解析后入库         ★ |
| `/online-games` | 在线游戏管理 | 批量操作 + 封面图上传 + 标签枚举 + 数据导出（需管理员登录）                               |
| `/admin`        | 管理面板     | 功能开关 + 游戏管理 + **数据统计折线图/标签分布** + 素材管理 + **WatchDog接口文档**       ★ |
| `/*`            | 404 页面     | 桜主题兜底页                                                                             |

---

## API 文档

### 基础地址

```
http://localhost:8802/api
```

> 登录管理后台后，点击「📋 接口文档」Tab 可查看完整的内嵌交互式文档（含 WatchDog 全部接口）。

### 🏥 健康检查

| 方法 | 路径      | 鉴权 | 说明                                         |
| ---- | --------- | :--: | -------------------------------------------- |
| GET  | `/health` |  —   | 服务健康检查，返回 DB 实际连接状态及运行时间 |

### 🎮 游戏接口

| 方法   | 路径              | 鉴权 | 说明                                   |
| ------ | ----------------- | :--: | -------------------------------------- |
| GET    | `/games`          |  —   | 游戏列表（分页 + 搜索 + 标签 + 排序，**不含 game_code**） |
| GET    | `/games/:id`      |  —   | 游戏详情（含完整 game_code）           |
| POST   | `/games`          |  ✅  | 新增游戏                               |
| PUT    | `/games/:id`      |  ✅  | 更新游戏（字段全可选）                 |
| DELETE | `/games/:id`      |  ✅  | 下架游戏（软删除，is_active=0）        |
| POST   | `/games/:id/play` |  —   | 记录游玩次数（play_count + 1）         |

列表查询参数：`search`（全文搜索）、`tags`（标签筛选）、`page`（默认1）、`limit`（默认12，最大50）、`sort`（`order`/`newest`/`hottest`）

### 🏷 标签枚举接口

| 方法 | 路径    | 鉴权 | 说明                                                     |
| ---- | ------- | :--: | -------------------------------------------------------- |
| GET  | `/tags` |  —   | 聚合数据库所有上架游戏标签（去重排序），末尾追加「其他」 |

### ⬇ 数据导出接口

| 方法 | 路径                   | 鉴权 | 说明                                   |
| ---- | ---------------------- | :--: | -------------------------------------- |
| GET  | `/export/games/json`   |  ✅  | 导出游戏元数据 JSON（不含 game_code）  |
| GET  | `/export/games/csv`    |  ✅  | 导出游戏元数据 CSV（Excel 可直接打开） |
| GET  | `/export/games/backup` |  ✅  | 完整备份 JSON（含 game_code）          |

### 💾 存档接口

| 方法   | 路径                   | 鉴权 | 说明                                 |
| ------ | ---------------------- | :--: | ------------------------------------ |
| GET    | `/saves/:gameId`       |  —   | 获取某游戏所有存档槽（不含存档数据） |
| GET    | `/saves/:gameId/:slot` |  —   | 读取单个存档槽（含完整 save_data）   |
| POST   | `/saves/:gameId/:slot` |  —   | 写入/覆盖存档（slot 范围 1~5）       |
| DELETE | `/saves/:gameId/:slot` |  —   | 删除存档                             |

所有存档接口均需携带 `save_key`（由前端基于浏览器指纹自动生成）。每款游戏最多 **5** 个槽位，存档数据上限 **500KB**。

### 📤 上传接口

| 方法 | 路径           | 鉴权 | 说明                                |
| ---- | -------------- | :--: | ----------------------------------- |
| POST | `/upload/game` |  ✅  | 上传游戏文件（multipart/form-data） |

| 字段 | 说明 |
| ---- | ---- |
| file | 游戏文件，支持 `.html` `.vue` `.ts`，≤ 10MB |
| name | 游戏名称（必填）|
| description / tags / author / sort_order | 可选 |

> ⚠️ 上传时**不要**手动设置 `Content-Type`，让浏览器自动生成含 boundary 的头。
> ★ **magic bytes 校验**：自动检测文件真实类型，拒绝扩展名欺骗。
> ★ **.ts 编译**：使用 esbuild 真正编译 TypeScript，不再用正则替换。

### 🗂 资源管理器接口

| 方法   | 路径                   | 鉴权 | 说明                                    |
| ------ | ---------------------- | :--: | --------------------------------------- |
| GET    | `/assets/quota`        |  —   | 全站云端资源用量与上限                  |
| GET    | `/assets/game/:gameId` |  —   | 获取游戏可用资源                        |
| GET    | `/assets`              |  —   | 资源列表（分页，不含 data 字段）        |
| GET    | `/assets/:id`          |  —   | 单个资源详情（含 data_uri）             |
| POST   | `/assets`              |  ✅  | 上传资源文件（≤ 2MB）                   |
| DELETE | `/assets/:id`          |  ✅  | 删除资源                                |

### 🔐 管理员接口

| 方法   | 路径                      | 鉴权 | 说明                                              |
| ------ | ------------------------- | :--: | ------------------------------------------------- |
| POST   | `/admin/login`            |  —   | 管理员登录，返回 JWT token（有效期 8 小时）       |
| POST   | `/admin/logout`           |  ✅  | 登出（token 加入黑名单立即失效）                  |
| GET    | `/admin/settings`         |  —   | 获取站点配置（公开）                              |
| PUT    | `/admin/settings`         |  ✅  | 更新站点配置                                      |
| GET    | `/admin/games`            |  ✅  | 管理游戏列表（含下架，支持搜索/状态/排序筛选）    |
| PUT    | `/admin/games/:id`        |  ✅  | 编辑游戏信息                                      |
| DELETE | `/admin/games/:id`        |  ✅  | 永久删除游戏（不可恢复）                          |
| PUT    | `/admin/games/:id/toggle` |  ✅  | 切换游戏上下架                                    |
| GET    | `/admin/stats`            |  ✅  | 数据统计（含近30天趋势 + 标签分布 TOP10）★       |
| GET    | `/admin/api-list`         |  ✅  | 查看全部接口列表                                  |

> 需要 token 的接口须在请求头携带 `x-admin-token: <token>`，有效期 8 小时，登出后立即失效。
> ★ **Token 过期提示**：前端 axios 拦截器捕获 401 后派发 `sakura:token-expired` 事件，App.vue 弹出提示，不再静默失败。

### 🐕 WatchDog 安全接口

| 方法   | 路径                      | 鉴权 | 说明                                    |
| ------ | ------------------------- | :--: | --------------------------------------- |
| GET    | `/watchdog/stats`         |  ✅  | 安全总览统计（请求数/错误率/封禁数）    |
| GET    | `/watchdog/events`        |  ✅  | 安全事件日志（支持 severity/type/ip 筛选）|
| GET    | `/watchdog/blocklist`     |  ✅  | 当前封禁 IP 列表                        |
| POST   | `/watchdog/ban`           |  ✅  | 手动封禁 IP                             |
| DELETE | `/watchdog/ban/:ip`       |  ✅  | 解封 IP                                 |
| POST   | `/watchdog/resolve/:id`   |  ✅  | 标记事件已处置                          |
| GET    | `/watchdog/health`        |  ✅  | 最近系统健康快照                        |
| GET    | `/watchdog/top-threats`   |  ✅  | 威胁来源 TOP10                          |

---

## 数据库设计

数据库名：`sakura_game_site`，所有建表语句整合在 `database/init.sql`。

### 主要数据表

| 表名           | 说明                                     |
| -------------- | ---------------------------------------- |
| `s_g_games`    | 游戏主表（含 FULLTEXT 全文索引）         |
| `s_g_settings` | 站点配置（editor_enabled / upload_enabled）|
| `s_g_saves`    | 游戏云端存档（game_id + slot + save_key 唯一）|
| `s_g_assets`   | 素材管理（Base64 存储，含虚拟列 data_uri）|
| `wd_events`    | WatchDog 安全事件日志                    |
| `wd_blocklist` | WatchDog 封禁 IP 列表                    |

### `s_g_games` 核心字段

| 字段        | 类型          | 说明                             |
| ----------- | ------------- | -------------------------------- |
| id          | INT PK AI     | 主键                             |
| name        | VARCHAR(255)  | 游戏名称                         |
| description | TEXT          | 游戏介绍                         |
| image_url   | VARCHAR(1000) | 封面图 URL（不建议存 base64）    |
| game_code   | LONGTEXT      | 游戏完整 HTML（仅详情接口返回）  |
| game_type   | VARCHAR(50)   | html / canvas                    |
| tags        | VARCHAR(500)  | 标签，逗号分隔                   |
| author      | VARCHAR(100)  | 作者                             |
| play_count  | INT           | 游玩次数                         |
| is_active   | TINYINT(1)    | 1=上架 0=下架                    |
| sort_order  | INT           | 排序权重（降序）                 |

### `s_g_saves` 存档表

| 字段      | 类型         | 说明                             |
| --------- | ------------ | -------------------------------- |
| game_id   | INT          | 关联游戏 ID                      |
| slot      | TINYINT      | 存档槽位（1~5）                  |
| save_key  | VARCHAR(64)  | 客户端唯一标识（浏览器指纹哈希） |
| save_data | MEDIUMTEXT   | 存档 JSON 数据（≤ 500KB）        |
| save_name | VARCHAR(100) | 存档名称                         |
| play_time | INT          | 累计游玩秒数                     |

> 唯一约束：`(game_id, slot, save_key)`，写入时自动 UPSERT。

---

## 本地存储机制（IndexedDB）

原 localStorage 方案（5MB 上限）已全面迁移至 IndexedDB。首次启动时自动将 localStorage 历史数据迁移到 IndexedDB，迁移完成后清除旧 key。

| 数据库名                 | 用途                                | 旧方案                      |
| ------------------------ | ----------------------------------- | --------------------------- |
| `sakura-local-db`        | 本地游戏 + 编辑器草稿 + 游戏存档/进度 | localStorage（5MB 上限）    |
| `sakura-local-assets`    | 本地资源文件（图片/音频/JSON）      | localStorage（5MB 上限）    |
| `sakura-game-storage`    | 游戏运行时存档/进度/配置            | localStorage（5MB 上限）    |

### localStorage 保留项（轻量配置，<2KB）

| Key                          | 内容                         |
| ---------------------------- | ---------------------------- |
| `admin_token`                | 管理员 JWT Token             |
| `sakura_game_cache:<gameId>` | 游戏代码离线缓存（30天过期） |

### 存储管理面板（导航栏 🗄️ 按钮）

| 功能           | 说明                                             |
| -------------- | ------------------------------------------------ |
| 总览           | 已用空间 / 游戏数 / 存档数 / 容量占比（基于 navigator.storage.estimate）|
| 清除游戏数据   | 删除指定游戏及其存档/进度                        |
| 清除全部存档   | 删除所有游戏存档                                 |
| 清除游戏缓存   | 删除所有离线游戏代码缓存                         |
| 一键清除全部   | 删除所有本地数据（保留 admin_token）             |

---

## 功能特性

### 在线游戏库

- 🔍 **实时搜索** — 防抖关键词搜索
- 🏷 **动态标签筛选** — 从 `/api/tags` 实时聚合，末尾含「其他」
- 🔃 **排序切换** — 默认权重 / 最新上架 / 最多游玩
- 📄 **页码分页** — 智能省略号，切换自动回顶
- 🎮 **iframe 沙盒** — `sandbox="allow-scripts allow-modals allow-pointer-lock"`（已移除 `allow-same-origin`）★
- ⛶ **全屏模式** — 游戏页支持全屏游玩，ESC 退出
- ⚡ **离线游戏缓存** — 首次加载后写入 localStorage，再次打开秒开，30 天自动过期

### 游戏编辑器

- ✏️ **CodeMirror 6** — 语法高亮（HTML/JS/CSS）、行号、括号匹配、代码折叠
- 📑 **多文件标签页** — HTML / CSS / JS 分离编辑，自动合并为完整 HTML ★
- ↩ **撤销/重做** — `Ctrl+Z` / `Ctrl+Y`
- 👁 **实时预览** — 600ms 防抖刷新（sandbox 已修复）
- 📐 **布局切换** — 分栏 / 仅编辑 / 仅预览，支持拖拽调比例
- 📦 **草稿暂存** — 3秒异步写 **IndexedDB**（不阻塞主线程）★
- 💾 **本地保存** — 异步存 IndexedDB，无 5MB 限制，`Ctrl+S` 快捷键 ★
- 🗂 **资源管理器** — 本地模式，插入资源到光标位置

### 本地游戏

- 📋 **列表管理** — 元数据展示（code 按需加载，节省内存）★
- ▶ **直接游玩** — 弹窗 iframe 沙盒运行（sandbox 已修复）★
- ✏️ **跳转编辑** — 一键回到编辑器，异步加载代码 ★
- ⬇ **导出 HTML** — 下载为独立 HTML 文件
- 📂 **导入 HTML** — 从本地 .html 文件导入到游戏库 ★
- 🚀 **发布到线上** — 管理员登录后可直接发布

### 文件上传

- 📤 **拖拽上传** — 支持拖拽或点击选择文件
- 🔒 **Magic bytes 校验** — 检测文件真实类型，拒绝扩展名欺骗 ★
- 🔄 **自动解析** — `.vue` 拼装 HTML；`.ts` 使用 **esbuild** 真正编译 ★
- ✅ **安全扫描** — 拦截外链脚本 / eval / fetch / XHR

### 管理员模块

- 🔐 **JWT 登录** — bcrypt 密码验证，token 黑名单（登出立即失效）
- ⚠️ **Token 过期提示** — 8小时后自动弹提示，不再静默失败 ★
- 🎛 **功能开关** — 实时控制编辑器、上传功能
- 🎮 **游戏管理** — 内联编辑/上下架/删除
- 📊 **数据统计** — 总数/游玩数/近**30天趋势折线图**/标签分布 TOP10/最热/最新 ★
- 🗂 **素材管理** — 云端素材上传/查看/删除
- 📋 **接口文档** — 全部接口（含 WatchDog）★

### 安全与稳定

- 🛡 所有写操作需管理员 Token
- 🔑 bcrypt（cost=12）密码哈希
- 🚫 Token 黑名单 + 8小时自动清理
- 🔒 **iframe sandbox 修复** — 移除 `allow-same-origin`，游戏代码无法读取父页面数据 ★
- 🐕 WatchDog 安全监控（SQL注入/XSS/路径穿越/命令注入检测）
- 🧹 上传文件安全扫描 + magic bytes 校验 ★
- ✅ express-validator 参数校验
- 📝 Winston 日志（5MB 轮转，最多 5 份，慢查询阈值 500ms）★
- 🔄 数据库自动重连（最多 3 次）
- ⏱ **连接池超时** — acquireTimeout 8秒，高并发不再无限挂起 ★
- 🚦 全局限流（300 次/分钟）+ 登录限流（60 秒内最多 10 次）

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

| 问题                                                         | 原因                              | 解决                                                                                     |
| ------------------------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------- |
| `Cannot find module 'express'`                               | 未安装依赖                        | `npm install --prefix backend`                                                           |
| `Cannot find module 'idb'`                                   | 前端依赖未安装                    | `npm install --prefix frontend`                                                          |
| `Cannot find module 'bcryptjs'`                              | 缺少 bcryptjs                     | `cd backend && npm install bcryptjs`                                                     |
| `MySQL 连接失败`                                             | 密码或库名错误                    | 检查 `.env`                                                                              |
| `EADDRINUSE`                                                 | 端口被占用                        | 修改 `.env` 中的端口号                                                                   |
| `ReferenceError: Cannot access 'app' before initialization`  | 路由挂载在 `express()` 前        | 将所有 `app.use(...)` 移到 `const app = express()` 之后                                  |
| 前端空白无内容                                               | 后端未启动                        | 先启动后端再刷新前端                                                                     |
| **API 请求被 CORS 拦截**                                     | `CORS_ORIGINS` 配置错误           | 检查 `.env` 中 `CORS_ORIGINS` 与实际前端地址完全一致，修改后重启后端                    |
| 本地游戏数据消失                                             | 首次 IndexedDB 迁移               | 检查 DevTools → Application → IndexedDB → sakura-local-db                                |
| 管理员登录提示密码错误                                       | `.env` 未读取到                   | 检查 `.env` 是否存在，`injecting env (0)` 表示文件为空                                   |
| 管理员 Token 过期后静默失败                                  | 已修复（v1.1.0）                  | 更新代码后会弹出"会话已过期"提示                                                         |
| 编辑器报 `Unterminated regular expression`                   | 已修复（v1.1.0）                  | 更新 EditorView.vue，templates 改用数组拼接                                              |
| 上传 .ts 文件解析结果损坏                                    | 原正则替换已修复                  | 已改用 esbuild 真正编译（v1.1.0）                                                        |
| 上传文件报"非法文件类型"                                     | magic bytes 校验拒绝              | 确认文件是真正的文本文件，非二进制                                                       |
| 首页标签筛选为空                                             | `/api/tags` 路由未挂载            | 确认 `server.js` 已挂载 `tagsRouter`                                                     |
| 导出按钮报「未授权」                                         | Token 未携带或已过期              | 前往 `/admin` 重新登录                                                                   |
| 导出 CSV 中文乱码                                            | Excel 未识别 UTF-8 BOM            | 文件已含 BOM，双击 Excel 打开即可                                                        |
| 游戏更新后仍加载旧版本                                       | 缓存版本未失效                    | 在存储管理面板手动清除游戏缓存                                                           |
| 上传文件报 413                                               | 文件超过限制                      | 游戏文件 ≤ 10MB；资源文件 ≤ 2MB                                                          |
| 功能开关保存后前端未生效                                     | 缓存未刷新                        | 刷新页面                                                                                 |
| `npm run dev` 报找不到 concurrently                          | 根目录依赖未装                    | 在根目录执行 `npm install && npm install -D npx`                                         |
| `assets.sql` 执行报虚拟列语法错误                            | MySQL 版本过低                    | 升级至 MySQL ≥ 5.7                                                                       |
| 存档读取返回 404                                             | save_key 不匹配                   | 浏览器指纹变化（换设备/隐身模式）会导致 save_key 变化                                   |

---

## License

[MIT](./LICENSE) © 2026 Sakura Games Site Contributors