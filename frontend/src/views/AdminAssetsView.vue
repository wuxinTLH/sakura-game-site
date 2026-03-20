<template>
    <div class="aa-page">

        <!-- 页头 -->
        <div class="aa-hero">
            <div class="aa-hero-inner">
                <div>
                    <h1 class="aa-title">🗂 素材资源管理</h1>
                    <p class="aa-sub">管理全站云端资源库，支持上传、预览、删除及容量监控</p>
                </div>
                <div class="aa-hero-stats">
                    <div class="stat-card">
                        <span class="stat-n">{{ total }}</span>
                        <span class="stat-l">总资源数</span>
                    </div>
                    <div class="stat-card stat-used" :class="quotaClass">
                        <span class="stat-n">{{ formatSize(quota.used) }}</span>
                        <span class="stat-l">已用 / {{ formatSize(quota.limit) }}</span>
                    </div>
                    <div class="stat-card">
                        <div class="quota-bar-lg">
                            <div class="quota-fill-lg" :class="quotaClass"
                                :style="{ width: Math.min(quota.pct, 100) + '%' }" />
                        </div>
                        <span class="stat-l stat-pct" :class="quotaClass">{{ quota.pct }}%</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 工具栏 -->
        <div class="aa-toolbar">
            <div class="aa-toolbar-inner">
                <!-- 搜索 -->
                <div class="search-wrap">
                    <span class="search-icon">🔍</span>
                    <input v-model="query.search" class="aa-search" placeholder="搜索文件名…" @input="onSearch" />
                    <button v-if="query.search" class="search-clear" @click="query.search = ''; load(1)">✕</button>
                </div>
                <!-- 类型筛选 -->
                <div class="aa-type-tabs">
                    <button v-for="t in typeFilters" :key="t.value" class="aa-type-tab"
                        :class="{ active: query.type === t.value }" @click="query.type = t.value; load(1)">{{ t.icon }}
                        {{ t.label }}</button>
                </div>
                <!-- 作用域 -->
                <select v-model="query.scope" class="aa-select" @change="load(1)">
                    <option value="all">全部资源</option>
                    <option value="public">仅公共资源</option>
                </select>
                <!-- 每页 -->
                <select v-model="query.limit" class="aa-select aa-select-sm" @change="load(1)">
                    <option :value="24">24条/页</option>
                    <option :value="48">48条/页</option>
                    <option :value="96">96条/页</option>
                </select>
                <!-- 上传 -->
                <button class="aa-upload-btn" :disabled="uploading" @click="triggerUpload">
                    <span v-if="uploading" class="aa-spin">⏳</span>
                    <span v-else>⬆ 上传资源</span>
                </button>
                <input ref="fileInputRef" type="file" class="aa-file-input" :accept="ACCEPT_MIME"
                    @change="handleUpload" />
            </div>
        </div>

        <!-- 上传结果提示 -->
        <Transition name="aa-tip">
            <div v-if="tip.msg" class="aa-tip" :class="tip.cls">{{ tip.msg }}</div>
        </Transition>

        <!-- 内容区 -->
        <div class="aa-main">
            <!-- 加载 -->
            <div v-if="loading" class="aa-loading">
                <span class="aa-spin" style="font-size:2rem">🌸</span>
                <span>加载中…</span>
            </div>
            <!-- 空 -->
            <div v-else-if="assets.length === 0" class="aa-empty">
                <div style="font-size:3rem">🗂</div>
                <div class="aa-empty-title">暂无资源</div>
                <div class="aa-empty-sub">点击「⬆ 上传资源」添加图片、音频等文件</div>
            </div>
            <!-- 网格 -->
            <div v-else class="aa-grid">
                <div v-for="asset in assets" :key="asset.id" class="aa-card"
                    :class="{ selected: selectedId === asset.id }" @click="openDetail(asset)">
                    <!-- 预览 -->
                    <div class="aa-card-thumb">
                        <img v-if="asset.type === 'image' && previews[asset.id]" :src="previews[asset.id]"
                            class="aa-thumb-img" loading="lazy" />
                        <div v-else class="aa-thumb-icon">{{ assetIcon(asset.type) }}</div>
                        <span class="aa-type-badge">{{ asset.type }}</span>
                    </div>
                    <!-- 信息 -->
                    <div class="aa-card-body">
                        <div class="aa-card-name" :title="asset.name">{{ asset.name }}</div>
                        <div class="aa-card-meta">
                            <span>{{ formatSize(asset.size) }}</span>
                            <span v-if="asset.game_id == null" class="aa-public-tag">公共</span>
                            <span v-else class="aa-game-tag">#{{ asset.game_id }}</span>
                        </div>
                        <div class="aa-card-date">{{ formatDate(asset.created_at) }}</div>
                    </div>
                    <!-- 操作 -->
                    <div class="aa-card-actions">
                        <button class="aa-btn aa-btn-copy" title="复制引用代码" @click.stop="copyAsset(asset)">复制</button>
                        <button class="aa-btn aa-btn-del" title="删除资源" @click.stop="removeAsset(asset)">🗑 删除</button>
                    </div>
                </div>
            </div>

            <!-- 分页 -->
            <div v-if="pages > 1" class="aa-pagination">
                <button class="aa-pg" :disabled="page <= 1" @click="load(page - 1)">‹</button>
                <button v-for="p in pageList" :key="p" class="aa-pg"
                    :class="{ active: p === page, ellipsis: p === '…' }" :disabled="p === '…'"
                    @click="p !== '…' && load(Number(p))">{{ p }}</button>
                <button class="aa-pg" :disabled="page >= pages" @click="load(page + 1)">›</button>
                <span class="aa-pg-info">共 {{ total }} 个</span>
            </div>
        </div>

        <!-- ── 详情抽屉 ── -->
        <Teleport to="body">
            <Transition name="aa-drawer">
                <div v-if="detailOpen" class="aa-drawer-overlay" @click.self="closeDetail">
                    <div class="aa-drawer">
                        <div class="aa-drawer-header">
                            <span class="aa-drawer-title">📄 资源详情</span>
                            <button class="aa-drawer-close" @click="closeDetail">✕</button>
                        </div>

                        <div v-if="detailLoading" class="aa-drawer-loading">
                            <span class="aa-spin" style="font-size:1.5rem">🌸</span> 加载中…
                        </div>

                        <template v-else-if="detailAsset">
                            <!-- 预览区 -->
                            <div class="aa-drawer-preview">
                                <img v-if="detailAsset.type === 'image'" :src="detailAsset.data_uri"
                                    class="aa-drawer-img" />
                                <audio v-else-if="detailAsset.type === 'audio'" :src="detailAsset.data_uri" controls
                                    class="aa-drawer-audio" />
                                <pre v-else-if="detailAsset.type === 'json' || detailAsset.type === 'text'"
                                    class="aa-drawer-text">{{ textPreview }}</pre>
                                <div v-else class="aa-drawer-other">{{ assetIcon(detailAsset.type) }}</div>
                            </div>

                            <!-- 元信息表格 -->
                            <table class="aa-meta-table">
                                <tr>
                                    <th>ID</th>
                                    <td>#{{ detailAsset.id }}</td>
                                </tr>
                                <tr>
                                    <th>文件名</th>
                                    <td class="td-break">{{ detailAsset.name }}</td>
                                </tr>
                                <tr>
                                    <th>MIME</th>
                                    <td>{{ detailAsset.mime }}</td>
                                </tr>
                                <tr>
                                    <th>大小</th>
                                    <td>{{ formatSize(detailAsset.size) }}</td>
                                </tr>
                                <tr>
                                    <th>范围</th>
                                    <td>
                                        <span v-if="detailAsset.game_id == null" class="aa-public-tag">公共资源</span>
                                        <span v-else class="aa-game-tag">游戏 #{{ detailAsset.game_id }}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <th>上传时间</th>
                                    <td>{{ formatDateFull(detailAsset.created_at) }}</td>
                                </tr>
                            </table>

                            <!-- 引用代码 -->
                            <div class="aa-drawer-section">引用代码</div>
                            <div class="aa-snippet-wrap">
                                <pre class="aa-snippet">{{ detailSnippet }}</pre>
                                <button class="aa-snippet-copy" @click="copySnippet">{{ snippetCopied ? '✅ 已复制' : '复制'
                                }}</button>
                            </div>

                            <!-- 操作 -->
                            <div class="aa-drawer-foot">
                                <button class="aa-drawer-copy-btn" @click="copyAsset(detailAsset)">📋 复制引用代码</button>
                                <button class="aa-drawer-del-btn" @click="removeAsset(detailAsset)">🗑 删除此资源</button>
                            </div>
                        </template>
                    </div>
                </div>
            </Transition>
        </Teleport>

    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
    listAssets, getAsset, uploadAsset, deleteAsset, getAssetQuota,
    formatSize, assetIcon,
    type Asset, type AssetType, type AssetQuota,
} from '@/api/assets'

// ── 常量 ──────────────────────────────────────────────────────
const ACCEPT_MIME = [
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
    'application/json', 'text/plain', 'text/csv',
].join(',')

const typeFilters = [
    { value: '', icon: '🗂', label: '全部' },
    { value: 'image', icon: '🖼️', label: '图片' },
    { value: 'audio', icon: '🎵', label: '音频' },
    { value: 'json', icon: '📋', label: 'JSON' },
    { value: 'text', icon: '📄', label: '文本' },
    { value: 'other', icon: '📦', label: '其他' },
]

// ── 状态 ──────────────────────────────────────────────────────
const loading = ref(false)
const assets = ref<Asset[]>([])
const previews = ref<Record<number, string>>({})
const total = ref(0)
const page = ref(1)
const pages = ref(1)
const quota = ref<AssetQuota>({ used: 0, limit: 100 * 1024 * 1024, pct: 0 })
const selectedId = ref<number | null>(null)

const query = ref({
    search: '',
    type: '' as AssetType | '',
    scope: 'all' as 'all' | 'public',
    limit: 24,
})

const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const tip = ref({ msg: '', cls: '' })

// ── 详情抽屉 ──────────────────────────────────────────────────
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailAsset = ref<Asset | null>(null)
const textPreview = ref('')
const snippetCopied = ref(false)

const detailSnippet = computed(() => {
    const a = detailAsset.value
    if (!a?.data_uri) return '/* 加载中… */'
    switch (a.type) {
        case 'image': return `<img src="${a.data_uri}" alt="${a.name}" />`
        case 'audio': return `<audio src="${a.data_uri}" controls></audio>`
        default: return a.data_uri.slice(0, 200) + (a.data_uri.length > 200 ? '…' : '')
    }
})

// ── 配额颜色 ─────────────────────────────────────────────────
const quotaClass = computed(() => {
    if (quota.value.pct >= 90) return 'quota-danger'
    if (quota.value.pct >= 70) return 'quota-warn'
    return 'quota-ok'
})

// ── 分页省略号 ───────────────────────────────────────────────
const pageList = computed(() => {
    const p = page.value, ps = pages.value
    if (ps <= 7) return Array.from({ length: ps }, (_, i) => i + 1)
    const list: (number | string)[] = [1]
    if (p > 3) list.push('…')
    for (let i = Math.max(2, p - 1); i <= Math.min(ps - 1, p + 1); i++) list.push(i)
    if (p < ps - 2) list.push('…')
    list.push(ps)
    return list
})

// ── 加载 ──────────────────────────────────────────────────────
async function load(p = 1) {
    page.value = p
    loading.value = true
    try {
        const params: Record<string, unknown> = {
            page: p,
            limit: query.value.limit,
        }
        if (query.value.type) params.type = query.value.type
        if (query.value.search) params.search = query.value.search
        if (query.value.scope === 'public') params.game_id = 'null'

        const res = await listAssets(params as any)
        assets.value = res.list
        total.value = res.total
        pages.value = Math.ceil(res.total / query.value.limit)

        // 懒加载图片缩略图
        loadPreviews()
    } catch (e: any) {
        showTip(`加载失败：${e.message}`, 'tip-err')
    } finally {
        loading.value = false
    }
}

async function loadPreviews() {
    const imgs = assets.value.filter(a => a.type === 'image' && !previews.value[a.id as number])
    const batch = 5
    for (let i = 0; i < imgs.length; i += batch) {
        await Promise.all(imgs.slice(i, i + batch).map(async a => {
            try {
                const d = await getAsset(a.id as number)
                if (d.data_uri) previews.value[a.id as number] = d.data_uri
            } catch { }
        }))
    }
}

async function loadQuota() {
    try { quota.value = await getAssetQuota() } catch { }
}

// ── 搜索防抖 ─────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => load(1), 400)
}

// ── 详情 ──────────────────────────────────────────────────────
async function openDetail(asset: Asset) {
    selectedId.value = asset.id as number
    detailAsset.value = asset
    detailLoading.value = true
    detailOpen.value = true
    document.body.style.overflow = 'hidden'
    try {
        const detail = await getAsset(asset.id as number)
        detailAsset.value = detail
        if (detail.type === 'json' || detail.type === 'text') {
            const raw = detail.data_uri?.split(',')[1] ?? ''
            try { textPreview.value = atob(raw).slice(0, 3000) } catch { textPreview.value = '' }
        }
    } catch { }
    finally { detailLoading.value = false }
}

function closeDetail() {
    detailOpen.value = false
    selectedId.value = null
    document.body.style.overflow = ''
}

async function copySnippet() {
    await navigator.clipboard.writeText(detailSnippet.value).catch(() => { })
    snippetCopied.value = true
    setTimeout(() => { snippetCopied.value = false }, 2000)
}

// ── 复制资源引用代码 ──────────────────────────────────────────
async function copyAsset(asset: Asset) {
    let full = asset
    if (!asset.data_uri) {
        try { full = await getAsset(asset.id as number) } catch { }
    }
    let snippet = ''
    switch (full.type) {
        case 'image': snippet = `<img src="${full.data_uri}" alt="${full.name}" />`; break
        case 'audio': snippet = `<audio src="${full.data_uri}" controls></audio>`; break
        default: snippet = full.data_uri ?? ''
    }
    await navigator.clipboard.writeText(snippet).catch(() => { })
    showTip('✅ 已复制引用代码', 'tip-ok')
}

// ── 上传 ──────────────────────────────────────────────────────
function triggerUpload() { fileInputRef.value?.click() }

async function handleUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
        showTip('文件超过 2MB 上限', 'tip-err')
        return
    }
    uploading.value = true
    try {
        const asset = await uploadAsset(file, null)  // 管理员上传默认为公共资源
        showTip(`✅ 上传成功：${asset.name}（${formatSize(asset.size)}）`, 'tip-ok')
        await Promise.all([loadQuota(), load(page.value)])
    } catch (e: any) {
        showTip(`❌ ${e.message}`, 'tip-err')
    } finally {
        uploading.value = false
        if (fileInputRef.value) fileInputRef.value.value = ''
    }
}

// ── 删除 ──────────────────────────────────────────────────────
async function removeAsset(asset: Asset) {
    if (!confirm(`确认删除资源「${asset.name}」？\n已嵌入游戏代码中的引用不会自动移除。`)) return
    try {
        await deleteAsset(asset.id as number)
        delete previews.value[asset.id as number]
        if (detailAsset.value?.id === asset.id) closeDetail()
        showTip('🗑 删除成功', 'tip-ok')
        await Promise.all([loadQuota(), load(page.value)])
    } catch (e: any) {
        showTip(`❌ ${e.message}`, 'tip-err')
    }
}

// ── 工具 ──────────────────────────────────────────────────────
function showTip(msg: string, cls: string) {
    tip.value = { msg, cls }
    setTimeout(() => { tip.value = { msg: '', cls: '' } }, 4000)
}

function formatDate(dt: string) {
    if (!dt) return '—'
    const d = new Date(dt)
    return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatDateFull(dt: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('zh-CN')
}

// ── 初始化 ────────────────────────────────────────────────────
onMounted(async () => {
    await Promise.all([loadQuota(), load(1)])
})
</script>

<style scoped>
/* ── 页面 ───────────────────────────────────────────────────── */
.aa-page {
    min-height: 100vh;
    background: var(--sakura-50, #fff5f8);
}

/* ── Hero ───────────────────────────────────────────────────── */
.aa-hero {
    background: linear-gradient(135deg, var(--sakura-500, #e87da0), var(--sakura-600, #c44d75));
    color: #fff;
    padding: 28px 0 24px;
}

.aa-hero-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
}

.aa-title {
    font-size: 1.5rem;
    font-weight: 900;
    margin-bottom: 4px;
}

.aa-sub {
    font-size: 0.85rem;
    opacity: 0.85;
}

.aa-hero-stats {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.stat-card {
    background: rgba(255, 255, 255, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    padding: 10px 18px;
    text-align: center;
    min-width: 80px;
}

.stat-n {
    display: block;
    font-size: 1.3rem;
    font-weight: 800;
}

.stat-l {
    font-size: 0.7rem;
    opacity: 0.8;
    white-space: nowrap;
}

.stat-pct {
    display: block;
    font-size: 0.85rem;
    font-weight: 700;
}

.quota-bar-lg {
    width: 80px;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.2);
    overflow: hidden;
    margin: 4px 0 2px;
}

.quota-fill-lg {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s;
}

.quota-ok .quota-fill-lg {
    background: #6ee7b7;
}

.quota-warn .quota-fill-lg {
    background: #fcd34d;
}

.quota-danger .quota-fill-lg {
    background: #fca5a5;
}

/* ── 工具栏 ─────────────────────────────────────────────────── */
.aa-toolbar {
    background: #fff;
    border-bottom: 1px solid var(--border, #f0d6df);
    position: sticky;
    top: 64px;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(196, 77, 117, 0.06);
}

.aa-toolbar-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 10px 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.search-wrap {
    flex: 1;
    min-width: 180px;
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

.aa-search {
    width: 100%;
    padding: 7px 32px 7px 32px;
    border-radius: 18px;
    border: 1.5px solid var(--border, #f0d6df);
    background: var(--sakura-50, #fff5f8);
    font-size: 0.87rem;
    outline: none;
    transition: border-color 0.2s;
}

.aa-search:focus {
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
}

.aa-type-tabs {
    display: flex;
    gap: 4px;
}

.aa-type-tab {
    padding: 5px 12px;
    border-radius: 14px;
    font-size: 0.76rem;
    font-weight: 600;
    border: 1.5px solid var(--border, #f0d6df);
    background: none;
    cursor: pointer;
    color: var(--ink-500, #888);
    white-space: nowrap;
    transition: all 0.18s;
}

.aa-type-tab.active {
    background: var(--sakura-500, #e87da0);
    border-color: var(--sakura-500);
    color: #fff;
}

.aa-select {
    padding: 6px 10px;
    border-radius: 10px;
    border: 1.5px solid var(--border, #f0d6df);
    background: var(--sakura-50, #fff5f8);
    font-size: 0.8rem;
    cursor: pointer;
    outline: none;
}

.aa-select-sm {
    min-width: 85px;
}

.aa-upload-btn {
    padding: 7px 18px;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--sakura-500, #e87da0), var(--sakura-600, #c44d75));
    color: #fff;
    border: none;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(196, 77, 117, 0.25);
    transition: all 0.2s;
    white-space: nowrap;
}

.aa-upload-btn:hover:not(:disabled) {
    transform: translateY(-1px);
}

.aa-upload-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.aa-file-input {
    display: none;
}

/* 提示条 */
.aa-tip {
    padding: 8px 24px;
    font-size: 0.82rem;
    font-weight: 600;
}

.tip-ok {
    background: #d1fae5;
    color: #059669;
}

.tip-err {
    background: #fee2e2;
    color: #dc2626;
}

/* ── 主体 ───────────────────────────────────────────────────── */
.aa-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px 24px;
}

.aa-loading,
.aa-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px;
    gap: 12px;
    color: var(--ink-300, #ccc);
}

.aa-loading {
    flex-direction: row;
}

.aa-empty-title {
    font-size: 1rem;
    font-weight: 600;
}

.aa-empty-sub {
    font-size: 0.82rem;
}

/* ── 网格 ───────────────────────────────────────────────────── */
.aa-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
}

.aa-card {
    background: #fff;
    border-radius: 14px;
    border: 2px solid var(--border, #f0d6df);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.18s;
    display: flex;
    flex-direction: column;
}

.aa-card:hover {
    border-color: var(--sakura-300, #f9b8cc);
    box-shadow: 0 4px 16px rgba(196, 77, 117, 0.12);
    transform: translateY(-2px);
}

.aa-card.selected {
    border-color: var(--sakura-500, #e87da0);
    box-shadow: 0 0 0 3px rgba(232, 125, 160, 0.2);
}

.aa-card-thumb {
    height: 100px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sakura-50, #fff5f8);
    overflow: hidden;
}

.aa-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.aa-thumb-icon {
    font-size: 2.2rem;
}

.aa-type-badge {
    position: absolute;
    bottom: 4px;
    right: 4px;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    text-transform: uppercase;
}

.aa-card-body {
    padding: 8px 10px 4px;
    flex: 1;
}

.aa-card-name {
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--ink-600, #555);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.aa-card-meta {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 3px;
    font-size: 0.68rem;
    color: var(--ink-400, #aaa);
}

.aa-public-tag {
    background: #d1fae5;
    color: #065f46;
    font-size: 0.6rem;
    padding: 1px 5px;
    border-radius: 6px;
    font-weight: 700;
}

.aa-game-tag {
    background: #dbeafe;
    color: #1e40af;
    font-size: 0.6rem;
    padding: 1px 5px;
    border-radius: 6px;
    font-weight: 700;
}

.aa-card-date {
    font-size: 0.64rem;
    color: var(--ink-300, #ccc);
    margin-top: 2px;
}

.aa-card-actions {
    display: flex;
    gap: 4px;
    padding: 4px 8px 8px;
}

.aa-btn {
    flex: 1;
    padding: 4px 0;
    border-radius: 8px;
    border: 1px solid var(--border, #f0d6df);
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    background: none;
    color: var(--ink-500, #888);
    transition: all 0.15s;
}

.aa-btn-copy:hover {
    background: #fef9c3;
    border-color: #fcd34d;
    color: #92400e;
}

.aa-btn-del:hover {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #dc2626;
}

/* ── 分页 ───────────────────────────────────────────────────── */
.aa-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 24px;
    flex-wrap: wrap;
}

.aa-pg {
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

.aa-pg:hover:not(:disabled):not(.ellipsis) {
    border-color: var(--sakura-400);
    color: var(--sakura-600);
}

.aa-pg.active {
    background: var(--sakura-500, #e87da0);
    border-color: var(--sakura-500);
    color: #fff;
}

.aa-pg:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.aa-pg.ellipsis {
    border: none;
    background: none;
    cursor: default;
}

.aa-pg-info {
    font-size: 0.78rem;
    color: var(--ink-400, #aaa);
    margin-left: 8px;
}

/* ── 详情抽屉 ───────────────────────────────────────────────── */
.aa-drawer-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    justify-content: flex-end;
}

.aa-drawer {
    width: 360px;
    max-width: 92vw;
    height: 100%;
    background: #fff;
    border-left: 1px solid var(--border, #f0d6df);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    box-shadow: -8px 0 32px rgba(196, 77, 117, 0.1);
}

.aa-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border, #f0d6df);
    flex-shrink: 0;
    background: linear-gradient(135deg, var(--sakura-50, #fff5f8), #fff);
}

.aa-drawer-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--sakura-600, #c44d75);
}

.aa-drawer-close {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: var(--ink-400, #aaa);
    padding: 4px 8px;
    border-radius: 8px;
}

.aa-drawer-close:hover {
    background: var(--sakura-100);
}

.aa-drawer-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 40px;
    color: var(--ink-400);
    justify-content: center;
}

.aa-drawer-preview {
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 160px;
    background: var(--sakura-50, #fff5f8);
    border-bottom: 1px solid var(--border, #f0d6df);
}

.aa-drawer-img {
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
    border-radius: 10px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.aa-drawer-audio {
    width: 100%;
}

.aa-drawer-text {
    font-size: 0.72rem;
    font-family: monospace;
    white-space: pre-wrap;
    max-height: 160px;
    overflow: auto;
    color: var(--ink-600);
    margin: 0;
    width: 100%;
}

.aa-drawer-other {
    font-size: 3.5rem;
}

.aa-meta-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
}

.aa-meta-table th {
    padding: 9px 20px;
    font-weight: 600;
    color: var(--ink-400, #aaa);
    text-align: left;
    width: 80px;
    border-bottom: 1px solid var(--sakura-50, #fff5f8);
}

.aa-meta-table td {
    padding: 9px 20px;
    color: var(--ink-600, #555);
    border-bottom: 1px solid var(--sakura-50, #fff5f8);
}

.td-break {
    word-break: break-all;
}

.aa-drawer-section {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sakura-500);
    padding: 12px 20px 6px;
}

.aa-snippet-wrap {
    position: relative;
    margin: 0 16px 16px;
}

.aa-snippet {
    background: #1a1020;
    color: #f0e0e8;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 0.7rem;
    font-family: monospace;
    overflow: auto;
    max-height: 100px;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
}

.aa-snippet-copy {
    position: absolute;
    top: 5px;
    right: 5px;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.62rem;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition: all 0.2s;
}

.aa-snippet-copy:hover {
    background: rgba(255, 255, 255, 0.25);
}

.aa-drawer-foot {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    border-top: 1px solid var(--border, #f0d6df);
    margin-top: auto;
}

.aa-drawer-copy-btn {
    padding: 10px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 700;
    background: var(--sakura-50, #fff5f8);
    color: var(--sakura-600, #c44d75);
    border: 1.5px solid var(--sakura-300, #f9b8cc);
    cursor: pointer;
    transition: all 0.2s;
}

.aa-drawer-copy-btn:hover {
    background: var(--sakura-100, #fde8ef);
}

.aa-drawer-del-btn {
    padding: 10px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 700;
    background: none;
    color: #dc2626;
    border: 1.5px solid #fca5a5;
    cursor: pointer;
    transition: all 0.2s;
}

.aa-drawer-del-btn:hover {
    background: #fee2e2;
}

/* ── 动画 ───────────────────────────────────────────────────── */
.aa-spin {
    animation: aasin 1s linear infinite;
    display: inline-block;
}

@keyframes aasin {
    to {
        transform: rotate(360deg);
    }
}

.aa-drawer-enter-active,
.aa-drawer-leave-active {
    transition: transform 0.25s ease;
}

.aa-drawer-enter-from,
.aa-drawer-leave-to {
    transform: translateX(100%);
}

.aa-tip-enter-active,
.aa-tip-leave-active {
    transition: all 0.2s;
}

.aa-tip-enter-from,
.aa-tip-leave-to {
    opacity: 0;
    max-height: 0;
    padding: 0 24px;
}

.aa-tip-enter-to,
.aa-tip-leave-from {
    opacity: 1;
    max-height: 50px;
}

@media (max-width: 640px) {
    .aa-type-tabs {
        display: none;
    }

    .aa-grid {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    }
}
</style>