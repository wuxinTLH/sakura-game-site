<template>
    <div class="admin-view">

        <!-- ── 未登录 ───────────────────────────────────────────────── -->
        <div class="login-wrap" v-if="!store.isLoggedIn">
            <div class="login-card">
                <div class="login-icon">🔐</div>
                <h2 class="login-title">管理员登录</h2>
                <p class="login-sub">输入管理员密码以访问后台</p>
                <div class="form-row">
                    <input v-model="password" :type="showPwd ? 'text' : 'password'" class="pwd-input"
                        :class="{ error: loginError }" placeholder="请输入管理员密码" @keydown.enter="doLogin" />
                    <button class="pwd-toggle" @click="showPwd = !showPwd">
                        {{ showPwd ? '🙈' : '👁' }}
                    </button>
                </div>
                <p class="field-error" v-if="loginError">{{ loginError }}</p>
                <button class="btn-login" :disabled="!password.trim() || logging" @click="doLogin">
                    <span v-if="logging">登录中…</span>
                    <span v-else>登 录</span>
                </button>
            </div>
        </div>

        <!-- ── 已登录 ───────────────────────────────────────────────── -->
        <template v-else>
            <section class="admin-hero">
                <div class="admin-hero-inner">
                    <h1 class="admin-hero-title"><span>⚙️</span> 站点管理</h1>
                    <div class="hero-tabs">
                        <button v-for="tab in tabs" :key="tab.value" class="hero-tab"
                            :class="{ active: activeTab === tab.value }" @click="switchTab(tab.value)">
                            {{ tab.label }}
                        </button>
                    </div>
                    <button class="btn-logout" @click="doLogout">退出登录</button>
                </div>
            </section>

            <div class="admin-content" :class="{ 'admin-content-full': activeTab === 'assets' }">

                <!-- Tab：功能开关 ─────────────────────────────────────── -->
                <template v-if="activeTab === 'settings'">
                    <div class="settings-card">
                        <h3 class="card-title">🎛 功能开关</h3>
                        <p class="card-desc">关闭后对应页面将对所有用户不可访问，导航栏入口同步隐藏。</p>
                        <div class="switch-list">
                            <div class="switch-item" v-for="sw in switches" :key="sw.key">
                                <div class="switch-info">
                                    <span class="switch-icon">{{ sw.icon }}</span>
                                    <div>
                                        <div class="switch-name">{{ sw.name }}</div>
                                        <div class="switch-desc">{{ sw.desc }}</div>
                                    </div>
                                </div>
                                <div class="switch-control">
                                    <span class="switch-status" :class="local[sw.key] ? 'on' : 'off'">
                                        {{ local[sw.key] ? '开启' : '关闭' }}
                                    </span>
                                    <button class="toggle-btn" :class="{ active: local[sw.key] }"
                                        @click="local[sw.key] = !local[sw.key]">
                                        <span class="toggle-thumb"></span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer">
                            <span class="unsaved-tip" v-if="isDirty">● 有未保存的更改</span>
                            <button class="btn-save" :disabled="!isDirty || store.loading" @click="saveSettings">
                                <span v-if="store.loading">保存中…</span>
                                <span v-else>💾 保存设置</span>
                            </button>
                        </div>
                        <div class="save-result success" v-if="saveResult === 'success'">✅ 设置已保存</div>
                        <div class="save-result error" v-if="saveResult === 'error'">❌ {{ saveError }}</div>
                    </div>

                    <div class="status-card">
                        <h3 class="card-title">📊 当前状态</h3>
                        <div class="status-grid">
                            <div class="status-item" v-for="sw in switches" :key="sw.key"
                                :class="getSettingValue(sw.key) ? 'enabled' : 'disabled'">
                                <span>{{ sw.icon }} {{ sw.name }}</span>
                                <span class="status-badge">
                                    {{ getSettingValue(sw.key) ? '✅ 运行中' : '🔴 已关闭' }}
                                </span>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Tab：游戏管理 ─────────────────────────────────────── -->
                <template v-if="activeTab === 'games'">
                    <div class="games-panel">
                        <div class="games-toolbar">
                            <div class="games-search-box">
                                <span>🔍</span>
                                <input v-model="gameSearch" placeholder="搜索游戏名称或介绍…" @input="onGameSearch" />
                            </div>
                            <span class="games-total">共 {{ store.gamesPagination.total }} 款</span>
                        </div>
                        <div class="games-loading" v-if="store.loading">
                            <span>🌸</span> 加载中…
                        </div>
                        <div class="games-table-wrap" v-else>
                            <table class="games-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>游戏名称</th>
                                        <th>标签</th>
                                        <th>作者</th>
                                        <th>游玩次数</th>
                                        <th>排序</th>
                                        <th>状态</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="game in store.games" :key="game.id"
                                        :class="{ inactive: !game.is_active }">
                                        <td class="td-id">{{ game.id }}</td>
                                        <td class="td-name">
                                            <template v-if="editingId === game.id">
                                                <input v-model="editForm.name" class="inline-input" />
                                            </template>
                                            <template v-else>
                                                <div class="game-name-cell">{{ game.name }}</div>
                                                <div class="game-desc-cell">{{ game.description }}</div>
                                            </template>
                                        </td>
                                        <td class="td-tags">
                                            <template v-if="editingId === game.id">
                                                <input v-model="editForm.tags" class="inline-input"
                                                    placeholder="逗号分隔" />
                                            </template>
                                            <template v-else>
                                                <span v-for="tag in splitTags(game.tags)" :key="tag" class="tag">{{ tag
                                                    }}</span>
                                            </template>
                                        </td>
                                        <td class="td-author">
                                            <template v-if="editingId === game.id">
                                                <input v-model="editForm.author" class="inline-input" />
                                            </template>
                                            <template v-else>{{ game.author }}</template>
                                        </td>
                                        <td class="td-count">{{ game.play_count }}</td>
                                        <td class="td-sort">
                                            <template v-if="editingId === game.id">
                                                <input v-model.number="editForm.sort_order" type="number"
                                                    class="inline-input w60" />
                                            </template>
                                            <template v-else>{{ game.sort_order }}</template>
                                        </td>
                                        <td class="td-status">
                                            <span class="status-dot" :class="game.is_active ? 'on' : 'off'">
                                                {{ game.is_active ? '上架' : '下架' }}
                                            </span>
                                        </td>
                                        <td class="td-actions">
                                            <template v-if="editingId === game.id">
                                                <button class="act-btn save" @click="confirmEdit(game.id)">✅</button>
                                                <button class="act-btn cancel" @click="editingId = null">✕</button>
                                            </template>
                                            <template v-else>
                                                <button class="act-btn edit" @click="startEdit(game)"
                                                    title="编辑">✏️</button>
                                                <button class="act-btn toggle" @click="toggleGame(game)"
                                                    :title="game.is_active ? '下架' : '上架'">
                                                    {{ game.is_active ? '⬇' : '⬆' }}
                                                </button>
                                                <button class="act-btn delete" @click="openDelete(game)"
                                                    title="永久删除">🗑</button>
                                            </template>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="games-empty" v-if="!store.games.length">
                                <span>🎮</span>
                                <p>没有找到游戏</p>
                            </div>
                        </div>
                        <div class="pagination" v-if="store.gamesPagination.totalPages > 1">
                            <button v-for="p in store.gamesPagination.totalPages" :key="p" class="page-btn"
                                :class="{ active: p === store.gamesPagination.page }" @click="loadGamesPage(p)">
                                {{ p }}
                            </button>
                        </div>
                    </div>
                </template>

                <!-- Tab：数据统计 ──────────────────────────────────────── -->
                <template v-if="activeTab === 'stats'">
                    <div class="stats-panel" v-if="store.stats">
                        <div class="stats-cards">
                            <div class="stat-card">
                                <div class="stat-num">{{ store.stats.total }}</div>
                                <div class="stat-label">游戏总数</div>
                            </div>
                            <div class="stat-card active">
                                <div class="stat-num">{{ store.stats.active }}</div>
                                <div class="stat-label">已上架</div>
                            </div>
                            <div class="stat-card inactive">
                                <div class="stat-num">{{ store.stats.inactive }}</div>
                                <div class="stat-label">已下架</div>
                            </div>
                            <div class="stat-card plays">
                                <div class="stat-num">{{ store.stats.totalPlays.toLocaleString() }}</div>
                                <div class="stat-label">总游玩次数</div>
                            </div>
                        </div>
                        <div class="stats-section">
                            <h4 class="stats-section-title">🔥 最热游戏 TOP 5</h4>
                            <div class="stats-rank">
                                <div class="rank-item" v-for="(g, i) in store.stats.topGames" :key="g.id">
                                    <span class="rank-no" :class="i < 3 ? `top${i + 1}` : ''">{{ i + 1 }}</span>
                                    <span class="rank-name">{{ g.name }}</span>
                                    <span class="rank-author">{{ g.author }}</span>
                                    <span class="rank-count">{{ g.play_count.toLocaleString() }} 次</span>
                                </div>
                            </div>
                        </div>
                        <div class="stats-section">
                            <h4 class="stats-section-title">🆕 最新入库</h4>
                            <div class="stats-rank">
                                <div class="rank-item" v-for="g in store.stats.recentGames" :key="g.id">
                                    <span class="rank-name">{{ g.name }}</span>
                                    <span class="rank-author">{{ g.author }}</span>
                                    <span class="rank-date">{{ new Date(g.created_at).toLocaleDateString('zh-CN')
                                    }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="stats-loading" v-else>
                        <span>🌸</span> 加载中…
                    </div>
                </template>

                <!-- ★ Tab：素材管理 ────────────────────────────────────── -->
                <!--
                    新增 Tab：内嵌 AdminAssetsView 组件。
                    admin-content-full 去掉 max-width 限制，让素材网格铺满页面宽度。
                -->
                <template v-if="activeTab === 'assets'">
                    <AdminAssetsView />
                </template>

                <!-- Tab：接口文档 ─────────────────────────────────────── -->
                <!--
                    改动：原版通过 getApiList() 从后端拉取 apiDoc，
                    现改为前端硬编码，完整覆盖所有接口（含新增的资源管理器接口），
                    不再依赖后端接口文档数据，离线也能查看。
                    渲染结构与原版完全兼容（ApiGroup / ApiItem 类型不变）。
                -->
                <template v-if="activeTab === 'api'">
                    <div class="api-panel">
                        <div class="api-header-card">
                            <div class="api-header-left">
                                <h3 class="api-doc-title">桜游戏屋 接口文档</h3>
                                <span class="api-version">v2.0</span>
                            </div>
                            <div class="api-header-right">
                                <div class="api-base-url">
                                    <span class="api-label">Base URL</span>
                                    <code>http://localhost:8802/api</code>
                                </div>
                                <div class="api-auth-note">
                                    <span class="api-label">认证方式</span>
                                    <code>x-admin-token: &lt;token&gt;</code>
                                </div>
                            </div>
                            <p class="api-note">
                                标注「🔒 需要」的接口须在请求头携带 <code>x-admin-token</code>。
                                Token 通过 <code>POST /api/admin/login</code> 获取，有效期 8 小时，登出后立即失效。
                            </p>
                        </div>

                        <div class="api-group" v-for="group in localApiDoc" :key="group.group">
                            <div class="api-group-header">
                                <span class="api-group-name">{{ group.group }}</span>
                                <code class="api-group-base">{{ group.base }}</code>
                                <span class="api-group-auth" v-if="group.auth">🔒 需要认证</span>
                            </div>
                            <div class="api-table-wrap">
                                <table class="api-table">
                                    <thead>
                                        <tr>
                                            <th>方法</th>
                                            <th>路径</th>
                                            <th>说明</th>
                                            <th>参数</th>
                                            <th>认证</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in group.items" :key="item.path + item.method">
                                            <td>
                                                <span class="method-badge" :class="item.method.toLowerCase()">
                                                    {{ item.method }}
                                                </span>
                                            </td>
                                            <td>
                                                <code class="api-path">{{ group.base }}{{ item.path }}</code>
                                            </td>
                                            <td class="api-desc">{{ item.desc }}</td>
                                            <td class="api-params">
                                                <span v-if="item.params === '-'" class="params-none">—</span>
                                                <span v-else>{{ item.params }}</span>
                                            </td>
                                            <td>
                                                <span class="auth-badge" :class="item.auth ? 'need' : 'open'">
                                                    {{ item.auth ? '🔒 需要' : '🌐 公开' }}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </template>

            </div>
        </template>

        <!-- ── 删除确认弹窗 ──────────────────────────────────────── -->
        <div class="modal-mask" v-if="deleteTarget" @click.self="deleteTarget = null">
            <div class="modal-box">
                <div class="modal-icon">⚠️</div>
                <h3>永久删除游戏</h3>
                <p>确认删除 <strong>「{{ deleteTarget.name }}」</strong>？</p>
                <p class="modal-warn">此操作不可恢复，游戏数据将从数据库中彻底删除。</p>
                <div class="modal-actions">
                    <button class="btn-cancel" @click="deleteTarget = null">取消</button>
                    <button class="btn-confirm-delete" @click="confirmDelete">确认删除</button>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useAdminStore, type SiteSettings, type AdminGame } from '@/stores/admin'
// ★ 新增：素材管理页面组件
import AdminAssetsView from '@/views/AdminAssetsView.vue'

const store = useAdminStore()

// ── 标签页（★ 新增 assets Tab）────────────────────────────────────
const tabs = [
    { value: 'settings' as const, label: '🎛 功能开关' },
    { value: 'games' as const, label: '🎮 游戏管理' },
    { value: 'stats' as const, label: '📊 数据统计' },
    { value: 'assets' as const, label: '🗂 素材管理' },   // ★ 新增
    { value: 'api' as const, label: '📋 接口文档' },
]

type TabValue = 'settings' | 'games' | 'stats' | 'assets' | 'api'

const activeTab = ref<TabValue>('settings')

function switchTab(tab: TabValue) {
    activeTab.value = tab
    if (tab === 'games' && !store.games.length) store.loadGames()
    if (tab === 'stats') store.loadStats()
    // assets / api Tab 不再需要异步加载（素材管理组件自己初始化，接口文档已硬编码）
}

// ── 登录 ──────────────────────────────────────────────────────────
const password = ref('')
const showPwd = ref(false)
const logging = ref(false)
const loginError = ref('')

async function doLogin() {
    if (!password.value.trim()) return
    logging.value = true
    loginError.value = ''
    try {
        await store.login(password.value)
        password.value = ''
        await store.loadSettings()
        syncLocal()
    } catch (e: any) {
        loginError.value = e.message
    } finally {
        logging.value = false
    }
}

async function doLogout() {
    if (!confirm('确认退出管理员登录？')) return
    await store.logout()
}

// ── 功能开关 ──────────────────────────────────────────────────────
const switches = [
    { key: 'editor_enabled', icon: '✏️', name: '游戏编辑器', desc: '允许用户在本地编写并预览游戏代码' },
    { key: 'upload_enabled', icon: '📤', name: '游戏上传', desc: '允许用户上传 .html / .vue / .ts 文件入库' },
]

const local = reactive<Record<string, boolean>>({
    editor_enabled: store.settings.editor_enabled,
    upload_enabled: store.settings.upload_enabled,
})

function syncLocal() {
    local.editor_enabled = store.settings.editor_enabled
    local.upload_enabled = store.settings.upload_enabled
}

watch(() => store.settings, syncLocal, { deep: true })

const isDirty = computed(() =>
    local.editor_enabled !== store.settings.editor_enabled ||
    local.upload_enabled !== store.settings.upload_enabled
)

function getSettingValue(key: string): boolean {
    return !!store.settings[key as keyof SiteSettings]
}

const saveResult = ref<'success' | 'error' | null>(null)
const saveError = ref('')

async function saveSettings() {
    saveResult.value = null
    try {
        await store.saveSettings({ ...local } as Partial<SiteSettings>)
        saveResult.value = 'success'
        setTimeout(() => { saveResult.value = null }, 3000)
    } catch (e: any) {
        saveResult.value = 'error'
        saveError.value = e.message
    }
}

// ── 游戏管理 ──────────────────────────────────────────────────────
const gameSearch = ref('')
const editingId = ref<number | null>(null)
const editForm = reactive({ name: '', tags: '', author: '', sort_order: 0 })
const deleteTarget = ref<AdminGame | null>(null)

let searchTimer: ReturnType<typeof setTimeout>
function onGameSearch() {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
        store.loadGames({ search: gameSearch.value, page: 1 })
    }, 350)
}

function loadGamesPage(page: number) {
    store.loadGames({ search: gameSearch.value, page })
}

function splitTags(tags: string) {
    return tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
}

function startEdit(game: AdminGame) {
    editingId.value = game.id
    editForm.name = game.name
    editForm.tags = game.tags
    editForm.author = game.author
    editForm.sort_order = game.sort_order
}

async function confirmEdit(id: number) {
    try {
        await store.updateGame(id, { ...editForm })
        editingId.value = null
    } catch (e: any) {
        alert('更新失败：' + e.message)
    }
}

function openDelete(game: AdminGame) { deleteTarget.value = game }

async function confirmDelete() {
    if (!deleteTarget.value) return
    try {
        await store.deleteGame(deleteTarget.value.id)
        deleteTarget.value = null
    } catch (e: any) {
        alert('删除失败：' + e.message)
    }
}

async function toggleGame(game: AdminGame) {
    try {
        await store.toggleGame(game.id)
    } catch (e: any) {
        alert('操作失败：' + e.message)
    }
}

// ── 接口文档（★ 改为前端硬编码，完整覆盖所有接口）─────────────────
// 原版从 getApiList() 拉取后端数据渲染，但后端接口文档未包含资源管理器接口，
// 且离线状态下无法查看。现改为硬编码，与原版 ApiGroup/ApiItem 结构完全兼容。

interface ApiItem {
    method: string
    path: string
    auth: boolean
    desc: string
    params: string
}
interface ApiGroup {
    group: string
    base: string
    auth: boolean
    items: ApiItem[]
}

const localApiDoc: ApiGroup[] = [
    // ── 健康检查 ──────────────────────────────────────────────
    {
        group: '🏥 健康检查', base: '/api', auth: false,
        items: [
            { method: 'GET', path: '/health', auth: false, desc: '服务健康检查，返回 DB 实际连接状态及运行时间', params: '-' },
        ],
    },
    // ── 游戏接口 ──────────────────────────────────────────────
    {
        group: '🎮 游戏接口', base: '/api/games', auth: false,
        items: [
            { method: 'GET', path: '', auth: false, desc: '游戏列表（分页 + 搜索 + 标签 + 排序）', params: 'search, tags, page, limit, sort(order/newest/hottest)' },
            { method: 'GET', path: '/:id', auth: false, desc: '游戏详情（含完整 game_code）', params: '-' },
            { method: 'POST', path: '', auth: true, desc: '新增游戏', params: 'name*, game_code*, description, tags, author, image_url, sort_order, game_type' },
            { method: 'PUT', path: '/:id', auth: true, desc: '更新游戏（字段全可选）', params: 'name, game_code, description, tags, author, image_url, sort_order' },
            { method: 'DELETE', path: '/:id', auth: true, desc: '下架游戏（软删除，is_active=0）', params: '-' },
            { method: 'POST', path: '/:id/play', auth: false, desc: '记录游玩次数（play_count + 1）', params: '-' },
        ],
    },
    // ── 存档接口 ──────────────────────────────────────────────
    {
        group: '💾 存档接口', base: '/api/saves', auth: false,
        items: [
            { method: 'GET', path: '/:gameId', auth: false, desc: '获取某游戏所有存档槽（不含存档数据本体）', params: 'save_key' },
            { method: 'GET', path: '/:gameId/:slot', auth: false, desc: '读取单个存档槽（含完整 save_data）', params: 'save_key' },
            { method: 'POST', path: '/:gameId/:slot', auth: false, desc: '写入/覆盖存档（slot 范围 1~5，自动 UPSERT）', params: 'save_key*, save_data*(≤500KB), save_name, play_time' },
            { method: 'DELETE', path: '/:gameId/:slot', auth: false, desc: '删除存档', params: 'save_key' },
        ],
    },
    // ── 上传接口 ──────────────────────────────────────────────
    {
        group: '📤 上传接口', base: '/api/upload', auth: true,
        items: [
            { method: 'POST', path: '/game', auth: true, desc: '上传游戏文件（.html/.vue/.ts，≤10MB，勿手动设 Content-Type）', params: 'file*, name*, description, tags, author, sort_order' },
        ],
    },
    // ── 资源管理器接口（★ 新增）──────────────────────────────
    {
        group: '🗂 资源管理器接口', base: '/api/assets', auth: false,
        items: [
            { method: 'GET', path: '/quota', auth: false, desc: '全站云端资源用量与上限（used/limit/pct）', params: '-' },
            { method: 'GET', path: '/game/:gameId', auth: false, desc: '获取游戏可用资源（游戏专属 + 公共资源）', params: '-' },
            { method: 'GET', path: '', auth: false, desc: '资源列表（分页，不含 data 字段）', params: 'type(image/audio/json/text/other), game_id("null"=仅公共), page, limit' },
            { method: 'GET', path: '/:id', auth: false, desc: '单个资源详情（含 data_uri，可直接嵌入 HTML）', params: '-' },
            { method: 'POST', path: '', auth: true, desc: '上传资源文件（multipart，≤2MB，见支持的 MIME 类型）', params: 'file*, game_id("null"=公共资源)' },
            { method: 'DELETE', path: '/:id', auth: true, desc: '删除资源（不会自动移除已嵌入游戏代码的引用）', params: '-' },
        ],
    },
    // ── 管理员接口 ────────────────────────────────────────────
    {
        group: '🔐 管理员接口', base: '/api/admin', auth: true,
        items: [
            { method: 'POST', path: '/login', auth: false, desc: '管理员登录，返回 JWT token（有效期 8 小时）', params: 'password*' },
            { method: 'POST', path: '/logout', auth: true, desc: '登出（token 加入黑名单立即失效）', params: '-' },
            { method: 'GET', path: '/settings', auth: false, desc: '获取站点配置（公开）', params: '-' },
            { method: 'PUT', path: '/settings', auth: true, desc: '更新站点配置', params: 'key*(editor_enabled/upload_enabled), value*("1"/"0")' },
            { method: 'GET', path: '/games', auth: true, desc: '管理游戏列表（含下架，支持搜索/状态/排序筛选）', params: 'search, status(active/inactive), sort, page, limit' },
            { method: 'PUT', path: '/games/:id', auth: true, desc: '编辑游戏（名称/描述/标签/作者/封面/权重/代码，全可选）', params: 'name, description, tags, author, image_url, sort_order, game_code' },
            { method: 'DELETE', path: '/games/:id', auth: true, desc: '永久删除游戏（不可恢复）', params: '-' },
            { method: 'PUT', path: '/games/:id/toggle', auth: true, desc: '切换游戏上下架（is_active 取反）', params: '-' },
            { method: 'GET', path: '/stats', auth: true, desc: '数据统计（总数/游玩数/最热TOP5/最新入库/资源数量）', params: '-' },
            { method: 'GET', path: '/api-list', auth: true, desc: '获取全部接口列表（原版接口文档数据源）', params: '-' },
        ],
    },
]
</script>

<style scoped>
/* ── 登录 ─────────────────────────────────────────────────────── */
.login-wrap {
    min-height: calc(100vh - 100px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.login-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 40px 36px;
    width: min(420px, 100%);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.login-icon {
    font-size: 3rem;
}

.login-title {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 900;
    color: var(--ink-900);
}

.login-sub {
    font-size: 0.85rem;
    color: var(--ink-400);
    margin-bottom: 6px;
}

.form-row {
    width: 100%;
    position: relative;
    display: flex;
    align-items: center;
}

.pwd-input {
    width: 100%;
    padding: 11px 44px 11px 16px;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    font-size: 0.95rem;
    outline: none;
    background: var(--bg);
    color: var(--ink-900);
    font-family: var(--font-body);
    transition: border-color 0.2s;
}

.pwd-input:focus {
    border-color: var(--sakura-400);
}

.pwd-input.error {
    border-color: #e05a5a;
}

.pwd-toggle {
    position: absolute;
    right: 12px;
    background: none;
    font-size: 1rem;
    color: var(--ink-400);
    transition: color 0.2s;
}

.pwd-toggle:hover {
    color: var(--sakura-500);
}

.field-error {
    font-size: 0.78rem;
    color: #e05a5a;
    align-self: flex-start;
}

.btn-login {
    width: 100%;
    margin-top: 4px;
    padding: 12px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
    color: #fff;
    font-weight: 700;
    font-size: 1rem;
    transition: all 0.2s;
    border: none;
}

.btn-login:hover:not(:disabled) {
    opacity: 0.88;
}

.btn-login:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* ── Hero ─────────────────────────────────────────────────────── */
.admin-hero {
    background: linear-gradient(160deg, #1a1a2e 0%, #16213e 100%);
    border-bottom: 1px solid #2a2a44;
    padding: 32px 24px 0;
}

.admin-hero-inner {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding-bottom: 0;
}

.admin-hero-title {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 900;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: auto;
}

.hero-tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

.hero-tab {
    padding: 8px 20px;
    border-radius: 10px 10px 0 0;
    font-size: 0.88rem;
    font-weight: 600;
    color: #888;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
    cursor: pointer;
}

.hero-tab:hover {
    color: #fff;
}

.hero-tab.active {
    color: #fff;
    border-bottom-color: var(--sakura-400);
    background: #ffffff10;
}

.btn-logout {
    padding: 7px 18px;
    border-radius: 20px;
    border: 1.5px solid #3a3a5a;
    color: #aaa;
    font-size: 0.82rem;
    background: transparent;
    transition: all 0.2s;
}

.btn-logout:hover {
    border-color: #e05a5a;
    color: #e05a5a;
}

/* ── Content ──────────────────────────────────────────────────── */
.admin-content {
    max-width: 1000px;
    margin: 0 auto;
    padding: 24px 20px 60px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* ★ 素材管理 Tab 不限制宽度，让网格铺满 */
.admin-content-full {
    max-width: 100%;
    padding: 0;
}

/* ── 开关卡片 ─────────────────────────────────────────────────── */
.settings-card,
.status-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
    box-shadow: var(--shadow);
}

.card-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--ink-900);
    margin-bottom: 6px;
}

.card-desc {
    font-size: 0.82rem;
    color: var(--ink-400);
    margin-bottom: 20px;
}

.switch-list {
    display: flex;
    flex-direction: column;
}

.switch-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid var(--border);
}

.switch-item:last-child {
    border-bottom: none;
}

.switch-info {
    display: flex;
    align-items: center;
    gap: 14px;
}

.switch-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
}

.switch-name {
    font-weight: 600;
    color: var(--ink-900);
    font-size: 0.95rem;
    margin-bottom: 3px;
}

.switch-desc {
    font-size: 0.78rem;
    color: var(--ink-400);
}

.switch-control {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
}

.switch-status {
    font-size: 0.75rem;
    font-weight: 600;
}

.switch-status.on {
    color: #2e7d4f;
}

.switch-status.off {
    color: #c0392b;
}

.toggle-btn {
    width: 52px;
    height: 28px;
    border-radius: 14px;
    background: #e0e0e0;
    position: relative;
    transition: background 0.25s;
    flex-shrink: 0;
    cursor: pointer;
    border: none;
}

.toggle-btn.active {
    background: var(--sakura-500);
}

.toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px #0002;
    transition: transform 0.25s;
    display: block;
}

.toggle-btn.active .toggle-thumb {
    transform: translateX(24px);
}

.card-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
}

.unsaved-tip {
    font-size: 0.78rem;
    color: #e8a020;
    font-weight: 500;
}

.btn-save {
    padding: 9px 26px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
    color: #fff;
    font-weight: 700;
    font-size: 0.88rem;
    transition: all 0.2s;
    border: none;
}

.btn-save:hover:not(:disabled) {
    opacity: 0.88;
}

.btn-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.save-result {
    margin-top: 12px;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
}

.save-result.success {
    background: #e8fdf0;
    color: #2e7d4f;
    border: 1px solid #b2dfcc;
}

.save-result.error {
    background: #fff0f0;
    color: #c0392b;
    border: 1px solid #f5c6cb;
}

.status-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 14px;
}

.status-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 500;
}

.status-item.enabled {
    background: #e8fdf0;
    border: 1px solid #b2dfcc;
    color: #2e7d4f;
}

.status-item.disabled {
    background: #fff0f0;
    border: 1px solid #f5c6cb;
    color: #c0392b;
}

.status-badge {
    font-size: 0.78rem;
}

/* ── 游戏管理 ─────────────────────────────────────────────────── */
.games-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
    box-shadow: var(--shadow);
}

.games-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.games-search-box {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    padding: 8px 14px;
    transition: border-color 0.2s;
}

.games-search-box:focus-within {
    border-color: var(--sakura-400);
}

.games-search-box input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 0.88rem;
    background: transparent;
    color: var(--ink-900);
    font-family: var(--font-body);
}

.games-total {
    font-size: 0.8rem;
    color: var(--ink-400);
    white-space: nowrap;
}

.games-loading {
    text-align: center;
    padding: 40px;
    color: var(--ink-400);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.games-table-wrap {
    overflow-x: auto;
}

.games-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.83rem;
}

.games-table th {
    padding: 10px 12px;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--ink-400);
    border-bottom: 2px solid var(--border);
    white-space: nowrap;
}

.games-table td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
}

.games-table tr.inactive td {
    opacity: 0.5;
}

.td-id {
    color: var(--ink-400);
    font-size: 0.75rem;
}

.td-name {
    min-width: 160px;
}

.game-name-cell {
    font-weight: 600;
    color: var(--ink-900);
}

.game-desc-cell {
    font-size: 0.75rem;
    color: var(--ink-400);
    margin-top: 2px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.td-tags {
    min-width: 100px;
}

.tag {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 10px;
    background: var(--sakura-50, #fff0f5);
    color: var(--sakura-600);
    font-size: 0.72rem;
    margin: 2px 2px 2px 0;
}

.td-count,
.td-sort {
    text-align: center;
    white-space: nowrap;
}

.status-dot {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
}

.status-dot.on {
    background: #e8fdf0;
    color: #2e7d4f;
}

.status-dot.off {
    background: #fff0f0;
    color: #c0392b;
}

.td-actions {
    display: flex;
    gap: 4px;
    align-items: center;
}

.act-btn {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.8rem;
    border: 1px solid var(--border);
    background: none;
    cursor: pointer;
    transition: all 0.15s;
}

.act-btn.save:hover {
    background: #e8fdf0;
    border-color: #b2dfcc;
}

.act-btn.cancel:hover {
    background: #fff0f0;
    border-color: #f5c6cb;
}

.act-btn.edit:hover {
    background: var(--sakura-50, #fff0f5);
    border-color: var(--sakura-300);
}

.act-btn.toggle:hover {
    background: #fef9e7;
    border-color: #f0d060;
}

.act-btn.delete:hover {
    background: #fff0f0;
    border-color: #f5c6cb;
}

.inline-input {
    padding: 4px 8px;
    border: 1.5px solid var(--sakura-400);
    border-radius: 6px;
    font-size: 0.82rem;
    outline: none;
    width: 100%;
    background: var(--bg);
    color: var(--ink-900);
    font-family: var(--font-body);
}

.w60 {
    width: 60px;
}

.games-empty {
    text-align: center;
    padding: 40px;
    color: var(--ink-400);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-size: 1.5rem;
}

.games-empty p {
    font-size: 0.88rem;
}

.pagination {
    display: flex;
    gap: 6px;
    justify-content: center;
    margin-top: 20px;
    flex-wrap: wrap;
}

.page-btn {
    min-width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 1.5px solid var(--border);
    background: var(--surface);
    color: var(--ink-600);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
}

.page-btn:hover {
    border-color: var(--sakura-400);
    color: var(--sakura-600);
}

.page-btn.active {
    background: var(--sakura-500);
    border-color: var(--sakura-500);
    color: #fff;
}

/* ── 数据统计 ─────────────────────────────────────────────────── */
.stats-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.stats-loading {
    text-align: center;
    padding: 60px;
    color: var(--ink-400);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 1.2rem;
}

.stats-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
}

.stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    text-align: center;
    box-shadow: var(--shadow);
}

.stat-card.active {
    border-color: #b2dfcc;
    background: #f0fff8;
}

.stat-card.inactive {
    border-color: #f5c6cb;
    background: #fff5f5;
}

.stat-card.plays {
    border-color: var(--sakura-200);
    background: var(--sakura-50, #fff0f5);
}

.stat-num {
    font-size: 2rem;
    font-weight: 900;
    color: var(--sakura-600);
    font-variant-numeric: tabular-nums;
}

.stat-label {
    font-size: 0.78rem;
    color: var(--ink-400);
    margin-top: 4px;
}

.stats-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    box-shadow: var(--shadow);
}

.stats-section-title {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--ink-900);
    margin-bottom: 14px;
}

.stats-rank {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.rank-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    font-size: 0.85rem;
}

.rank-no {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 800;
    background: var(--sakura-100, #ffe0ee);
    color: var(--sakura-600);
    flex-shrink: 0;
}

.rank-no.top1 {
    background: #fef9c3;
    color: #92400e;
}

.rank-no.top2 {
    background: #e2e8f0;
    color: #475569;
}

.rank-no.top3 {
    background: #fed7aa;
    color: #9a3412;
}

.rank-name {
    flex: 1;
    font-weight: 600;
    color: var(--ink-900);
}

.rank-author {
    font-size: 0.78rem;
    color: var(--ink-400);
}

.rank-count {
    font-size: 0.82rem;
    color: var(--sakura-500);
    font-weight: 600;
    white-space: nowrap;
}

.rank-date {
    font-size: 0.78rem;
    color: var(--ink-400);
    white-space: nowrap;
}

/* ── 接口文档 ─────────────────────────────────────────────────── */
.api-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.api-header-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
    box-shadow: var(--shadow);
    display: grid;
    gap: 12px;
}

.api-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.api-doc-title {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--ink-900);
}

.api-version {
    padding: 2px 10px;
    border-radius: 20px;
    background: var(--sakura-100, #ffe0ee);
    color: var(--sakura-600);
    font-size: 0.75rem;
    font-weight: 700;
}

.api-header-right {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
}

.api-base-url,
.api-auth-note {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
}

.api-label {
    color: var(--ink-400);
    font-weight: 600;
}

.api-base-url code,
.api-auth-note code {
    background: #1a1a2e;
    color: #e0d0ff;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 0.78rem;
}

.api-note {
    font-size: 0.8rem;
    color: var(--ink-400);
    line-height: 1.6;
    padding: 10px 14px;
    background: var(--sakura-50, #fff5f8);
    border-radius: 8px;
    border-left: 3px solid var(--sakura-400);
}

.api-note code {
    background: #1a1a2e;
    color: #e0d0ff;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.76rem;
}

.api-group {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow);
}

.api-group-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    flex-wrap: wrap;
}

.api-group-name {
    font-size: 0.92rem;
    font-weight: 700;
    color: #fff;
}

.api-group-base {
    padding: 2px 10px;
    border-radius: 6px;
    background: #ffffff18;
    color: #b0c4de;
    font-size: 0.78rem;
}

.api-group-auth {
    margin-left: auto;
    font-size: 0.75rem;
    padding: 2px 10px;
    border-radius: 10px;
    background: #fef3c720;
    color: #fcd34d;
    font-weight: 600;
}

.api-table-wrap {
    overflow-x: auto;
}

.api-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.83rem;
}

.api-table th {
    padding: 10px 14px;
    text-align: left;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--ink-400);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
    background: var(--bg);
}

.api-table td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
}

.api-table tr:last-child td {
    border-bottom: none;
}

.method-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 5px;
    font-size: 0.72rem;
    font-weight: 800;
    font-family: monospace;
    white-space: nowrap;
}

.method-badge.get {
    background: #d1fae5;
    color: #065f46;
}

.method-badge.post {
    background: #dbeafe;
    color: #1e40af;
}

.method-badge.put {
    background: #fef3c7;
    color: #92400e;
}

.method-badge.delete {
    background: #fee2e2;
    color: #991b1b;
}

.api-path {
    font-size: 0.8rem;
    background: var(--sakura-50, #fff5f8);
    padding: 2px 7px;
    border-radius: 5px;
    color: var(--ink-700);
    white-space: nowrap;
}

.api-desc {
    color: var(--ink-600);
    font-size: 0.82rem;
    min-width: 180px;
}

.api-params {
    font-size: 0.75rem;
    color: var(--ink-400);
    max-width: 260px;
    line-height: 1.5;
}

.params-none {
    color: var(--ink-300);
}

.auth-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
}

.auth-badge.need {
    background: #fef3c7;
    color: #92400e;
}

.auth-badge.open {
    background: #d1fae5;
    color: #065f46;
}

/* ── 删除弹窗 ─────────────────────────────────────────────────── */
.modal-mask {
    position: fixed;
    inset: 0;
    background: #0007;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 24px;
}

.modal-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    width: min(440px, 100%);
    box-shadow: 0 20px 60px #0005;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.modal-icon {
    font-size: 2.5rem;
}

.modal-box h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--ink-900);
}

.modal-box p {
    font-size: 0.9rem;
    color: var(--ink-600);
}

.modal-warn {
    font-size: 0.8rem;
    color: #c0392b;
    background: #fff0f0;
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid #f5c6cb;
}

.modal-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 8px;
}

.btn-cancel {
    padding: 9px 24px;
    border-radius: 8px;
    border: 1.5px solid var(--border);
    background: none;
    color: var(--ink-500);
    font-size: 0.88rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-cancel:hover {
    border-color: var(--ink-400);
    color: var(--ink-700);
}

.btn-confirm-delete {
    padding: 9px 24px;
    border-radius: 8px;
    background: #c0392b;
    color: #fff;
    font-weight: 700;
    font-size: 0.88rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-confirm-delete:hover {
    background: #a93226;
}

/* ── 响应式 ───────────────────────────────────────────────────── */
@media (max-width: 640px) {
    .admin-hero-inner {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }

    .hero-tabs {
        width: 100%;
        overflow-x: auto;
        padding-bottom: 2px;
    }

    .hero-tab {
        padding: 6px 12px;
        font-size: 0.8rem;
        white-space: nowrap;
    }

    .status-grid {
        grid-template-columns: 1fr;
    }

    .api-header-right {
        flex-direction: column;
        gap: 8px;
    }
}
</style>