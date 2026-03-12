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
│   │   └── database.js           # MySQL 连接池 + 自动重连 + 慢查询日志
│   ├── middleware/
│   │   ├── auth.js               # JWT 生成与验证 + bcrypt 密码哈希 + Token 黑名单
│   │   ├── validate.js           # 统一参数校验中间件（express-validator）
│   │   └── logger.js             # Winston 日志中间件
│   ├── routes/
│   │   ├── games.js              # 游戏 CRUD + 搜索 + 排序 API（写操作需鉴权）
│   │   ├── upload.js             # 文件上传 + 安全扫描 + 解析入库（需鉴权）
│   │   └── admin.js              # 管理员登录 + 站点配置 + 游戏管理 + 数据统计 + 接口文档
│   ├── logs/                     # 运行日志（git 忽略）
│   │   └── .gitkeep
│   ├── .env                      # 环境变量（不提交 git）
│   ├── .env.example              # 环境变量模板
│   ├── package.json
│   └── server.js                 # Express 入口
├── frontend/                     # Vue3 前端
│   ├── src/
│   │   ├── api/
│   │   │   ├── games.ts          # 游戏相关 Axios API 封装（含 sort / publishGame）
│   │   │   └── admin.ts          # 管理员相关 Axios API 封装（含 token 拦截器 / stats）
│   │   ├── assets/
│   │   │   └── main.css          # 全局样式（桜主题）
│   │   ├── components/
│   │   │   ├── GameCard.vue      # 游戏卡片组件
│   │   │   ├── SearchBar.vue     # 搜索框 + 标签筛选
│   │   │   ├── ToastContainer.vue# 全局 Toast 通知容器
│   │   │   └── ErrorBoundary.vue # 组件级错误边界
│   │   ├── composables/
│   │   │   ├── useCodeMirror.ts  # CodeMirror 6 封装（主题/语言动态切换）
│   │   │   └── useToast.ts       # 全局 Toast 状态管理
│   │   ├── router/
│   │   │   └── index.ts          # Vue Router（含动态 title + 权限守卫）
│   │   ├── stores/
│   │   │   ├── games.ts          # Pinia 在线游戏状态（含 sort / 页码分页）
│   │   │   ├── localGames.ts     # Pinia 本地游戏状态（localStorage）
│   │   │   └── admin.ts          # Pinia 管理员状态 + 站点配置 + 数据统计
│   │   ├── types/
│   │   │   └── game.ts           # TypeScript 类型定义
│   │   ├── views/
│   │   │   ├── HomeView.vue      # 首页（游戏列表 + 搜索 + 排序 + 页码分页）
│   │   │   ├── GameView.vue      # 游戏详情 + 运行页
│   │   │   ├── EditorView.vue    # 游戏编辑器 + 实时预览 + 暂存
│   │   │   ├── LocalGamesView.vue# 本地游戏列表（含一键发布到线上）
│   │   │   ├── AddGameView.vue   # 文件上传游戏页
│   │   │   └── AdminView.vue     # 管理员面板（功能开关/游戏管理/数据统计/接口文档）
│   │   ├── App.vue               # 根组件（含 ErrorBoundary + ToastContainer）
│   │   ├── main.ts               # 入口（含全局错误处理）
│   │   └── shims-vue.d.ts
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── database/
│   ├── init.sql                  # 数据库初始化 + 内置游戏（建库建表）
│   ├── game.sql                  # 额外测试游戏数据
│   └── settings.sql              # 站点配置表 + 管理员开关初始数据
├── package.json                  # 根目录：一键启动前后端（concurrently）
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

### 3. 配置后端环境变量

```bash
cd backend
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

### 4. 安装所有依赖

回到根目录，依次安装根目录、前端、后端的依赖：

```bash
# 回到根目录
cd ..

# 安装根目录依赖（concurrently）
npm install

# 安装前端依赖
npm install --prefix frontend

# 安装后端依赖
npm install --prefix backend
```

### 5. 一键启动前后端

```bash
# 在根目录执行，同时启动前端（8801）和后端（8802）先使用npm install -D npx指令安装npx
npm run dev
```

看到以下输出说明启动成功，访问 [http://localhost:8801](http://localhost:8801)：
```
[后端] 🌸  桜游戏屋 API 运行在 http://localhost:8802
[后端] ✅  MySQL 连接成功
[前端] VITE ready in xxx ms
[前端] ➜  Local:   http://localhost:8801/
```

按 `Ctrl+C` 同时关闭前后端。

---

### 单独启动（可选）

如需单独调试，也可分别启动：

```bash
# 仅启动前端
npm run dev:frontend

# 仅启动后端
npm run dev:backend
```

或进入各子目录分别执行 `npm run dev`。

---

## 页面说明

| 路径        | 页面     | 说明                                                             |
| ----------- | -------- | ---------------------------------------------------------------- |
| `/`         | 首页     | 在线游戏列表，支持搜索、标签筛选、排序、页码分页                 |
| `/game/:id` | 游戏页   | iframe 沙盒运行游戏，支持全屏                                    |
| `/editor`   | 编辑器   | 本地编写游戏代码 + 实时预览，保存至浏览器本地（可被管理员关闭）  |
| `/local`    | 本地游戏 | 管理编辑器保存的本地游戏，支持游玩/编辑/导出/删除/发布到线上     |
| `/add`      | 上传游戏 | 上传 `.html` / `.vue` / `.ts` 文件，解析后入库（可被管理员关闭） |
| `/admin`    | 管理面板 | 管理员登录 + 功能开关 + 游戏管理 + 数据统计 + 接口文档           |

---

## API 文档

### 基础地址
```
http://localhost:8802/api
```

> 登录管理后台后，点击「📋 接口文档」Tab 可查看完整的交互式文档（方法色标 + 参数说明 + 鉴权状态）。

### 游戏接口

| 方法   | 路径              | 鉴权  | 说明                                   |
| ------ | ----------------- | :---: | -------------------------------------- |
| GET    | `/games`          |   —   | 游戏列表（分页 + 搜索 + 标签 + 排序）  |
| GET    | `/games/:id`      |   —   | 游戏详情（含 game_code）               |
| POST   | `/games`          |   ✅   | 新增游戏（本地游戏一键发布也走此接口） |
| PUT    | `/games/:id`      |   ✅   | 更新游戏                               |
| DELETE | `/games/:id`      |   ✅   | 下架游戏（软删除）                     |
| POST   | `/games/:id/play` |   —   | 记录游玩次数                           |
| GET    | `/health`         |   —   | 健康检查                               |

#### 列表查询参数

| 参数   | 类型   | 可选值                         | 说明                                     |
| ------ | ------ | ------------------------------ | ---------------------------------------- |
| search | string | —                              | 关键词（全文搜索 name/description/tags） |
| tags   | string | —                              | 标签精确筛选                             |
| page   | number | —                              | 页码，默认 1                             |
| limit  | number | —                              | 每页数量，默认 12，最大 50               |
| sort   | string | `order` / `newest` / `hottest` | 排序方式，默认 `order`（权重降序）       |

### 上传接口

| 方法 | 路径           | 鉴权  | 说明                                |
| ---- | -------------- | :---: | ----------------------------------- |
| POST | `/upload/game` |   ✅   | 上传游戏文件（multipart/form-data） |

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

> 需要 token 的接口须在请求头携带 `x-admin-token: <token>`，token 在登录后获取，有效期 8 小时。登出后 token 立即加入黑名单，不可再用。

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
- 🔃 **排序切换** — 支持默认权重 / 最新上架 / 最多游玩三种排序
- 📄 **页码分页** — 智能页码（含省略号），支持跳页，切换页面自动回顶
- 🎮 **iframe 沙盒运行** — 游戏代码安全隔离执行
- ⛶ **全屏模式** — 游戏页支持全屏游玩
- 📊 **游玩统计** — 自动记录每局游玩次数

### 游戏编辑器
- ✏️ **CodeMirror 6** — 语法高亮（HTML / JS / CSS）、行号、括号匹配、代码折叠
- ↩ **撤销 / 重做** — 完整历史记录，支持 `Ctrl+Z` / `Ctrl+Y`
- 🎨 **主题切换** — 暗色（One Dark）/ 亮色两套主题
- 🌐 **语言切换** — HTML / JavaScript / CSS 高亮动态切换
- 👁 **实时预览** — 代码修改后 600ms 防抖自动刷新预览
- 📐 **布局切换** — 分栏 / 仅编辑 / 仅预览 三种模式，支持拖拽调整比例
- ⛶ **全屏预览** — 新窗口全屏预览游戏效果
- 📋 **代码模板** — 内置空白 HTML 和 Canvas 两种模板
- 📦 **编辑器暂存** — 3 秒无操作自动写入 localStorage，下次打开可一键恢复草稿
- 💾 **本地保存** — 游戏数据持久化至 localStorage（`Ctrl+S` 快捷键）

### 本地游戏
- 📋 **列表管理** — 查看所有本地保存的游戏
- ▶ **直接游玩** — 弹窗 iframe 沙盒运行
- ✏️ **跳转编辑** — 一键回到编辑器继续修改
- ⬇ **导出 HTML** — 下载为独立可运行的 HTML 文件
- 🚀 **一键发布** — 登录管理员后可将本地游戏直接发布到线上游戏库
- 🗑 **删除管理** — 确认后删除本地游戏

### 文件上传
- 📤 **拖拽上传** — 支持拖拽或点击选择文件
- 🔍 **代码预览** — 上传前预览文件前 30 行
- 🔄 **自动解析** — `.vue` / `.ts` 自动转换为可运行 HTML
- 🛡 **内容安全扫描** — 自动拦截含外链脚本、eval、数据外传等危险代码的文件
- ✅ **表单验证** — 必填项校验 + 错误提示

### 管理员模块
- 🔐 **JWT 登录** — bcrypt 密码验证，Token 有效期 8 小时，持久化至 localStorage
- 🔒 **登录限流** — 60 秒内最多 10 次，防暴力破解
- 🚪 **Token 吊销** — 登出后 Token 立即加入内存黑名单，无法继续使用
- 🎛 **功能开关** — 实时控制编辑器、上传功能的启用/禁用
- 🎮 **游戏管理** — 搜索、行内编辑、上下架切换、永久删除、分页浏览
- 📊 **数据统计** — 游戏总数、上下架数量、总游玩次数、最热 TOP5、最新入库列表
- 📋 **接口文档** — 内置 API 文档面板，方法色标 + 参数说明 + 鉴权状态一览
- 👁 **状态预览** — 面板内实时显示各功能当前运行状态
- 🚫 **路由守卫** — 被关闭的功能页面自动重定向至首页，导航入口同步隐藏

### 安全与稳定
- 🛡 **权限保护** — 全部写操作（新增/修改/删除/上传）均需管理员 Token
- 🔑 **密码哈希** — 管理员密码使用 bcrypt（cost=12）哈希，不存明文
- 🚫 **Token 黑名单** — 登出后 Token 即时失效，8 小时后自动从内存清理
- 🧹 **上传安全扫描** — 拦截外链 JS/CSS、eval、fetch、XHR、sendBeacon 等危险模式
- ✅ **参数校验** — 统一 express-validator 校验，400 错误有明确字段提示
- 📝 **Winston 日志** — 请求日志 + 慢查询（>1s）+ 管理员操作全量记录，落盘至 `backend/logs/`
- 🔄 **数据库重连** — 连接失败自动重试最多 3 次，间隔递增
- 🚦 **全局限流** — 300 次/分钟，防接口滥用
- 💥 **异常兜底** — 后端 `uncaughtException` + `unhandledRejection` 全局捕获

### 前端工程
- 🧱 **错误边界** — `ErrorBoundary` 组件包裹路由视图，捕获页面级崩溃防止白屏
- 🔔 **全局 Toast** — 统一通知组件替代原生 `alert()`，支持 success / error / warning / info
- 🌐 **全局错误监听** — `app.config.errorHandler` + `unhandledrejection` + `window.error` 三层覆盖
- 📱 **响应式设计** — 适配桌面 / 平板 / 手机
- 🌸 **桜主题** — 日式樱花风格视觉设计
- 🔄 **动态页面 Title** — 进入游戏后 title 变为游戏名称

---

## 日志

运行日志保存在 `backend/logs/`（已加入 `.gitignore`，目录由 `.gitkeep` 保持）：

| 文件           | 内容                          |
| -------------- | ----------------------------- |
| `combined.log` | 所有请求日志 + 管理员操作记录 |
| `error.log`    | 仅错误级别日志                |

单个日志文件上限 **5MB**，自动滚动，最多保留 **5** 份。

---

## 常见问题

| 问题                                | 原因                 | 解决                                                             |
| ----------------------------------- | -------------------- | ---------------------------------------------------------------- |
| `Cannot find module 'express'`      | 未安装依赖           | `npm install --prefix backend`                                   |
| `Cannot find module 'bcryptjs'`     | 未安装 bcryptjs      | `cd backend && npm install bcryptjs`                             |
| `MySQL 连接失败`                    | 密码或库名错误       | 检查 `.env`                                                      |
| `EADDRINUSE`                        | 端口被占用           | 修改 `.env` 中的端口号                                           |
| 前端空白无内容                      | 后端未启动           | 先启动后端再刷新前端                                             |
| 上传文件报 413                      | 文件超过限制         | 文件需小于 10MB                                                  |
| 上传文件报「包含不允许的内容」      | 安全扫描拦截         | 检查文件内是否有外链脚本、eval、fetch 等，改用自包含代码         |
| 管理员登录提示密码错误              | `.env` 未读取到      | 检查 `.env` 是否存在，`injecting env (0)` 表示文件为空或路径错误 |
| 管理员登录提示密码错误              | 密码混淆             | 登录密码是 `ADMIN_PASSWORD`，不是 `ADMIN_TOKEN_SECRET`           |
| 登出后 Token 仍可使用               | 服务端重启清空黑名单 | 重启会清空内存黑名单；生产环境建议接入 Redis 持久化黑名单        |
| 功能开关保存后前端未生效            | 缓存未刷新           | 刷新页面，settings 会在启动时重新拉取                            |
| 编辑器无法输入内容                  | ref 绑定失败         | 确认 `useCodeMirror` 返回值已解构，模板中使用顶层变量名绑定 ref  |
| `npm run dev` 报找不到 concurrently | 根目录依赖未装       | 在根目录执行 `npm install`                                       |
| 首页分页不显示 / 排序无效           | store 结构不匹配     | 确认 `stores/games.ts` 中 `pagination` 含 `page` 和 `pages` 字段 |

---

## License

[MIT](./LICENSE) © 2026 Sakura Games Site Contributors