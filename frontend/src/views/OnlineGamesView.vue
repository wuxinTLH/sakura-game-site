<template>
    <div class="og-page">
        <!-- 顶部标题栏 -->
        <div class="og-hero">
            <div class="og-hero-inner">
                <div class="og-hero-text">
                    <h1 class="og-title">🎮 在线游戏管理</h1>
                    <p class="og-subtitle">管理数据库中的全部游戏，支持编辑、上下架、删除</p>
                </div>
                <div class="og-hero-stats">
                    <div class="stat-pill">
                        <span class="stat-n">{{ store.total }}</span>
                        <span class="stat-l">总计</span>
                    </div>
                    <div class="stat-pill active">
                        <span class="stat-n">{{ store.activeCount }}</span>
                        <span class="stat-l">上架中</span>
                    </div>
                    <div class="stat-pill inactive">
                        <span class="stat-n">{{ store.inactiveCount }}</span>
                        <span class="stat-l">已下架</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 工具栏 -->
        <div class="og-toolbar">
            <div class="og-toolbar-inner">
                <!-- 搜索 -->
                <div class="search-wrap">
                    <span class="search-icon">🔍</span>
                    <input v-model="query.search" class="og-search" placeholder="搜索游戏名称、标签、作者…"
                        @input="onSearchInput" />
                    <button v-if="query.search" class="search-clear" @click="clearSearch">✕</button>
                </div>

                <!-- 状态筛选 -->
                <div class="filter-tabs">
                    <button v-for="f in statusFilters" :key="f.value" class="filter-tab"
                        :class="{ active: query.status === f.value }" @click="setStatus(f.value)">
                        {{ f.label }}
                    </button>
                </div>

                <!-- 排序 -->
                <select v-model="query.sort" class="og-select" @change="loadGames(1)">
                    <option value="newest">最新入库</option>
                    <option value="hottest">最多游玩</option>
                    <option value="order">权重排序</option>
                </select>

                <!-- 每页数量 -->
                <select v-model="query.limit" class="og-select og-select-sm" @change="loadGames(1)">
                    <option :value="10">10条/页</option>
                    <option :value="20">20条/页</option>
                    <option :value="50">50条/页</option>
                </select>
            </div>
        </div>

        <!-- 主体：表格 -->
        <div class="og-main">
            <!-- 加载中 -->
            <div v-if="store.loading" class="og-loading">
                <span class="loading-spin">🌸</span>
                <span>加载中…</span>
            </div>

            <!-- 空状态 -->
            <div v-else-if="store.games.length === 0" class="og-empty">
                <div class="og-empty-icon">🎮</div>
                <div class="og-empty-text">暂无游戏</div>
                <div class="og-empty-sub">尝试清空搜索条件</div>
            </div>

            <!-- 游戏表格 -->
            <div v-else class="og-table-wrap">
                <table class="og-table">
                    <thead>
                        <tr>
                            <th style="width:48px">ID</th>
                            <th>游戏名称</th>
                            <th style="width:160px">标签</th>
                            <th style="width:80px">作者</th>
                            <th style="width:70px">游玩数</th>
                            <th style="width:70px">权重</th>
                            <th style="width:64px">状态</th>
                            <th style="width:80px">入库时间</th>
                            <th style="width:160px">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="game in store.games" :key="game.id" class="og-row"
                            :class="{ inactive: !game.is_active }">
                            <td class="td-id">{{ game.id }}</td>
                            <td class="td-name">
                                <div class="game-name">{{ game.name }}</div>
                                <div v-if="game.description" class="game-desc">{{ game.description }}</div>
                            </td>
                            <td class="td-tags">
                                <span v-for="tag in parseTags(game.tags)" :key="tag" class="tag-chip">{{ tag }}</span>
                            </td>
                            <td class="td-author">{{ game.author || '—' }}</td>
                            <td class="td-num">{{ game.play_count }}</td>
                            <td class="td-num">{{ game.sort_order }}</td>
                            <td class="td-status">
                                <span class="status-badge" :class="game.is_active ? 'on' : 'off'">
                                    {{ game.is_active ? '上架' : '下架' }}
                                </span>
                            </td>
                            <td class="td-date">{{ formatDate(game.created_at) }}</td>
                            <td class="td-actions">
                                <button class="btn-act btn-preview" title="在新窗口预览" @click="previewGame(game)">
                                    👁
                                </button>
                                <button class="btn-act btn-edit" title="编辑" @click="openEdit(game)">
                                    ✏️
                                </button>
                                <button class="btn-act" :class="game.is_active ? 'btn-toggle-off' : 'btn-toggle-on'"
                                    :title="game.is_active ? '下架' : '上架'" @click="toggleGame(game)">
                                    {{ game.is_active ? '⬇' : '⬆' }}
                                </button>
                                <button class="btn-act btn-del" title="永久删除" @click="deleteGame(game)">
                                    🗑
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- 分页 -->
            <div v-if="store.pagination.pages > 1" class="og-pagination">
                <button class="pg-btn" :disabled="store.pagination.page <= 1"
                    @click="loadGames(store.pagination.page - 1)">‹</button>
                <button v-for="p in pageList" :key="p" class="pg-btn"
                    :class="{ active: p === store.pagination.page, ellipsis: p === '…' }" :disabled="p === '…'"
                    @click="p !== '…' && loadGames(Number(p))">{{ p }}</button>
                <button class="pg-btn" :disabled="store.pagination.page >= store.pagination.pages"
                    @click="loadGames(store.pagination.page + 1)">›</button>
                <span class="pg-info">共 {{ store.total }} 条</span>
            </div>
        </div>

        <!-- ── 编辑弹窗 ─────────────────────────────────────────── -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="editOpen" class="modal-overlay" @click.self="closeEdit">
                    <div class="modal-panel">
                        <div class="modal-header">
                            <span class="modal-title">✏️ 编辑游戏 · #{{ editForm.id }}</span>
                            <button class="modal-close" @click="closeEdit">✕</button>
                        </div>

                        <div class="modal-body">
                            <!-- 基本信息 -->
                            <div class="form-section">基本信息</div>

                            <div class="form-row">
                                <label class="form-label">游戏名称 <em>*</em></label>
                                <input v-model="editForm.name" class="form-input" placeholder="游戏名称" maxlength="255" />
                            </div>

                            <div class="form-row">
                                <label class="form-label">游戏介绍</label>
                                <textarea v-model="editForm.description" class="form-textarea" placeholder="游戏介绍（可选）"
                                    rows="3" maxlength="1000" />
                            </div>

                            <div class="form-grid">
                                <div class="form-row">
                                    <label class="form-label">标签</label>
                                    <input v-model="editForm.tags" class="form-input" placeholder="逗号分隔，如：益智,休闲"
                                        maxlength="500" />
                                </div>
                                <div class="form-row">
                                    <label class="form-label">作者</label>
                                    <input v-model="editForm.author" class="form-input" placeholder="作者名"
                                        maxlength="100" />
                                </div>
                            </div>

                            <div class="form-grid">
                                <div class="form-row">
                                    <label class="form-label">排序权重</label>
                                    <input v-model.number="editForm.sort_order" class="form-input" type="number" min="0"
                                        placeholder="数值越大越靠前" />
                                </div>
                                <div class="form-row">
                                    <label class="form-label">封面图 URL</label>
                                    <input v-model="editForm.image_url" class="form-input"
                                        placeholder="https://… 或留空" />
                                </div>
                            </div>

                            <!-- 代码编辑 -->
                            <div class="form-section">
                                游戏代码
                                <span class="form-section-sub">（修改后将覆盖数据库中的 game_code）</span>
                            </div>
                            <div class="code-toolbar">
                                <span class="code-bytes">{{ codeBytes }}</span>
                                <button class="btn-code-toggle" @click="showCode = !showCode">
                                    {{ showCode ? '收起代码' : '展开编辑代码' }}
                                </button>
                            </div>
                            <Transition name="expand">
                                <textarea v-if="showCode" v-model="editForm.game_code" class="form-code" rows="16"
                                    spellcheck="false" placeholder="完整 HTML 游戏代码…" />
                            </Transition>
                        </div>

                        <div class="modal-footer">
                            <div class="modal-footer-left">
                                <span class="footer-tip">{{ saveStatus }}</span>
                            </div>
                            <div class="modal-footer-right">
                                <button class="btn-cancel" @click="closeEdit">取消</button>
                                <button class="btn-save" :disabled="saving" @click="saveEdit">
                                    {{ saving ? '保存中…' : '💾 保存' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- ── 预览弹窗 ─────────────────────────────────────────── -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="previewOpen" class="modal-overlay preview-overlay" @click.self="previewOpen = false">
                    <div class="preview-panel">
                        <div class="preview-header">
                            <span class="modal-title">👁 预览：{{ previewGame_.name }}</span>
                            <div style="display:flex;gap:8px">
                                <button class="btn-fullscreen" @click="openFullscreen">⛶ 全屏</button>
                                <button class="modal-close" @click="previewOpen = false">✕</button>
                            </div>
                        </div>
                        <iframe ref="previewIframe" class="preview-iframe" sandbox="allow-scripts allow-same-origin"
                            :srcdoc="previewGame_.game_code" />
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useOnlineGamesStore } from '@/stores/onlineGames'
import { adminUpdateGame, adminDeleteGame, adminToggleGame } from '@/api/admin'

// ── Store ─────────────────────────────────────────────────────
const store = useOnlineGamesStore()

// ── 查询参数 ──────────────────────────────────────────────────
const query = ref({
    search: '',
    status: 'all' as 'all' | 'active' | 'inactive',
    sort: 'newest' as 'newest' | 'hottest' | 'order',
    limit: 20,
})

const statusFilters = [
    { label: '全部', value: 'all' },
    { label: '上架中', value: 'active' },
    { label: '已下架', value: 'inactive' },
]

// 防抖搜索
let searchTimer: ReturnType<typeof setTimeout>
function onSearchInput() {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => loadGames(1), 400)
}

function clearSearch() {
    query.value.search = ''
    loadGames(1)
}

function setStatus(v: string) {
    query.value.status = v as typeof query.value.status
    loadGames(1)
}

// ── 加载数据 ──────────────────────────────────────────────────
async function loadGames(page = 1) {
    await store.fetchGames({
        page,
        limit: query.value.limit,
        search: query.value.search || undefined,
        status: query.value.status === 'all' ? undefined : query.value.status,
        sort: query.value.sort,
    })
}

onMounted(() => loadGames(1))

// ── 分页列表 ──────────────────────────────────────────────────
const pageList = computed(() => {
    const { page, pages } = store.pagination
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    const list: (number | string)[] = [1]
    if (page > 3) list.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) list.push(i)
    if (page < pages - 2) list.push('…')
    list.push(pages)
    return list
})

// ── 工具函数 ──────────────────────────────────────────────────
function parseTags(tags: string): string[] {
    return tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
}

function formatDate(dt: string): string {
    if (!dt) return '—'
    const d = new Date(dt)
    return `${d.getMonth() + 1}/${d.getDate()}`
}

// ── 下架 / 上架 ──────────────────────────────────────────────
async function toggleGame(game: { id: number; name: string; is_active: number }) {
    const action = game.is_active ? '下架' : '上架'
    if (!confirm(`确认${action}游戏「${game.name}」？`)) return
    try {
        await adminToggleGame(game.id)
        await loadGames(store.pagination.page)
    } catch (e: any) {
        alert(`操作失败：${e.message}`)
    }
}

// ── 永久删除 ─────────────────────────────────────────────────
async function deleteGame(game: { id: number; name: string }) {
    if (!confirm(`确认永久删除游戏「${game.name}」？\n此操作不可恢复，存档数据也将一并清除。`)) return
    try {
        await adminDeleteGame(game.id)
        await loadGames(store.pagination.page)
    } catch (e: any) {
        alert(`删除失败：${e.message}`)
    }
}

// ── 编辑弹窗 ─────────────────────────────────────────────────
interface EditForm {
    id: number
    name: string
    description: string
    tags: string
    author: string
    sort_order: number
    image_url: string
    game_code: string
}

const editOpen = ref(false)
const saving = ref(false)
const showCode = ref(false)
const saveStatus = ref('')
const editForm = ref<EditForm>({
    id: 0, name: '', description: '', tags: '',
    author: '', sort_order: 0, image_url: '', game_code: '',
})

const codeBytes = computed(() => {
    const bytes = new Blob([editForm.value.game_code]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
})

function openEdit(game: any) {
    editForm.value = {
        id: game.id,
        name: game.name ?? '',
        description: game.description ?? '',
        tags: game.tags ?? '',
        author: game.author ?? '',
        sort_order: game.sort_order ?? 0,
        image_url: game.image_url ?? '',
        game_code: game.game_code ?? '',
    }
    showCode.value = false
    saveStatus.value = ''
    editOpen.value = true
}

function closeEdit() {
    editOpen.value = false
}

async function saveEdit() {
    if (!editForm.value.name.trim()) {
        saveStatus.value = '⚠️ 游戏名称不能为空'
        return
    }
    saving.value = true
    saveStatus.value = ''
    try {
        await adminUpdateGame(editForm.value.id, {
            name: editForm.value.name.trim(),
            description: editForm.value.description.trim(),
            tags: editForm.value.tags.trim(),
            author: editForm.value.author.trim(),
            sort_order: Number(editForm.value.sort_order) || 0,
            image_url: editForm.value.image_url.trim(),
            game_code: editForm.value.game_code,
        })
        saveStatus.value = '✅ 保存成功'
        await loadGames(store.pagination.page)
        setTimeout(() => { editOpen.value = false }, 800)
    } catch (e: any) {
        saveStatus.value = `❌ ${e.message}`
    } finally {
        saving.value = false
    }
}

// ── 预览弹窗 ─────────────────────────────────────────────────
const previewOpen = ref(false)
const previewIframe = ref<HTMLIFrameElement | null>(null)
const previewGame_ = ref<{ name: string; game_code: string }>({ name: '', game_code: '' })

function previewGame(game: any) {
    previewGame_.value = { name: game.name, game_code: game.game_code }
    previewOpen.value = true
}

function openFullscreen() {
    if (previewIframe.value?.requestFullscreen) {
        previewIframe.value.requestFullscreen()
    }
}

// 关闭弹窗时恢复滚动
watch([editOpen, previewOpen], ([e, p]) => {
    document.body.style.overflow = (e || p) ? 'hidden' : ''
})
</script>

<style scoped>
/* ── 页面骨架 ──────────────────────────────────────────────── */
.og-page {
    min-height: 100vh;
    background: var(--sakura-50, #fff5f8);
}

/* ── Hero ───────────────────────────────────────────────────── */
.og-hero {
    background: linear-gradient(135deg, var(--sakura-500, #e87da0), var(--sakura-600, #c44d75));
    color: #fff;
    padding: 32px 0 28px;
}

.og-hero-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
}

.og-title {
    font-size: 1.6rem;
    font-weight: 900;
    letter-spacing: 1px;
    margin-bottom: 6px;
}

.og-subtitle {
    font-size: 0.88rem;
    opacity: 0.85;
}

.og-hero-stats {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.stat-pill {
    background: rgba(255, 255, 255, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    padding: 10px 18px;
    text-align: center;
    min-width: 70px;
}

.stat-pill.active {
    background: rgba(110, 231, 183, 0.25);
    border-color: rgba(110, 231, 183, 0.5);
}

.stat-pill.inactive {
    background: rgba(248, 113, 113, 0.25);
    border-color: rgba(248, 113, 113, 0.5);
}

.stat-n {
    display: block;
    font-size: 1.5rem;
    font-weight: 800;
}

.stat-l {
    font-size: 0.72rem;
    opacity: 0.8;
}

/* ── 工具栏 ─────────────────────────────────────────────────── */
.og-toolbar {
    background: #fff;
    border-bottom: 1px solid var(--border, #f0d6df);
    position: sticky;
    top: 64px;
    /* header 高度 */
    z-index: 10;
    box-shadow: 0 2px 8px rgba(196, 77, 117, 0.06);
}

.og-toolbar-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.search-wrap {
    flex: 1;
    min-width: 200px;
    position: relative;
    display: flex;
    align-items: center;
}

.search-icon {
    position: absolute;
    left: 12px;
    font-size: 0.85rem;
    pointer-events: none;
}

.og-search {
    width: 100%;
    padding: 8px 36px 8px 34px;
    border: 1.5px solid var(--border, #f0d6df);
    border-radius: 20px;
    font-size: 0.88rem;
    background: var(--sakura-50, #fff5f8);
    color: var(--ink-700, #444);
    outline: none;
    transition: border-color 0.2s;
}

.og-search:focus {
    border-color: var(--sakura-400, #e87da0);
}

.search-clear {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--ink-400, #aaa);
    font-size: 0.8rem;
    padding: 2px 4px;
}

.filter-tabs {
    display: flex;
    gap: 4px;
}

.filter-tab {
    padding: 6px 14px;
    border-radius: 16px;
    font-size: 0.8rem;
    font-weight: 600;
    border: 1.5px solid var(--border, #f0d6df);
    background: none;
    cursor: pointer;
    color: var(--ink-500, #888);
    transition: all 0.18s;
    white-space: nowrap;
}

.filter-tab.active {
    background: var(--sakura-500, #e87da0);
    border-color: var(--sakura-500, #e87da0);
    color: #fff;
}

.og-select {
    padding: 7px 12px;
    border-radius: 12px;
    border: 1.5px solid var(--border, #f0d6df);
    background: var(--sakura-50, #fff5f8);
    color: var(--ink-600, #555);
    font-size: 0.82rem;
    cursor: pointer;
    outline: none;
}

.og-select-sm {
    min-width: 90px;
}

/* ── 主体 ───────────────────────────────────────────────────── */
.og-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
}

.og-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 60px;
    color: var(--ink-400, #aaa);
    font-size: 1rem;
}

.loading-spin {
    animation: spin 1s linear infinite;
    display: inline-block;
    font-size: 1.4rem;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.og-empty {
    text-align: center;
    padding: 80px 24px;
    color: var(--ink-300, #ccc);
}

.og-empty-icon {
    font-size: 3rem;
    margin-bottom: 12px;
}

.og-empty-text {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 6px;
}

.og-empty-sub {
    font-size: 0.85rem;
}

/* ── 表格 ───────────────────────────────────────────────────── */
.og-table-wrap {
    background: #fff;
    border-radius: 16px;
    border: 1px solid var(--border, #f0d6df);
    overflow: hidden;
    overflow-x: auto;
    box-shadow: 0 2px 12px rgba(196, 77, 117, 0.06);
}

.og-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.86rem;
    min-width: 800px;
}

.og-table thead tr {
    background: var(--sakura-50, #fff5f8);
    border-bottom: 2px solid var(--border, #f0d6df);
}

.og-table th {
    padding: 12px 14px;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--sakura-600, #c44d75);
    letter-spacing: 0.05em;
    white-space: nowrap;
}

.og-row td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--sakura-50, #fff5f8);
    vertical-align: top;
}

.og-row:last-child td {
    border-bottom: none;
}

.og-row:hover td {
    background: var(--sakura-50, #fff5f8);
}

.og-row.inactive td {
    opacity: 0.55;
}

.td-id {
    color: var(--ink-400, #aaa);
    font-size: 0.78rem;
    white-space: nowrap;
}

.td-name .game-name {
    font-weight: 600;
    color: var(--ink-700, #333);
    line-height: 1.4;
}

.td-name .game-desc {
    font-size: 0.75rem;
    color: var(--ink-400, #aaa);
    margin-top: 3px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    max-width: 260px;
}

.td-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.tag-chip {
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--sakura-100, #fde8ef);
    color: var(--sakura-600, #c44d75);
    font-size: 0.72rem;
    white-space: nowrap;
}

.td-author {
    color: var(--ink-500, #777);
    font-size: 0.82rem;
}

.td-num {
    text-align: center;
    color: var(--ink-600, #555);
    font-variant-numeric: tabular-nums;
}

.td-date {
    color: var(--ink-400, #aaa);
    font-size: 0.78rem;
    white-space: nowrap;
}

/* 状态徽章 */
.status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
}

.status-badge.on {
    background: rgba(110, 231, 183, 0.2);
    color: #059669;
}

.status-badge.off {
    background: rgba(248, 113, 113, 0.15);
    color: #dc2626;
}

/* 操作按钮 */
.td-actions {
    display: flex;
    gap: 5px;
    align-items: center;
    flex-wrap: nowrap;
}

.btn-act {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 1px solid var(--border, #f0d6df);
    background: none;
    cursor: pointer;
    font-size: 0.88rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
}

.btn-preview:hover {
    background: var(--sakura-100, #fde8ef);
    border-color: var(--sakura-300);
}

.btn-edit:hover {
    background: #fef9c3;
    border-color: #fcd34d;
}

.btn-toggle-off:hover {
    background: #fee2e2;
    border-color: #fca5a5;
}

.btn-toggle-on:hover {
    background: #d1fae5;
    border-color: #6ee7b7;
}

.btn-del:hover {
    background: #fee2e2;
    border-color: #fca5a5;
}

/* ── 分页 ───────────────────────────────────────────────────── */
.og-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 24px;
    flex-wrap: wrap;
}

.pg-btn {
    min-width: 34px;
    height: 34px;
    padding: 0 8px;
    border-radius: 8px;
    border: 1.5px solid var(--border, #f0d6df);
    background: #fff;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--ink-600, #555);
    transition: all 0.18s;
}

.pg-btn:hover:not(:disabled):not(.ellipsis) {
    border-color: var(--sakura-400);
    color: var(--sakura-600);
}

.pg-btn.active {
    background: var(--sakura-500, #e87da0);
    border-color: var(--sakura-500);
    color: #fff;
}

.pg-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.pg-btn.ellipsis {
    border: none;
    background: none;
    cursor: default;
}

.pg-info {
    font-size: 0.78rem;
    color: var(--ink-400, #aaa);
    margin-left: 8px;
}

/* ── 弹窗通用 ───────────────────────────────────────────────── */
.modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
}

.modal-panel {
    background: #fff;
    border-radius: 20px;
    width: 100%;
    max-width: 700px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(196, 77, 117, 0.2);
    overflow: hidden;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px 14px;
    border-bottom: 1px solid var(--border, #f0d6df);
    flex-shrink: 0;
}

.modal-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--sakura-600, #c44d75);
}

.modal-close {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: var(--ink-400, #aaa);
    padding: 4px 8px;
    border-radius: 8px;
    transition: background 0.2s;
}

.modal-close:hover {
    background: var(--sakura-100, #fde8ef);
}

.modal-body {
    padding: 20px 24px;
    overflow-y: auto;
    flex: 1;
}

.modal-footer {
    padding: 14px 24px;
    border-top: 1px solid var(--border, #f0d6df);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
}

.modal-footer-left {
    flex: 1;
}

.modal-footer-right {
    display: flex;
    gap: 10px;
}

.footer-tip {
    font-size: 0.82rem;
    color: var(--ink-500, #888);
}

/* 表单元素 */
.form-section {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sakura-500, #e87da0);
    margin: 0 0 12px;
    padding-bottom: 6px;
    border-bottom: 1px dashed var(--border, #f0d6df);
}

.form-section:not(:first-child) {
    margin-top: 20px;
}

.form-section-sub {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.7rem;
    color: var(--ink-400);
}

.form-row {
    margin-bottom: 14px;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.form-label {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ink-500, #888);
    margin-bottom: 5px;
}

.form-label em {
    color: #f87171;
    font-style: normal;
}

.form-input,
.form-textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1.5px solid var(--border, #f0d6df);
    border-radius: 10px;
    font-size: 0.88rem;
    background: var(--sakura-50, #fff5f8);
    color: var(--ink-700, #444);
    outline: none;
    transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
    border-color: var(--sakura-400, #e87da0);
}

.form-textarea {
    resize: vertical;
}

.code-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.code-bytes {
    font-size: 0.75rem;
    color: var(--ink-400, #aaa);
}

.btn-code-toggle {
    padding: 5px 14px;
    border-radius: 16px;
    font-size: 0.78rem;
    font-weight: 600;
    border: 1.5px solid var(--border, #f0d6df);
    background: var(--sakura-50, #fff5f8);
    color: var(--sakura-600, #c44d75);
    cursor: pointer;
    transition: all 0.2s;
}

.btn-code-toggle:hover {
    background: var(--sakura-100, #fde8ef);
}

.form-code {
    width: 100%;
    padding: 12px;
    border: 1.5px solid var(--border, #f0d6df);
    border-radius: 10px;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 0.8rem;
    background: #1a1020;
    color: #f0e0e8;
    outline: none;
    resize: vertical;
    transition: border-color 0.2s;
    line-height: 1.6;
}

.form-code:focus {
    border-color: var(--sakura-400, #e87da0);
}

.btn-cancel {
    padding: 9px 22px;
    border-radius: 20px;
    border: 1.5px solid var(--border, #f0d6df);
    background: none;
    color: var(--ink-500, #888);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-cancel:hover {
    background: var(--sakura-50, #fff5f8);
}

.btn-save {
    padding: 9px 26px;
    border-radius: 20px;
    background: linear-gradient(135deg, var(--sakura-500, #e87da0), var(--sakura-600, #c44d75));
    color: #fff;
    border: none;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(196, 77, 117, 0.3);
    transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(196, 77, 117, 0.4);
}

.btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ── 预览弹窗 ───────────────────────────────────────────────── */
.preview-overlay {
    padding: 12px;
}

.preview-panel {
    background: #0d0a0e;
    border-radius: 16px;
    width: 100%;
    max-width: 960px;
    height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
    overflow: hidden;
}

.preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
}

.preview-header .modal-title {
    color: #f0e0e8;
}

.preview-header .modal-close {
    color: rgba(255, 255, 255, 0.5);
}

.preview-header .modal-close:hover {
    background: rgba(255, 255, 255, 0.1);
}

.btn-fullscreen {
    padding: 5px 14px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-fullscreen:hover {
    background: rgba(255, 255, 255, 0.2);
}

.preview-iframe {
    flex: 1;
    border: none;
    width: 100%;
    height: 100%;
    background: #fff;
}

/* ── 动画 ───────────────────────────────────────────────────── */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
    transform: scale(0.97) translateY(8px);
}

.expand-enter-active,
.expand-leave-active {
    transition: all 0.2s ease;
    overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
    opacity: 0;
    max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
    opacity: 1;
    max-height: 600px;
}
</style>