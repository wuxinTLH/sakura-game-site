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
                <div class="search-wrap">
                    <span class="search-icon">🔍</span>
                    <input v-model="query.search" class="og-search" placeholder="搜索游戏名称、标签、作者…"
                        @input="onSearchInput" />
                    <button v-if="query.search" class="search-clear" @click="clearSearch">✕</button>
                </div>
                <div class="filter-tabs">
                    <button v-for="f in statusFilters" :key="f.value" class="filter-tab"
                        :class="{ active: query.status === f.value }" @click="setStatus(f.value)">{{ f.label }}</button>
                </div>
                <select v-model="query.sort" class="og-select" @change="loadGames(1)">
                    <option value="newest">最新入库</option>
                    <option value="hottest">最多游玩</option>
                    <option value="order">权重排序</option>
                </select>
                <select v-model="query.limit" class="og-select og-select-sm" @change="loadGames(1)">
                    <option :value="10">10条/页</option>
                    <option :value="20">20条/页</option>
                    <option :value="50">50条/页</option>
                </select>

                <!-- ★ 数据导出按钮（问题7） -->
                <div class="export-wrap" ref="exportWrapRef">
                    <button class="btn-export" @click="exportMenuOpen = !exportMenuOpen">
                        ⬇ 导出 ▾
                    </button>
                    <div v-if="exportMenuOpen" class="export-dropdown">
                        <button @click="doExport('json')">📄 元数据 JSON</button>
                        <button @click="doExport('csv')">📊 元数据 CSV（Excel）</button>
                        <button @click="doExport('backup')">💾 完整备份（含代码）</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ★ 批量操作栏（问题5，选中后才显示） -->
        <div v-if="selectedIds.size > 0" class="batch-bar">
            <span class="batch-info">已选 <strong>{{ selectedIds.size }}</strong> 个游戏</span>
            <button class="batch-btn batch-on"  @click="batchToggle(true)">⬆ 批量上架</button>
            <button class="batch-btn batch-off" @click="batchToggle(false)">⬇ 批量下架</button>
            <button class="batch-btn batch-del" @click="batchDelete">🗑 批量删除</button>
            <button class="batch-btn batch-cancel" @click="selectedIds.clear()">✕ 取消选择</button>
        </div>

        <!-- 主体 -->
        <div class="og-main">
            <div v-if="store.loading" class="og-loading">
                <span class="loading-spin">🌸</span>
                <span>加载中…</span>
            </div>

            <div v-else-if="store.games.length === 0" class="og-empty">
                <div class="og-empty-icon">🎮</div>
                <div class="og-empty-text">暂无游戏</div>
                <div class="og-empty-sub">尝试清空搜索条件</div>
            </div>

            <div v-else class="og-table-wrap">
                <table class="og-table">
                    <thead>
                        <tr>
                            <!-- ★ 全选 checkbox（问题5） -->
                            <th style="width:36px">
                                <input type="checkbox"
                                       :checked="allCurrentPageSelected"
                                       :indeterminate="someSelected"
                                       @change="toggleSelectAll" />
                            </th>
                            <th style="width:48px">ID</th>
                            <!-- ★ 封面列（问题1） -->
                            <th style="width:80px">封面</th>
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
                            :class="{ inactive: !game.is_active, selected: selectedIds.has(game.id) }">
                            <!-- ★ 行 checkbox（问题5） -->
                            <td>
                                <input type="checkbox"
                                       :checked="selectedIds.has(game.id)"
                                       @change="toggleSelect(game.id)" />
                            </td>
                            <td class="td-id">{{ game.id }}</td>
                            <!-- ★ 封面缩略图（问题1） -->
                            <td class="td-cover">
                                <div class="cover-thumb">
                                    <img v-if="game.image_url && !thumbErrors.has(game.id)"
                                         :src="game.image_url"
                                         :alt="game.name"
                                         class="thumb-img"
                                         @error="thumbErrors.add(game.id)" />
                                    <div v-else class="thumb-default">🌸</div>
                                </div>
                            </td>
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
                                <button class="btn-act btn-preview" title="预览游戏" @click="openPreview(game)">👁</button>
                                <button class="btn-act btn-edit" title="编辑" :disabled="loadingEditId === game.id"
                                    @click="openEdit(game)">
                                    <span v-if="loadingEditId === game.id" class="btn-spin">⏳</span>
                                    <span v-else>✏️</span>
                                </button>
                                <button class="btn-act" :class="game.is_active ? 'btn-toggle-off' : 'btn-toggle-on'"
                                    :title="game.is_active ? '下架' : '上架'" @click="toggleGame(game)">{{ game.is_active ?
                                        '⬇' : '⬆' }}</button>
                                <button class="btn-act btn-del" title="永久删除" @click="deleteGame(game)">🗑</button>
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

        <!-- ── 编辑弹窗 ───────────────────────────────────────────── -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="editOpen" class="modal-overlay" @click.self="closeEdit">
                    <div class="modal-panel">
                        <div class="modal-header">
                            <span class="modal-title">✏️ 编辑游戏 · #{{ editForm.id }}</span>
                            <button class="modal-close" @click="closeEdit">✕</button>
                        </div>

                        <div v-if="editLoading" class="edit-loading">
                            <span class="loading-spin">🌸</span>
                            <span>正在加载游戏数据…</span>
                        </div>

                        <template v-else>
                            <div class="modal-body">
                                <!-- 基本信息 -->
                                <div class="form-section">基本信息</div>

                                <div class="form-row">
                                    <label class="form-label">游戏名称 <em>*</em></label>
                                    <input v-model="editForm.name" class="form-input" placeholder="游戏名称"
                                        maxlength="255" />
                                </div>

                                <div class="form-row">
                                    <label class="form-label">游戏介绍</label>
                                    <textarea v-model="editForm.description" class="form-textarea"
                                        placeholder="游戏介绍（可选）" rows="3" maxlength="1000" />
                                </div>

                                <div class="form-grid">
                                    <!-- ★ 标签枚举选择器（问题6） -->
                                    <div class="form-row form-row-full">
                                        <label class="form-label">标签
                                            <span class="label-hint">（点击快速选择，或直接编辑下方文本框）</span>
                                        </label>
                                        <div class="tag-enum-bar" v-if="allTags.length">
                                            <button
                                                v-for="tag in allTags"
                                                :key="tag"
                                                class="tag-enum-btn"
                                                :class="{ selected: isTagSelected(tag) }"
                                                @click="toggleTagEnum(tag)"
                                                type="button">{{ tag }}</button>
                                        </div>
                                        <input v-model="editForm.tags" class="form-input"
                                            placeholder="逗号分隔，如：益智,休闲"
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
                                        <input v-model.number="editForm.sort_order" class="form-input" type="number"
                                            min="0" />
                                    </div>

                                    <!-- ★ 封面图：支持上传文件 + URL（问题1） -->
                                    <div class="form-row">
                                        <label class="form-label">封面图</label>
                                        <div class="cover-edit-area">
                                            <!-- 预览 -->
                                            <div class="cover-preview-box">
                                                <img v-if="editForm.image_url && !coverPreviewErr"
                                                     :src="editForm.image_url"
                                                     class="cover-preview-img"
                                                     @error="coverPreviewErr = true"
                                                     alt="封面预览" />
                                                <div v-else class="cover-preview-empty">🌸</div>
                                            </div>
                                            <div class="cover-edit-controls">
                                                <!-- 文件上传按钮 -->
                                                <label class="btn-upload-cover">
                                                    📁 上传图片
                                                    <input type="file"
                                                           accept="image/png,image/jpeg,image/gif,image/webp"
                                                           class="hidden-file-input"
                                                           @change="onCoverFileChange" />
                                                </label>
                                                <button v-if="editForm.image_url"
                                                        class="btn-remove-cover"
                                                        type="button"
                                                        @click="editForm.image_url = ''; coverPreviewErr = false">
                                                    移除
                                                </button>
                                                <p class="cover-hint">PNG/JPG/GIF/WebP，≤ 500KB</p>
                                            </div>
                                        </div>
                                        <!-- URL 直接填写 -->
                                        <input v-model="editForm.image_url" class="form-input"
                                            placeholder="或直接粘贴图片 URL"
                                            @input="coverPreviewErr = false" />
                                    </div>
                                </div>

                                <!-- 游戏代码 -->
                                <div class="form-section">
                                    游戏代码
                                    <span class="form-section-sub">（修改后将覆盖数据库中的 game_code）</span>
                                </div>

                                <div class="code-toolbar">
                                    <div class="code-meta">
                                        <span class="code-bytes" :class="codeBytesClass">{{ codeBytes }}</span>
                                        <span class="code-lines">· {{ codeLines }} 行</span>
                                    </div>
                                    <div style="display:flex;gap:8px">
                                        <button class="btn-asset-mgr" @click="assetOpen = true" title="打开资源管理器">
                                            🗂 资源管理器
                                        </button>
                                        <button class="btn-code-toggle" @click="showCode = !showCode">
                                            {{ showCode ? '▲ 收起代码' : '▼ 展开编辑代码' }}
                                        </button>
                                    </div>
                                </div>

                                <Transition name="expand">
                                    <div v-if="showCode" class="code-editor-wrap">
                                        <textarea v-model="editForm.game_code" class="form-code" rows="18"
                                            spellcheck="false" placeholder="完整 HTML 游戏代码…" />
                                    </div>
                                </Transition>
                            </div>

                            <div class="modal-footer">
                                <div class="modal-footer-left">
                                    <span class="footer-tip" :class="{
                                        'tip-ok': saveStatus.startsWith('✅'),
                                        'tip-err': saveStatus.startsWith('❌'),
                                        'tip-warn': saveStatus.startsWith('⚠️'),
                                    }">{{ saveStatus }}</span>
                                </div>
                                <div class="modal-footer-right">
                                    <button class="btn-cancel" @click="closeEdit">取消</button>
                                    <button class="btn-save" :disabled="saving" @click="saveEdit">
                                        {{ saving ? '保存中…' : '💾 保存' }}
                                    </button>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- ── 预览弹窗（与原版保持一致）──────────────────────── -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="previewOpen" class="modal-overlay preview-overlay" @click.self="previewOpen = false">
                    <div class="preview-panel">
                        <div class="preview-header">
                            <span class="modal-title">👁 预览：{{ previewData.name }}</span>
                            <div style="display:flex;gap:8px">
                                <span v-if="previewLoading" class="preview-loading-tip">加载中…</span>
                                <button v-else class="btn-fullscreen" @click="openFullscreen">⛶ 全屏</button>
                                <button class="modal-close" @click="previewOpen = false">✕</button>
                            </div>
                        </div>
                        <div v-if="previewLoading" class="preview-placeholder">
                            <span class="loading-spin" style="font-size:2rem">🌸</span>
                            <span>正在加载游戏…</span>
                        </div>
                        <iframe v-else ref="previewIframe" class="preview-iframe"
                            sandbox="allow-scripts allow-same-origin" :srcdoc="previewData.game_code" />
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- ── 资源管理器 ────────────────────────────────────────── -->
        <AssetManager v-model:open="assetOpen" :game-id="editForm.id || null" @insert="onAssetInsert" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import { useOnlineGamesStore } from '@/stores/onlineGames'
import { adminUpdateGame, adminDeleteGame, adminToggleGame } from '@/api/admin'
import { fetchGame } from '@/api/games'
import { fetchTags } from '@/api/tags'
import { exportGamesJson, exportGamesCsv, exportGamesBackup } from '@/api/export'
import AssetManager from '@/components/AssetManager.vue'

// ── Store ─────────────────────────────────────────────────────
const store = useOnlineGamesStore()

// ── 查询参数（原版保持不变）──────────────────────────────────
const query = ref({
    search: '',
    status: 'all' as 'all' | 'active' | 'inactive',
    sort:   'newest' as 'newest' | 'hottest' | 'order',
    limit:  20,
})

const statusFilters = [
    { label: '全部',   value: 'all' },
    { label: '上架中', value: 'active' },
    { label: '已下架', value: 'inactive' },
]

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

// ── 加载列表（原版保持不变）──────────────────────────────────
async function loadGames(page = 1) {
    selectedIds.clear()   // 翻页时清空选择
    await store.fetchGames({
        page,
        limit:  query.value.limit,
        search: query.value.search || undefined,
        status: query.value.status === 'all' ? undefined : query.value.status,
        sort:   query.value.sort,
    })
}

onMounted(() => {
    loadGames(1)
    store.fetchTotals()   // 修复(问题8)：启动时拉全量上下架数量
    fetchTags().then(t => allTags.value = t).catch(() => {})
    document.addEventListener('click', onDocClick)
})
onUnmounted(() => document.removeEventListener('click', onDocClick))

// ── 分页（原版保持不变）──────────────────────────────────────
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

// ── 工具（原版保持不变）──────────────────────────────────────
function parseTags(tags: string): string[] {
    return tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
}
function formatDate(dt: string): string {
    if (!dt) return '—'
    const d = new Date(dt)
    return `${d.getMonth() + 1}/${d.getDate()}`
}

// ── 上下架（原版保持不变）────────────────────────────────────
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

// ── 永久删除（原版保持不变）──────────────────────────────────
async function deleteGame(game: { id: number; name: string }) {
    if (!confirm(`确认永久删除游戏「${game.name}」？
此操作不可恢复，存档数据也将一并清除。`)) return
    try {
        await adminDeleteGame(game.id)
        await loadGames(store.pagination.page)
    } catch (e: any) {
        alert(`删除失败：${e.message}`)
    }
}

// ═══════════════════════════════════════════════════════════════
// ★ 问题5：批量操作
// ═══════════════════════════════════════════════════════════════

const selectedIds = reactive(new Set<number>())

const allCurrentPageSelected = computed(() =>
    store.games.length > 0 && store.games.every(g => selectedIds.has(g.id))
)
const someSelected = computed(() =>
    store.games.some(g => selectedIds.has(g.id)) && !allCurrentPageSelected.value
)

function toggleSelect(id: number) {
    if (selectedIds.has(id)) selectedIds.delete(id)
    else selectedIds.add(id)
}

function toggleSelectAll(e: Event) {
    if ((e.target as HTMLInputElement).checked) {
        store.games.forEach(g => selectedIds.add(g.id))
    } else {
        selectedIds.clear()
    }
}

async function batchToggle(active: boolean) {
    const ids  = Array.from(selectedIds)
    const verb = active ? '上架' : '下架'
    if (!confirm(`确认批量${verb} ${ids.length} 个游戏？`)) return
    let done = 0
    for (const id of ids) {
        try { await adminToggleGame(id); done++ } catch { /* skip */ }
    }
    alert(`已${verb} ${done} / ${ids.length} 个游戏`)
    selectedIds.clear()
    await loadGames(store.pagination.page)
}

async function batchDelete() {
    const ids = Array.from(selectedIds)
    if (!confirm(`确认永久删除 ${ids.length} 个游戏？
此操作不可恢复！`)) return
    let done = 0
    for (const id of ids) {
        try { await adminDeleteGame(id); done++ } catch { /* skip */ }
    }
    alert(`已删除 ${done} / ${ids.length} 个游戏`)
    selectedIds.clear()
    await loadGames(store.pagination.page)
}

// ★ 封面缩略图加载失败记录（问题1）
const thumbErrors = reactive(new Set<number>())

// ═══════════════════════════════════════════════════════════════
// ★ 问题6：标签枚举
// ═══════════════════════════════════════════════════════════════

const allTags = ref<string[]>([])

function isTagSelected(tag: string): boolean {
    return parseTags(editForm.value.tags).includes(tag)
}

function toggleTagEnum(tag: string) {
    const current = parseTags(editForm.value.tags)
    const idx     = current.indexOf(tag)
    if (idx === -1) current.push(tag)
    else current.splice(idx, 1)
    editForm.value.tags = current.join(',')
}

// ═══════════════════════════════════════════════════════════════
// ★ 问题7：数据导出
// ═══════════════════════════════════════════════════════════════

const exportMenuOpen = ref(false)
const exportWrapRef  = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
    if (exportWrapRef.value && !exportWrapRef.value.contains(e.target as Node)) {
        exportMenuOpen.value = false
    }
}

async function doExport(type: 'json' | 'csv' | 'backup') {
    exportMenuOpen.value = false
    try {
        if (type === 'json')   await exportGamesJson()
        if (type === 'csv')    await exportGamesCsv()
        if (type === 'backup') await exportGamesBackup()
    } catch (e: any) {
        alert(`导出失败：${e.message}
请确认管理员登录状态。`)
    }
}

// ═══════════════════════════════════════════════════════════════
// 编辑弹窗（原版逻辑保留，新增封面上传 + 标签枚举联动）
// ═══════════════════════════════════════════════════════════════

interface EditForm {
    id:          number
    name:        string
    description: string
    tags:        string
    author:      string
    sort_order:  number
    image_url:   string
    game_code:   string
}

const editOpen      = ref(false)
const editLoading   = ref(false)
const loadingEditId = ref<number | null>(null)
const saving        = ref(false)
const showCode      = ref(false)
const saveStatus    = ref('')
// ★ 封面预览状态（问题1）
const coverPreviewErr = ref(false)

const editForm = ref<EditForm>({
    id: 0, name: '', description: '', tags: '',
    author: '', sort_order: 0, image_url: '', game_code: '',
})

const codeBytes = computed(() => {
    const bytes = new Blob([editForm.value.game_code]).size
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
})

const codeBytesClass = computed(() => {
    const bytes = new Blob([editForm.value.game_code]).size
    if (bytes === 0) return 'bytes-empty'
    if (bytes > 512 * 1024) return 'bytes-warn'
    return 'bytes-ok'
})

const codeLines = computed(() => {
    return editForm.value.game_code ? editForm.value.game_code.split('').length : 0
})

async function openEdit(game: any) {
    editForm.value = {
        id:          game.id,
        name:        game.name        ?? '',
        description: game.description ?? '',
        tags:        game.tags        ?? '',
        author:      game.author      ?? '',
        sort_order:  game.sort_order  ?? 0,
        image_url:   game.image_url   ?? '',
        game_code:   '',
    }
    showCode.value      = false
    saveStatus.value    = ''
    coverPreviewErr.value = false
    editLoading.value   = true
    loadingEditId.value = game.id
    editOpen.value      = true

    try {
        const res    = await fetchGame(game.id)
        const detail = res?.data ?? res
        editForm.value.game_code = detail.game_code ?? ''
    } catch (e: any) {
        saveStatus.value = `⚠️ 加载代码失败：${e.message}`
    } finally {
        editLoading.value   = false
        loadingEditId.value = null
    }
}

function closeEdit() {
    editOpen.value = false
}

async function saveEdit() {
    if (!editForm.value.name.trim()) {
        saveStatus.value = '⚠️ 游戏名称不能为空'
        return
    }
    saving.value     = true
    saveStatus.value = ''
    try {
        await adminUpdateGame(editForm.value.id, {
            name:        editForm.value.name.trim(),
            description: editForm.value.description.trim(),
            tags:        editForm.value.tags.trim(),
            author:      editForm.value.author.trim(),
            sort_order:  Number(editForm.value.sort_order) || 0,
            image_url:   editForm.value.image_url.trim(),
            game_code:   editForm.value.game_code,
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

// ★ 封面图文件上传（问题1）：FileReader → base64 → image_url
function onCoverFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
        alert('图片文件不能超过 500KB')
        return
    }
    const reader = new FileReader()
    reader.onload = () => {
        editForm.value.image_url = reader.result as string
        coverPreviewErr.value    = false
    }
    reader.readAsDataURL(file)
    // 清空 input，允许重复选择同一文件
    ;(e.target as HTMLInputElement).value = ''
}

// ── 预览弹窗（原版保持不变）──────────────────────────────────
const previewOpen    = ref(false)
const previewLoading = ref(false)
const previewIframe  = ref<HTMLIFrameElement | null>(null)
const previewData    = ref<{ name: string; game_code: string }>({ name: '', game_code: '' })

async function openPreview(game: any) {
    previewData.value    = { name: game.name, game_code: '' }
    previewLoading.value = true
    previewOpen.value    = true

    try {
        const res    = await fetchGame(game.id)
        const detail = res?.data ?? res
        previewData.value.game_code = detail.game_code ?? ''
    } catch (e: any) {
        previewData.value.game_code = `<p style="color:red;padding:20px">加载失败：${e.message}</p>`
    } finally {
        previewLoading.value = false
    }
}

function openFullscreen() {
    if (previewIframe.value?.requestFullscreen) {
        previewIframe.value.requestFullscreen()
    }
}

watch([editOpen, previewOpen], ([e, p]) => {
    document.body.style.overflow = (e || p) ? 'hidden' : ''
})

// ── 资源管理器（原版保持不变）────────────────────────────────
const assetOpen = ref(false)

function onAssetInsert({ snippet }: { snippet: string }) {
    const code     = editForm.value.game_code
    const textarea = document.querySelector<HTMLTextAreaElement>('.form-code')

    if (textarea && document.activeElement === textarea) {
        const start = textarea.selectionStart
        const end   = textarea.selectionEnd
        editForm.value.game_code = code.slice(0, start) + snippet + code.slice(end)
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + snippet.length
            textarea.focus()
        }, 0)
    } else {
        editForm.value.game_code = code + (code.endsWith('') ? '' : '') + snippet
    }
    showCode.value = true
}
</script>

<style scoped>
/* ── 页面骨架（原版） ──────────────────────────────────────────────── */
.og-page {
    min-height: 100vh;
    background: var(--sakura-50, #fff5f8);
}

/* ── Hero（原版） ───────────────────────────────────────────────────── */
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
    font-size: 0.9rem;
    opacity: 0.85;
}

.og-hero-stats {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.stat-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255,255,255,0.18);
    border-radius: 12px;
    padding: 10px 20px;
    min-width: 64px;
    backdrop-filter: blur(4px);
}

.stat-pill.active { background: rgba(255,255,255,0.28); }
.stat-pill.inactive { background: rgba(0,0,0,0.15); }

.stat-n {
    font-size: 1.5rem;
    font-weight: 900;
    line-height: 1;
}

.stat-l {
    font-size: 0.72rem;
    opacity: 0.8;
    margin-top: 3px;
}

/* ── 工具栏（原版 + 导出按钮） ──────────────────────────────────── */
.og-toolbar {
    background: var(--surface, #fff);
    border-bottom: 1px solid var(--border, #f0d6df);
    position: sticky;
    top: 64px;
    z-index: 50;
}

.og-toolbar-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.search-wrap {
    position: relative;
    flex: 1;
    min-width: 200px;
    display: flex;
    align-items: center;
}

.search-icon {
    position: absolute;
    left: 10px;
    font-size: 0.9rem;
    pointer-events: none;
}

.og-search {
    width: 100%;
    padding: 8px 32px 8px 32px;
    border-radius: 20px;
    border: 1.5px solid var(--border, #f0d6df);
    background: var(--sakura-50, #fff5f8);
    font-size: 0.88rem;
    outline: none;
    transition: border-color 0.2s;
}

.og-search:focus { border-color: var(--sakura-300, #f9a8c9); }

.search-clear {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--ink-300, #ccc);
    font-size: 0.8rem;
    padding: 2px 4px;
}

.filter-tabs {
    display: flex;
    gap: 4px;
}

.filter-tab {
    padding: 6px 14px;
    border-radius: 20px;
    border: 1.5px solid var(--border, #f0d6df);
    background: var(--surface, #fff);
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--ink-500, #777);
}

.filter-tab:hover { border-color: var(--sakura-300, #f9a8c9); color: var(--sakura-500, #e87da0); }
.filter-tab.active {
    background: var(--sakura-500, #e87da0);
    border-color: var(--sakura-500, #e87da0);
    color: #fff;
}

.og-select {
    padding: 7px 12px;
    border-radius: 10px;
    border: 1.5px solid var(--border, #f0d6df);
    background: var(--surface, #fff);
    font-size: 0.82rem;
    color: var(--ink-600, #555);
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s;
}

.og-select:focus { border-color: var(--sakura-300, #f9a8c9); }
.og-select-sm { min-width: 90px; }

/* ★ 导出按钮 + 下拉菜单（问题7） */
.export-wrap {
    position: relative;
}

.btn-export {
    padding: 7px 14px;
    border-radius: 10px;
    border: 1.5px solid var(--sakura-300, #f9a8c9);
    background: var(--surface, #fff);
    color: var(--sakura-600, #c44d75);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.btn-export:hover { background: var(--sakura-100, #fde8ef); }

.export-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    background: var(--surface, #fff);
    border: 1px solid var(--border, #f0d6df);
    border-radius: 12px;
    box-shadow: 0 6px 24px rgba(196, 77, 117, 0.15);
    z-index: 200;
    min-width: 210px;
    overflow: hidden;
}

.export-dropdown button {
    display: block;
    width: 100%;
    padding: 11px 16px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: 0.84rem;
    color: var(--ink-600, #555);
    transition: background 0.15s;
}

.export-dropdown button:hover { background: var(--sakura-50, #fff5f8); }

/* ★ 批量操作栏（问题5） */
.batch-bar {
    max-width: 1200px;
    margin: 8px auto 0;
    padding: 10px 24px;
    background: #fff3e0;
    border: 1.5px solid #ffcc80;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.batch-info {
    font-size: 0.88rem;
    color: #e65100;
    font-weight: 600;
    margin-right: 4px;
}

.batch-btn {
    padding: 6px 14px;
    border-radius: 20px;
    border: none;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.batch-on     { background: #e8f5e9; color: #388e3c; border: 1.5px solid #a5d6a7; }
.batch-on:hover     { background: #c8e6c9; }
.batch-off    { background: #fff8e1; color: #f57c00; border: 1.5px solid #ffcc80; }
.batch-off:hover    { background: #ffecb3; }
.batch-del    { background: #ffebee; color: #c62828; border: 1.5px solid #ef9a9a; }
.batch-del:hover    { background: #ffcdd2; }
.batch-cancel { background: #f5f5f5; color: #777; border: 1.5px solid #ddd; }
.batch-cancel:hover { background: #eeeeee; }

/* ── 主体 ────────────────────────────────────────────────────── */
.og-main {
    max-width: 1200px;
    margin: 16px auto;
    padding: 0 24px 40px;
}

.og-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 80px 20px;
    color: var(--ink-400, #aaa);
    font-size: 1rem;
}

.loading-spin {
    display: inline-block;
    animation: sakuraSpin 1.2s linear infinite;
}

.og-empty {
    text-align: center;
    padding: 80px 20px;
}

.og-empty-icon { font-size: 3rem; margin-bottom: 12px; opacity: 0.4; }
.og-empty-text { font-size: 1.1rem; color: var(--ink-600, #555); font-weight: 600; }
.og-empty-sub  { font-size: 0.85rem; color: var(--ink-300, #ccc); margin-top: 6px; }

/* ── 表格 ────────────────────────────────────────────────────── */
.og-table-wrap {
    overflow-x: auto;
    border-radius: 16px;
    border: 1px solid var(--border, #f0d6df);
    background: var(--surface, #fff);
    box-shadow: 0 2px 16px rgba(196, 77, 117, 0.06);
}

.og-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
}

.og-table th {
    padding: 12px 14px;
    background: var(--sakura-50, #fff5f8);
    color: var(--sakura-600, #c44d75);
    font-weight: 700;
    text-align: left;
    border-bottom: 2px solid var(--border, #f0d6df);
    white-space: nowrap;
}

.og-table td {
    padding: 11px 14px;
    border-bottom: 1px solid var(--sakura-50, #fff5f8);
    vertical-align: middle;
}

.og-row:last-child td { border-bottom: none; }
.og-row:hover td { background: var(--sakura-50, #fff5f8); }
.og-row.inactive td { opacity: 0.5; }
/* ★ 选中行高亮（问题5） */
.og-row.selected td { background: #fff8e1; }

/* ★ 封面缩略图（问题1） */
.td-cover { width: 72px; }

.cover-thumb {
    width: 64px;
    height: 40px;
    border-radius: 6px;
    overflow: hidden;
    background: var(--sakura-100, #fde8ef);
    display: flex;
    align-items: center;
    justify-content: center;
}

.thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.thumb-default {
    font-size: 1.2rem;
    opacity: 0.6;
}

/* 表格内容（原版） */
.td-id     { font-size: 0.75rem; color: var(--ink-300, #ccc); text-align: center; }
.td-name   { min-width: 160px; }
.game-name { font-weight: 600; color: var(--ink-900, #111); }
.game-desc {
    font-size: 0.75rem;
    color: var(--ink-300, #ccc);
    margin-top: 2px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
}

.td-tags { min-width: 120px; }
.tag-chip {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 10px;
    background: var(--sakura-100, #fde8ef);
    color: var(--sakura-600, #c44d75);
    font-size: 0.7rem;
    font-weight: 500;
    margin: 2px 2px 0 0;
}

.td-author { font-size: 0.8rem; color: var(--ink-500, #777); white-space: nowrap; }
.td-num    { text-align: center; color: var(--ink-500, #777); font-size: 0.8rem; }
.td-status { text-align: center; }

.status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
}

.status-badge.on  { background: #e8f5e9; color: #388e3c; }
.status-badge.off { background: #f5f5f5; color: #9e9e9e; }

.td-date { font-size: 0.78rem; color: var(--ink-300, #ccc); white-space: nowrap; }

.td-actions {
    display: flex;
    gap: 5px;
    align-items: center;
}

.btn-act {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1.5px solid var(--border, #f0d6df);
    background: var(--surface, #fff);
    cursor: pointer;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.btn-act:hover { background: var(--sakura-100, #fde8ef); border-color: var(--sakura-300, #f9a8c9); }
.btn-act:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-del:hover    { background: #ffebee; border-color: #ef9a9a; }
.btn-toggle-on:hover  { background: #e8f5e9; border-color: #a5d6a7; }
.btn-toggle-off:hover { background: #fff8e1; border-color: #ffcc80; }

.btn-spin { animation: sakuraSpin 1s linear infinite; }

/* ── 分页（原版） ────────────────────────────────────────────── */
.og-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    margin-top: 20px;
    flex-wrap: wrap;
}

.pg-btn {
    min-width: 34px;
    height: 34px;
    padding: 0 8px;
    border-radius: 8px;
    border: 1.5px solid var(--border, #f0d6df);
    background: var(--surface, #fff);
    font-size: 0.82rem;
    cursor: pointer;
    transition: all 0.15s;
    color: var(--ink-600, #555);
}

.pg-btn:hover:not(:disabled) { border-color: var(--sakura-300, #f9a8c9); color: var(--sakura-500, #e87da0); }
.pg-btn.active {
    background: var(--sakura-500, #e87da0);
    border-color: var(--sakura-500, #e87da0);
    color: #fff;
    font-weight: 700;
}

.pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.pg-btn.ellipsis { border: none; cursor: default; color: var(--ink-200, #ddd); }
.pg-info { font-size: 0.78rem; color: var(--ink-300, #ccc); margin-left: 6px; }

/* ── 弹窗通用（原版） ────────────────────────────────────────── */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.modal-panel {
    background: #fff;
    border-radius: 20px;
    width: 100%;
    max-width: 720px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(196,77,117,0.2);
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border, #f0d6df);
    position: sticky;
    top: 0;
    background: #fff;
    border-radius: 20px 20px 0 0;
    z-index: 1;
}

.modal-title { font-size: 1rem; font-weight: 700; color: var(--sakura-600, #c44d75); }

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

.modal-close:hover { background: var(--sakura-100, #fde8ef); }

.edit-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 60px 20px;
    color: var(--ink-400, #aaa);
}

/* ── 编辑表单（原版 + 新增样式） ─────────────────────────────── */
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }

.form-section {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--ink-400, #aaa);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border, #f0d6df);
}

.form-section-sub {
    font-size: 0.72rem;
    font-weight: 400;
    text-transform: none;
    color: var(--ink-200, #ddd);
    margin-left: 8px;
}

.form-row { display: flex; flex-direction: column; gap: 5px; }
.form-row-full { grid-column: 1 / -1; }

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

.form-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ink-600, #555);
}

.form-label em {
    color: #f44336;
    font-style: normal;
    margin-left: 2px;
}

.label-hint {
    font-weight: 400;
    color: var(--ink-300, #ccc);
    font-size: 0.72rem;
    margin-left: 4px;
}

.form-input,
.form-textarea {
    padding: 9px 12px;
    border-radius: 10px;
    border: 1.5px solid var(--border, #f0d6df);
    background: var(--sakura-50, #fff5f8);
    font-size: 0.85rem;
    font-family: inherit;
    color: var(--ink-900, #111);
    outline: none;
    transition: border-color 0.2s;
    resize: vertical;
}

.form-input:focus,
.form-textarea:focus {
    border-color: var(--sakura-300, #f9a8c9);
    background: #fff;
}

/* ★ 标签枚举选择器（问题6） */
.tag-enum-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding: 10px;
    border: 1.5px solid var(--border, #f0d6df);
    border-radius: 10px;
    background: var(--sakura-50, #fff5f8);
    max-height: 110px;
    overflow-y: auto;
}

.tag-enum-btn {
    padding: 3px 11px;
    border-radius: 16px;
    border: 1.5px solid var(--border, #f0d6df);
    background: var(--surface, #fff);
    color: var(--ink-500, #777);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
}

.tag-enum-btn:hover {
    border-color: var(--sakura-300, #f9a8c9);
    color: var(--sakura-500, #e87da0);
}

.tag-enum-btn.selected {
    background: var(--sakura-500, #e87da0);
    border-color: var(--sakura-500, #e87da0);
    color: #fff;
    font-weight: 600;
}

/* ★ 封面上传区域（问题1） */
.cover-edit-area {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 6px;
}

.cover-preview-box {
    width: 100px;
    height: 64px;
    border-radius: 8px;
    overflow: hidden;
    border: 1.5px dashed var(--border, #f0d6df);
    background: var(--sakura-50, #fff5f8);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.cover-preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.cover-preview-empty {
    font-size: 1.6rem;
    opacity: 0.4;
}

.cover-edit-controls {
    display: flex;
    flex-direction: column;
    gap: 6px;
    justify-content: center;
}

.btn-upload-cover {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 20px;
    border: 1.5px solid var(--sakura-300, #f9a8c9);
    background: var(--surface, #fff);
    color: var(--sakura-600, #c44d75);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.btn-upload-cover:hover { background: var(--sakura-100, #fde8ef); }

.hidden-file-input { display: none; }

.btn-remove-cover {
    padding: 4px 12px;
    border-radius: 16px;
    border: 1.5px solid #ef9a9a;
    background: #ffebee;
    color: #c62828;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-remove-cover:hover { background: #ffcdd2; }

.cover-hint {
    font-size: 0.7rem;
    color: var(--ink-300, #ccc);
    margin: 0;
}

/* 代码区（原版） */
.code-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--ink-50, #f9f9f9);
    border-radius: 10px 10px 0 0;
    border: 1.5px solid var(--border, #f0d6df);
}

.code-meta { display: flex; align-items: center; gap: 8px; }

.code-bytes { font-size: 0.82rem; font-weight: 700; }
.bytes-empty { color: var(--ink-300, #ccc); }
.bytes-ok    { color: #388e3c; }
.bytes-warn  { color: #e65100; }

.code-lines { font-size: 0.78rem; color: var(--ink-300, #ccc); }

.btn-asset-mgr {
    padding: 5px 12px;
    border-radius: 8px;
    background: var(--sakura-100, #fde8ef);
    color: var(--sakura-600, #c44d75);
    border: 1.5px solid var(--sakura-200, #fbd0df);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-asset-mgr:hover { background: var(--sakura-200, #fbd0df); }

.btn-code-toggle {
    padding: 5px 12px;
    border-radius: 8px;
    background: var(--ink-100, #f0f0f0);
    color: var(--ink-600, #555);
    border: 1.5px solid var(--border, #f0d6df);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-code-toggle:hover { background: var(--ink-200, #e5e5e5); }

.code-editor-wrap {
    border: 1.5px solid var(--border, #f0d6df);
    border-top: none;
    border-radius: 0 0 10px 10px;
    /* overflow: hidden 已移除：原来会裁切 textarea，导致无法正常编辑 */
}

.form-code {
    width: 100%;
    min-height: 320px;   /* 修复：确保代码区最小高度可见，不被截断 */
    padding: 12px;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 0.78rem;
    line-height: 1.6;
    color: #cdd6f4;
    background: #1e1e2e;
    border: none;
    outline: none;
    resize: vertical;
    box-sizing: border-box;
    display: block;
    cursor: text;        /* 修复：明确显示文本光标，提示可编辑 */
}

/* 弹窗底栏（原版） */
.modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px 18px;
    border-top: 1px solid var(--border, #f0d6df);
    position: sticky;
    bottom: 0;
    background: #fff;
    border-radius: 0 0 20px 20px;
    gap: 12px;
}

.modal-footer-left { flex: 1; min-width: 0; }
.modal-footer-right { display: flex; gap: 10px; flex-shrink: 0; }

.footer-tip { font-size: 0.82rem; }
.tip-ok   { color: #388e3c; }
.tip-err  { color: #c62828; }
.tip-warn { color: #e65100; }

.btn-cancel {
    padding: 8px 20px;
    border-radius: 10px;
    border: 1.5px solid var(--border, #f0d6df);
    background: var(--surface, #fff);
    font-size: 0.85rem;
    color: var(--ink-600, #555);
    cursor: pointer;
    transition: all 0.2s;
}

.btn-cancel:hover { background: var(--sakura-50, #fff5f8); }

.btn-save {
    padding: 8px 24px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--sakura-500, #e87da0), var(--sakura-600, #c44d75));
    color: #fff;
    font-size: 0.85rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: opacity 0.2s;
}

.btn-save:hover:not(:disabled) { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── 预览弹窗（原版） ────────────────────────────────────────── */
.preview-overlay { align-items: flex-start; padding-top: 4vh; }

.preview-panel {
    background: #111;
    border-radius: 16px;
    width: 100%;
    max-width: 900px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
}

.preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.08);
}

.preview-header .modal-title { color: rgba(255,255,255,0.9); }
.preview-header .modal-close { color: rgba(255,255,255,0.6); }
.preview-header .modal-close:hover { background: rgba(255,255,255,0.1); }

.preview-loading-tip { font-size: 0.82rem; color: rgba(255,255,255,0.5); }

.btn-fullscreen {
    padding: 5px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.8);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-fullscreen:hover { background: rgba(255,255,255,0.14); }

.preview-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 80px 20px;
    color: rgba(255,255,255,0.4);
    font-size: 1rem;
}

.preview-iframe {
    width: 100%;
    height: 65vh;
    border: none;
    display: block;
}

/* ── 动画（原版） ────────────────────────────────────────────── */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
}

.expand-enter-active,
.expand-leave-active {
    transition: all 0.25s ease;
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
    max-height: 1200px;  /* 修复：原600px会截断18行代码编辑区，扩大为1200px */
}

/* ── 响应式 ──────────────────────────────────────────────────── */
@media (max-width: 768px) {
    .form-grid { grid-template-columns: 1fr; }
    .og-toolbar-inner { gap: 8px; }
    .batch-bar { margin: 8px 16px 0; }
    .og-main { padding: 0 12px 40px; }
}
</style>