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
│       │   ├── games.ts          # 游戏接口（sort / publishGame）
│       │   ├── admin.ts          # 管理员接口（token 拦截器 / stats）
│       │   └── saves.ts          # 存档接口（getSaveSlots / loadSave / writeSave / deleteSave）
│       ├── assets/
│       │   └── main.css
│       ├── components/
│       │   ├── GameCard.vue
│       │   ├── SearchBar.vue
│       │   ├── ToastContainer.vue  # 全局 Toast
│       │   ├── ErrorBoundary.vue   # 组件级错误边界
│       │   └── ConfirmDialog.vue   # 全局确认弹窗（替代原生 confirm()）
│       ├── composables/
│       │   ├── useCodeMirror.ts
│       │   ├── useToast.ts         # Toast 状态
│       │   └── useConfirm.ts       # 确认弹窗状态
│       ├── router/
│       │   └── index.ts            # 含 404 兜底路由 + 功能开关守卫
│       ├── stores/
│       │   ├── games.ts            # 在线游戏状态（sort / 页码分页）
│       │   ├── localGames.ts
│       │   └── admin.ts
│       ├── types/
│       │   └── game.ts
│       ├── views/
│       │   ├── HomeView.vue        # 首页（搜索 + 排序 + 页码分页）
│       │   ├── GameView.vue
│       │   ├── EditorView.vue
│       │   ├── LocalGamesView.vue  # 含一键发布到线上
│       │   ├── AddGameView.vue
│       │   ├── AdminView.vue       # 功能开关/游戏管理/数据统计/接口文档
│       │   └── NotFoundView.vue    # 404 页面
│       ├── App.vue                 # ErrorBoundary + ToastContainer + ConfirmDialog
│       ├── main.ts                 # 全局错误处理
│       └── shims-vue.d.ts
├── database/
│   ├── init.sql                    # 建库建表（s_g_games）
│   ├── saves.sql                   # 存档表（s_g_saves）
│   ├── game.sql                    # 内置游戏数据（含桜迷宫）
│   └── settings.sql                # 站点配置表
├── games/
│   └── sakura-maze.html            # 🌸 桜迷宫（内置游戏，带 localStorage 存档）
├── package.json                    # 根目录：一键启动（concurrently）
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
mysql -u root -p < database/game.sql
mysql -u root -p < database/settings.sql
```

> `saves.sql` 创建游戏存档表 `s_g_saves`，如不需要服务端存档可跳过（游戏内置 localStorage 存档仍可用）。

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
CORS_ORIGINS=http://localhost:8801
NODE_ENV=development

ADMIN_PASSWORD=你的管理员密码
ADMIN_TOKEN_SECRET=自定义签名密钥（32位以上随机字符串）
```

### 4. 安装所有依赖

```bash
cd ..

# 根目录（concurrently）
npm install -D npx

# 前后端
npm install --prefix frontend
npm install --prefix backend
```

### 5. 一键启动

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

| 路径        | 页面     | 说明                                                             |
| ----------- | -------- | ---------------------------------------------------------------- |
| `/`         | 首页     | 在线游戏列表，支持搜索、标签筛选、排序、页码分页                 |
| `/game/:id` | 游戏页   | iframe 沙盒运行游戏，支持全屏                                    |
| `/editor`   | 编辑器   | 本地编写游戏代码 + 实时预览 + 草稿暂存（可被管理员关闭）         |
| `/local`    | 本地游戏 | 管理本地保存的游戏，支持游玩/编辑/导出/删除/一键发布到线上       |
| `/add`      | 上传游戏 | 上传 `.html` / `.vue` / `.ts` 文件，解析后入库（可被管理员关闭） |
| `/admin`    | 管理面板 | 功能开关 + 游戏管理 + 数据统计 + 接口文档                        |
| `/*`        | 404 页面 | 未匹配路由的兜底页，提供返回首页/上一页操作                      |

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

#### 文件解析规则

| 文件类型 | 处理方式                                               |
| -------- | ------------------------------------------------------ |
| `.html`  | 直接存入数据库                                         |
| `.vue`   | 提取 `<template>` `<script>` `<style>` 拼装为完整 HTML |
| `.ts`    | 移除类型注解，包装进 HTML + Canvas 模板                |

### 管理员接口

| 方法   | 路径                      | 鉴权  | 说明                             |
| ------ | ------------------------- | :---: | -------------------------------- |
| POST   | `/admin/login`            |   —   | 管理员登录，返回 JWT token       |
| POST   | `/admin/logout`           |   ✅   | 登出（Token 加入黑名单立即失效） |
| GET    | `/admin/settings`         |   —   | 获取站点配置（公开）             |
| PUT    | `/admin/settings`         |   ✅   | 更新站点配置                     |
| GET    | `/admin/games`            |   ✅   | 管理游戏列表（含下架，可搜索）   |
| PUT    | `/admin/games/:id`        |   ✅   | 编辑游戏基本信息                 |
| DELETE | `/admin/games/:id`        |   ✅   | 永久删除游戏                     |
| PUT    | `/admin/games/:id/toggle` |   ✅   | 切换游戏上下架状态               |
| GET    | `/admin/stats`            |   ✅   | 数据统计（总数/游玩数/排行榜）   |
| GET    | `/admin/api-list`         |   ✅   | 查看全部接口列表                 |

> 需要 token 的接口须在请求头携带 `x-admin-token: <token>`，有效期 8 小时，登出后立即失效。

---

## 数据库设计

数据库名：`sakura_game_site`，共三张表。

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

## 内置游戏

### 🌸 桜迷宫 (`games/sakura-maze.html`)

一款随机生成地图的 Roguelite 地牢探索游戏。

**玩法**

- 键盘 `WASD` 或方向键移动；`Z` 键释放全屏技能「樱花爆发」（消耗 20 MP）
- 也可点击地图上的按钮操作（移动端友好）
- 击败怪物获得经验和金币，升级后 ATK / HP / MP 全面提升
- 找到出口 🚪 进入下一层，层数越深怪物越强
- 等待（`·` 键）可缓慢回复 HP/MP

**存档系统**

| 机制               | 说明                                             |
| ------------------ | ------------------------------------------------ |
| localStorage       | 3 个本地存档槽，无需登录，即时保存/读取          |
| 服务端存档（可选） | 通过 `/api/saves` 接口持久化到 MySQL，需部署后端 |

**将游戏入库**

方式一：通过管理后台 `/admin` → 「上传游戏」上传 `sakura-maze.html`

方式二：将 `sakura-maze.html` 内容填入 `database/game.sql` 后执行

---

## 功能特性

### 在线游戏库
- 🔍 **实时搜索** — 防抖关键词搜索 + 标签快捷筛选
- 🔃 **排序切换** — 默认权重 / 最新上架 / 最多游玩
- 📄 **页码分页** — 智能省略号页码，切换自动回顶
- 🎮 **iframe 沙盒** — 游戏代码安全隔离执行
- ⛶ **全屏模式** — 游戏页支持全屏游玩
- 📊 **游玩统计** — 自动记录游玩次数

### 游戏编辑器
- ✏️ **CodeMirror 6** — 语法高亮（HTML/JS/CSS）、行号、括号匹配、代码折叠
- ↩ **撤销/重做** — `Ctrl+Z` / `Ctrl+Y`
- 🎨 **主题/语言切换** — 暗色 One Dark / 亮色，HTML/JS/CSS 动态切换
- 👁 **实时预览** — 600ms 防抖刷新
- 📐 **布局切换** — 分栏 / 仅编辑 / 仅预览，支持拖拽调比例
- 📦 **草稿暂存** — 3 秒无操作自动写入 localStorage，下次可恢复
- 💾 **本地保存** — `Ctrl+S` 快捷键

### 本地游戏
- 📋 列表管理 / ▶ 直接游玩 / ✏️ 跳转编辑
- ⬇ **导出 HTML** — 下载为独立可运行文件
- 🚀 **一键发布** — 登录管理员后直接推送到线上游戏库

### 文件上传
- 📤 拖拽上传 + 代码预览（前 30 行）
- 🔄 `.vue` / `.ts` 自动转换为可运行 HTML
- 🛡 **内容安全扫描** — 拦截外链脚本 / eval / fetch / XHR / sendBeacon

### 游戏存档
- 💾 **localStorage 存档** — 游戏内置，3 槽位，无需后端，即时读写
- 🌐 **服务端存档 API** — `/api/saves` 提供 CRUD，支持跨设备（需部署后端）
- 🔑 **客户端标识** — 基于浏览器指纹（UA + 语言 + 时区 + 分辨率）自动生成 `save_key`

### 管理员模块
- 🔐 JWT 登录（bcrypt 密码验证，8 小时有效）
- 🔒 登录限流（60 秒内最多 10 次）
- 🚪 Token 黑名单（登出立即失效）
- 🎛 功能开关（编辑器/上传）
- 🎮 游戏管理（搜索/行内编辑/上下架/永久删除）
- 📊 数据统计（总数/游玩数/最热 TOP5/最新入库）
- 📋 接口文档（内置交互式 API 面板）
- 🚫 路由守卫（关闭功能自动重定向）

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
- 🔗 404 兜底路由（NotFoundView）
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

| 问题                                | 原因               | 解决                                                             |
| ----------------------------------- | ------------------ | ---------------------------------------------------------------- |
| `Cannot find module 'express'`      | 未安装依赖         | `npm install --prefix backend`                                   |
| `Cannot find module 'bcryptjs'`     | 缺少 bcryptjs      | `cd backend && npm install bcryptjs`                             |
| `MySQL 连接失败`                    | 密码或库名错误     | 检查 `.env`                                                      |
| `EADDRINUSE`                        | 端口被占用         | 修改 `.env` 中的端口号                                           |
| 前端空白无内容                      | 后端未启动         | 先启动后端再刷新前端                                             |
| 上传文件报 413                      | 文件超过限制       | 文件需小于 10MB                                                  |
| 上传文件报「包含不允许的内容」      | 安全扫描拦截       | 检查文件是否含外链脚本/eval/fetch，改用自包含代码                |
| 管理员登录提示密码错误              | `.env` 未读取到    | 检查 `.env` 是否存在，`injecting env (0)` 表示文件为空           |
| 管理员登录提示密码错误              | 密码混淆           | 登录密码是 `ADMIN_PASSWORD`，不是 `ADMIN_TOKEN_SECRET`           |
| 登出后 Token 仍可使用               | 重启清空内存黑名单 | 重启后黑名单归零；生产环境建议接入 Redis 持久化                  |
| `/api/health` 返回 503              | DB 连接断开        | 检查 MySQL 服务是否运行，查看 `backend/logs/error.log`           |
| 存档读取返回 404                    | save_key 不匹配    | 浏览器指纹变化（更换设备/隐身模式）会导致 save_key 变化          |
| 功能开关保存后前端未生效            | 缓存未刷新         | 刷新页面，settings 会在启动时重新拉取                            |
| 编辑器无法输入内容                  | ref 绑定失败       | 确认 `useCodeMirror` 返回值已解构，模板中使用顶层变量名绑定 ref  |
| `npm run dev` 报找不到 concurrently | 根目录依赖未装     | 在根目录执行 `npm install`                                       |
| 首页分页不显示 / 排序无效           | store 结构不匹配   | 确认 `stores/games.ts` 中 `pagination` 含 `page` 和 `pages` 字段 |
| 404 页面未生效                      | 路由顺序错误       | 确认 `router/index.ts` 中 `/:pathMatch(.*)*` 路由放在最后        |

---

## License

[MIT](./LICENSE) © 2026 Sakura Games Site Contributors