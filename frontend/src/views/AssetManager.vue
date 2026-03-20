<template>
    <!--
    AssetManager.vue — 双模式资源管理器
    =====================================
    mode="local"  → 本地模式：资源存入 localStorage（无需登录/后端）
    mode="cloud"  → 云端模式：资源存入数据库（需管理员 token）

    用法：
      <!-- 编辑器本地模式 -->
    <AssetManager mode="local" v-model:open="open" @insert="onInsert" />

    <!-- 在线游戏管理云端模式 -->
    <AssetManager mode="cloud" :game-id="gameId" v-model:open="open" @insert="onInsert" />
    -->
    <Teleport to="body">
        <Transition name="am-modal">
            <div v-if="open" class="am-overlay" @click.self="$emit('update:open', false)">
                <div class="am-panel">

                    <!-- ── 头部 ── -->
                    <div class="am-header">
                        <div class="am-header-left">
                            <span class="am-title">🗂 资源管理器</span>
                            <!-- 模式标签 -->
                            <span class="am-mode-tag" :class="mode === 'local' ? 'mode-local' : 'mode-cloud'">
                                {{ mode === 'local' ? '💾 本地存储' : '☁️ 云端存储' }}
                            </span>
                            <span v-if="mode === 'cloud' && gameId != null" class="am-scope-tag">游戏 #{{ gameId }}</span>
                        </div>
                        <div class="am-header-right">
                            <!-- 用量条 -->
                            <div class="am-quota" :title="`已用 ${formatSize(quota.used)} / ${formatSize(quota.limit)}`">
                                <div class="am-quota-bar">
                                    <div class="am-quota-fill" :class="quotaClass"
                                        :style="{ width: Math.min(quota.pct, 100) + '%' }" />
                                </div>
                                <span class="am-quota-text" :class="quotaClass">
                                    {{ formatSize(quota.used) }} / {{ formatSize(quota.limit) }} ({{ quota.pct }}%)
                                </span>
                            </div>
                            <button class="am-close" @click="$emit('update:open', false)">✕</button>
                        </div>
                    </div>

                    <!-- ── 工具栏 ── -->
                    <div class="am-toolbar">
                        <!-- 类型筛选 -->
                        <div class="am-type-tabs">
                            <button v-for="t in typeFilters" :key="t.value" class="am-type-tab"
                                :class="{ active: filterType === t.value }"
                                @click="filterType = t.value; loadAssets()">{{ t.icon }} {{ t.label }}</button>
                        </div>

                        <!-- 云端专属：作用域切换 -->
                        <div v-if="mode === 'cloud'" class="am-scope-tabs">
                            <button class="am-scope-tab" :class="{ active: scope === 'game' }"
                                :disabled="gameId == null" @click="scope = 'game'; loadAssets()">当前游戏</button>
                            <button class="am-scope-tab" :class="{ active: scope === 'all' }"
                                @click="scope = 'all'; loadAssets()">全部资源</button>
                        </div>

                        <!-- 上传按钮 -->
                        <button class="am-upload-btn" :disabled="uploading" @click="triggerUpload">
                            <span v-if="uploading" class="am-spin">⏳</span>
                            <span v-else>⬆ 上传资源</span>
                        </button>
                        <input ref="fileInputRef" type="file" class="am-file-input" :accept="ACCEPT_MIME"
                            @change="handleFileChange" />
                    </div>

                    <!-- 提示条 -->
                    <Transition name="am-tip">
                        <div v-if="uploadTip" class="am-tip" :class="uploadTipClass">{{ uploadTip }}</div>
                    </Transition>

                    <!-- ── 主体（网格 + 详情侧栏） ── -->
                    <div class="am-body" ref="bodyRef">
                        <div v-if="loading" class="am-loading">
                            <span class="am-spin" style="font-size:1.8rem">🌸</span><span>加载中…</span>
                        </div>

                        <div v-else-if="displayAssets.length === 0" class="am-empty">
                            <div class="am-empty-icon">🗂</div>
                            <div class="am-empty-text">暂无资源</div>
                            <div class="am-empty-sub">点击「⬆ 上传资源」添加图片、音频等文件</div>
                        </div>

                        <template v-else>
                            <!-- 网格 -->
                            <div class="am-grid-wrap">
                                <div class="am-grid">
                                    <div v-for="asset in pagedAssets" :key="asset.id" class="am-card"
                                        :class="{ selected: selectedId === asset.id }" @click="selectAsset(asset)">
                                        <div class="am-card-preview">
                                            <img v-if="asset.type === 'image'" :src="asset.data_uri || ''"
                                                class="am-card-img" loading="lazy" :alt="asset.name" />
                                            <div v-else class="am-card-icon">{{ assetIcon(asset.type) }}</div>
                                        </div>
                                        <div class="am-card-info">
                                            <div class="am-card-name" :title="asset.name">{{ asset.name }}</div>
                                            <div class="am-card-meta">
                                                <span class="am-card-size">{{ formatSize(asset.size) }}</span>
                                                <span v-if="mode === 'cloud' && (asset as any).game_id == null"
                                                    class="am-card-scope">公共</span>
                                            </div>
                                        </div>
                                        <div class="am-card-actions">
                                            <button class="am-card-btn am-card-insert"
                                                @click.stop="insertAsset(asset)">插入</button>
                                            <button class="am-card-btn am-card-copy"
                                                @click.stop="copyRef(asset)">复制</button>
                                            <button class="am-card-btn am-card-del"
                                                @click.stop="removeAsset(asset)">🗑</button>
                                        </div>
                                    </div>
                                </div>

                                <!-- 分页 -->
                                <div v-if="totalPages > 1" class="am-pagination">
                                    <button class="am-pg" :disabled="page <= 1" @click="goPage(page - 1)">‹</button>
                                    <span class="am-pg-info">{{ page }} / {{ totalPages }}</span>
                                    <button class="am-pg" :disabled="page >= totalPages"
                                        @click="goPage(page + 1)">›</button>
                                </div>
                            </div>

                            <!-- 详情侧栏 -->
                            <Transition name="am-detail">
                                <div v-if="selectedAsset" class="am-detail">
                                    <div class="am-detail-header">
                                        <span>资源详情</span>
                                        <button class="am-detail-close"
                                            @click="selectedId = null; selectedAsset = null">✕</button>
                                    </div>
                                    <div class="am-detail-preview">
                                        <img v-if="selectedAsset.type === 'image'" :src="selectedAsset.data_uri"
                                            class="am-detail-img" />
                                        <audio v-else-if="selectedAsset.type === 'audio'" :src="selectedAsset.data_uri"
                                            controls class="am-detail-audio" />
                                        <pre v-else-if="selectedAsset.type === 'json' || selectedAsset.type === 'text'"
                                            class="am-detail-text">{{ textPreview }}</pre>
                                        <div v-else class="am-detail-other">{{ assetIcon(selectedAsset.type) }}</div>
                                    </div>
                                    <table class="am-detail-table">
                                        <tr>
                                            <td>名称</td>
                                            <td>{{ selectedAsset.name }}</td>
                                        </tr>
                                        <tr>
                                            <td>类型</td>
                                            <td>{{ selectedAsset.mime }}</td>
                                        </tr>
                                        <tr>
                                            <td>大小</td>
                                            <td>{{ formatSize(selectedAsset.size) }}</td>
                                        </tr>
                                        <tr v-if="mode === 'cloud'">
                                            <td>范围</td>
                                            <td>{{ (selectedAsset as any).game_id == null ? '公共资源' : `游戏
                                                #${(selectedAsset as any).game_id}` }}</td>
                                        </tr>
                                        <tr>
                                            <td>{{ mode === 'local' ? '添加' : '上传' }}</td>
                                            <td>{{ formatDate(selectedAsset.created_at) }}</td>
                                        </tr>
                                    </table>
                                    <div class="am-detail-section">引用代码</div>
                                    <div class="am-snippet-wrap">
                                        <pre class="am-snippet">{{ currentSnippet }}</pre>
                                        <button class="am-snippet-copy" @click="copySnippet">{{ copied ? '✅ 已复制' : '复制'
                                            }}</button>
                                    </div>
                                    <div class="am-detail-actions">
                                        <button class="am-detail-insert" @click="insertAsset(selectedAsset)">⬅
                                            插入到代码</button>
                                        <button class="am-detail-del" @click="removeAsset(selectedAsset)">🗑 删除</button>
                                    </div>
                                </div>
                            </Transition>
                        </template>
                    </div>

                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
// 云端 API
import {
    listAssets, getAsset, uploadAsset, deleteAsset, getAssetQuota, getGameAssets,
    formatSize, assetIcon, assetSnippet,
    type Asset, type AssetType, type AssetQuota,
} from '@/api/assets'
// 本地 Store
import { useLocalAssetsStore, type LocalAsset, type LocalAssetType } from '@/stores/localAssets'

// ── Props / Emits ─────────────────────────────────────────────
const props = withDefaults(defineProps<{
    open: boolean
    mode?: 'local' | 'cloud'   // 默认 cloud（向后兼容）
    gameId?: number | null
}>(), {
    mode: 'cloud',
    gameId: null,
})

const emit = defineEmits<{
    (e: 'update:open', val: boolean): void
    (e: 'insert', payload: { snippet: string; asset: Asset | LocalAsset }): void
}>()

// ── 本地 Store（本地模式时使用）──────────────────────────────
const localStore = useLocalAssetsStore()

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

const PAGE_SIZE = 24

// ── 状态 ──────────────────────────────────────────────────────
const loading = ref(false)
const cloudAssets = ref<Asset[]>([])
const cloudTotal = ref(0)
const cloudQuota = ref<AssetQuota>({ used: 0, limit: 100 * 1024 * 1024, pct: 0 })
const filterType = ref<string>('')
const scope = ref<'game' | 'all'>(props.gameId != null ? 'game' : 'all')
const page = ref(1)

const selectedId = ref<string | number | null>(null)
const selectedAsset = ref<Asset | LocalAsset | null>(null)
const textPreview = ref('')
const copied = ref(false)

const uploading = ref(false)
const uploadTip = ref('')
const uploadTipClass = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)

// ── 统一"当前模式的资源列表" ───────────────────────────────────
const displayAssets = computed<Array<Asset | LocalAsset>>(() => {
    if (props.mode === 'local') {
        return localStore.filterByType(filterType.value as LocalAssetType | '')
    }
    return cloudAssets.value
})

const totalPages = computed(() =>
    props.mode === 'local'
        ? Math.ceil(displayAssets.value.length / PAGE_SIZE)
        : Math.ceil(cloudTotal.value / PAGE_SIZE)
)

const pagedAssets = computed<Array<Asset | LocalAsset>>(() => {
    if (props.mode === 'local') {
        const start = (page.value - 1) * PAGE_SIZE
        return displayAssets.value.slice(start, start + PAGE_SIZE)
    }
    return cloudAssets.value  // 云端分页由后端控制
})

// ── 用量 ──────────────────────────────────────────────────────
const quota = computed<AssetQuota>(() =>
    props.mode === 'local' ? localStore.quota : cloudQuota.value
)
const quotaClass = computed(() => {
    if (quota.value.pct >= 90) return 'quota-danger'
    if (quota.value.pct >= 70) return 'quota-warn'
    return 'quota-ok'
})

// ── 代码片段（统一处理本地/云端）─────────────────────────────
const currentSnippet = computed(() => {
    if (!selectedAsset.value) return ''
    const a = selectedAsset.value
    if (!a.data_uri) return `/* 资源加载中... */`
    return buildSnippet(a)
})

function buildSnippet(asset: Asset | LocalAsset): string {
    const uri = asset.data_uri
    if (!uri) return `/* 请先获取资源详情 */`
    switch (asset.type) {
        case 'image': return `<img src="${uri}" alt="${asset.name}" />`
        case 'audio': return `<audio src="${uri}" controls></audio>`
        default: return uri
    }
}

// ── 加载云端资源 ──────────────────────────────────────────────
async function loadCloudAssets() {
    loading.value = true
    try {
        let result
        if (scope.value === 'game' && props.gameId != null) {
            result = await getGameAssets(props.gameId)
            cloudAssets.value = result.list
            cloudTotal.value = result.list.length
        } else {
            result = await listAssets({
                type: filterType.value as AssetType || undefined,
                page: page.value,
                limit: PAGE_SIZE,
            })
            cloudAssets.value = result.list
            cloudTotal.value = result.total
        }
        // 懒加载图片预览
        loadCloudImagePreviews()
    } catch (e: any) {
        showTip(`加载失败：${e.message}`, 'tip-err')
    } finally {
        loading.value = false
    }
}

async function loadCloudImagePreviews() {
    const imgs = cloudAssets.value.filter(a => a.type === 'image' && !a.data_uri)
    const batch = 5
    for (let i = 0; i < imgs.length; i += batch) {
        await Promise.all(imgs.slice(i, i + batch).map(async asset => {
            try {
                const detail = await getAsset(asset.id as number)
                const idx = cloudAssets.value.findIndex(a => a.id === asset.id)
                if (idx !== -1) cloudAssets.value[idx] = detail
            } catch { }
        }))
    }
}

async function loadCloudQuota() {
    try { cloudQuota.value = await getAssetQuota() } catch { }
}

async function loadAssets() {
    if (props.mode === 'local') {
        // 本地模式：store 直接响应式，无需异步加载
        loading.value = false
        return
    }
    await loadCloudAssets()
}

// ── 选中资源 ──────────────────────────────────────────────────
async function selectAsset(asset: Asset | LocalAsset) {
    const id = asset.id
    if (selectedId.value === id) {
        selectedId.value = null
        selectedAsset.value = null
        return
    }
    selectedId.value = id
    selectedAsset.value = asset

    if (props.mode === 'local') {
        // 本地资源已有完整 data_uri，直接处理文本预览
        if (asset.type === 'json' || asset.type === 'text') {
            const raw = (asset as LocalAsset).data_uri.split(',')[1] ?? ''
            try { textPreview.value = atob(raw).slice(0, 2000) } catch { textPreview.value = raw.slice(0, 200) }
        }
    } else {
        // 云端：异步拉详情获取 data_uri
        try {
            const detail = await getAsset(asset.id as number)
            selectedAsset.value = detail
            if (detail.type === 'json' || detail.type === 'text') {
                const raw = detail.data_uri?.split(',')[1] ?? ''
                try { textPreview.value = atob(raw).slice(0, 2000) } catch { textPreview.value = raw.slice(0, 200) }
            }
        } catch { }
    }
}

// ── 插入 ──────────────────────────────────────────────────────
async function insertAsset(asset: Asset | LocalAsset) {
    let full = asset
    if (props.mode === 'cloud' && !(asset as Asset).data_uri) {
        try { full = await getAsset(asset.id as number) } catch { }
    }
    const snippet = buildSnippet(full)
    emit('insert', { snippet, asset: full })
    emit('update:open', false)
}

// ── 复制 ──────────────────────────────────────────────────────
async function copyRef(asset: Asset | LocalAsset) {
    let full = asset
    if (props.mode === 'cloud' && !(asset as Asset).data_uri) {
        try { full = await getAsset(asset.id as number) } catch { }
    }
    const snippet = buildSnippet(full)
    await navigator.clipboard.writeText(snippet).catch(() => { })
    showTip('✅ 已复制引用代码', 'tip-ok')
}

async function copySnippet() {
    if (!currentSnippet.value) return
    await navigator.clipboard.writeText(currentSnippet.value).catch(() => { })
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
}

// ── 上传 ──────────────────────────────────────────────────────
function triggerUpload() { fileInputRef.value?.click() }

async function handleFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    uploading.value = true
    uploadTip.value = ''
    try {
        if (props.mode === 'local') {
            // ── 本地模式：存入 localStorage ──────────────────────────
            const asset = await localStore.uploadFile(file)
            showTip(`✅ 已添加到本地：${asset.name}（${formatSize(asset.size)}）`, 'tip-ok')
            // store 响应式，自动刷新
        } else {
            // ── 云端模式：上传到服务器 ────────────────────────────────
            if (file.size > 2 * 1024 * 1024) {
                showTip('文件超过 2MB 上限', 'tip-err')
                return
            }
            const asset = await uploadAsset(file, props.gameId ?? null)
            showTip(`✅ 上传成功：${asset.name}（${formatSize(asset.size)}）`, 'tip-ok')
            await loadCloudQuota()
            await loadAssets()
        }
    } catch (e: any) {
        showTip(`❌ ${e.message}`, 'tip-err')
    } finally {
        uploading.value = false
        if (fileInputRef.value) fileInputRef.value.value = ''
    }
}

// ── 删除 ──────────────────────────────────────────────────────
async function removeAsset(asset: Asset | LocalAsset) {
    if (!confirm(`确认删除资源「${asset.name}」？\n已嵌入代码中的引用不会自动移除。`)) return
    try {
        if (props.mode === 'local') {
            localStore.remove(asset.id as string)
        } else {
            await deleteAsset(asset.id as number)
            await loadCloudQuota()
            await loadAssets()
        }
        if (selectedId.value === asset.id) {
            selectedId.value = null
            selectedAsset.value = null
        }
        showTip('🗑 删除成功', 'tip-ok')
    } catch (e: any) {
        showTip(`❌ ${e.message}`, 'tip-err')
    }
}

// ── 分页 ──────────────────────────────────────────────────────
async function goPage(p: number) {
    page.value = p
    if (props.mode === 'cloud') await loadAssets()
    bodyRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── 工具 ──────────────────────────────────────────────────────
function showTip(msg: string, cls: string) {
    uploadTip.value = msg
    uploadTipClass.value = cls
    setTimeout(() => { uploadTip.value = '' }, 4000)
}
function formatDate(dt: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('zh-CN')
}

// ── 生命周期 ──────────────────────────────────────────────────
watch(() => props.open, async (v) => {
    if (!v) { document.body.style.overflow = ''; return }
    document.body.style.overflow = 'hidden'
    scope.value = props.gameId != null ? 'game' : 'all'
    page.value = 1
    filterType.value = ''
    selectedId.value = null
    selectedAsset.value = null
    if (props.mode === 'cloud') {
        await Promise.all([loadCloudQuota(), loadAssets()])
    }
    // 本地模式：store 已持久化，直接展示，无需异步
})
</script>

<style scoped>
/* ── 遮罩 ───────────────────────────────────────────────────── */
.am-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
}

/* ── 面板 ───────────────────────────────────────────────────── */
.am-panel {
    background: #fff;
    border-radius: 20px;
    width: 100%;
    max-width: 960px;
    height: 88vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 80px rgba(196, 77, 117, 0.18);
    overflow: hidden;
}

/* ── 头部 ───────────────────────────────────────────────────── */
.am-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid var(--border, #f0d6df);
    flex-shrink: 0;
    background: linear-gradient(135deg, var(--sakura-50, #fff5f8), #fff);
}

.am-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.am-header-right {
    display: flex;
    align-items: center;
    gap: 14px;
}

.am-title {
    font-size: 1rem;
    font-weight: 800;
    color: var(--sakura-600, #c44d75);
}

.am-mode-tag {
    font-size: 0.72rem;
    padding: 2px 9px;
    border-radius: 10px;
    font-weight: 700;
}

.mode-local {
    background: #d1fae5;
    color: #065f46;
}

.mode-cloud {
    background: #dbeafe;
    color: #1e40af;
}

.am-scope-tag {
    font-size: 0.72rem;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--sakura-100, #fde8ef);
    color: var(--sakura-600, #c44d75);
    font-weight: 600;
}

/* 配额条 */
.am-quota {
    display: flex;
    align-items: center;
    gap: 8px;
}

.am-quota-bar {
    width: 100px;
    height: 6px;
    border-radius: 3px;
    background: var(--sakura-100, #fde8ef);
    overflow: hidden;
}

.am-quota-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s;
}

.quota-ok .am-quota-fill {
    background: #059669;
}

.quota-warn .am-quota-fill {
    background: #d97706;
}

.quota-danger .am-quota-fill {
    background: #dc2626;
}

.quota-ok {
    color: #059669;
}

.quota-warn {
    color: #d97706;
}

.quota-danger {
    color: #dc2626;
}

.am-quota-text {
    font-size: 0.72rem;
    white-space: nowrap;
    font-weight: 600;
}

.am-close {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: var(--ink-400, #aaa);
    padding: 4px 8px;
    border-radius: 8px;
    transition: background 0.2s;
}

.am-close:hover {
    background: var(--sakura-100, #fde8ef);
}

/* ── 工具栏 ─────────────────────────────────────────────────── */
.am-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    border-bottom: 1px solid var(--border, #f0d6df);
    flex-shrink: 0;
    flex-wrap: wrap;
    background: #fafafa;
}

.am-type-tabs,
.am-scope-tabs {
    display: flex;
    gap: 4px;
}

.am-type-tab,
.am-scope-tab {
    padding: 5px 12px;
    border-radius: 14px;
    font-size: 0.78rem;
    font-weight: 600;
    border: 1.5px solid var(--border, #f0d6df);
    background: none;
    cursor: pointer;
    color: var(--ink-500, #888);
    white-space: nowrap;
    transition: all 0.18s;
}

.am-type-tab.active,
.am-scope-tab.active {
    background: var(--sakura-500, #e87da0);
    border-color: var(--sakura-500);
    color: #fff;
}

.am-scope-tab:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.am-upload-btn {
    margin-left: auto;
    padding: 7px 18px;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--sakura-500, #e87da0), var(--sakura-600, #c44d75));
    color: #fff;
    border: none;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: 0 3px 10px rgba(196, 77, 117, 0.25);
    transition: all 0.2s;
}

.am-upload-btn:hover:not(:disabled) {
    transform: translateY(-1px);
}

.am-upload-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.am-file-input {
    display: none;
}

/* 提示条 */
.am-tip {
    padding: 8px 20px;
    font-size: 0.82rem;
    font-weight: 600;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border, #f0d6df);
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
.am-body {
    flex: 1;
    display: flex;
    overflow: hidden;
}

.am-loading,
.am-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--ink-300, #ccc);
}

.am-loading {
    flex-direction: row;
}

.am-empty-icon {
    font-size: 2.5rem;
}

.am-empty-text {
    font-size: 1rem;
    font-weight: 600;
}

.am-empty-sub {
    font-size: 0.8rem;
}

/* 网格区 */
.am-grid-wrap {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.am-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
}

.am-card {
    border: 2px solid var(--border, #f0d6df);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.18s;
    background: #fff;
}

.am-card:hover {
    border-color: var(--sakura-300, #f9b8cc);
    box-shadow: 0 4px 14px rgba(196, 77, 117, 0.12);
    transform: translateY(-2px);
}

.am-card.selected {
    border-color: var(--sakura-500, #e87da0);
    box-shadow: 0 0 0 3px rgba(232, 125, 160, 0.2);
}

.am-card-preview {
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sakura-50, #fff5f8);
    overflow: hidden;
}

.am-card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.am-card-icon {
    font-size: 2rem;
}

.am-card-info {
    padding: 6px 8px 4px;
}

.am-card-name {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--ink-600, #555);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.am-card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 2px;
}

.am-card-size {
    font-size: 0.65rem;
    color: var(--ink-400, #aaa);
}

.am-card-scope {
    font-size: 0.6rem;
    padding: 1px 5px;
    border-radius: 8px;
    background: var(--sakura-100, #fde8ef);
    color: var(--sakura-600, #c44d75);
    font-weight: 600;
}

.am-card-actions {
    display: flex;
    padding: 4px 6px 6px;
    gap: 4px;
}

.am-card-btn {
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

.am-card-insert:hover {
    background: var(--sakura-500, #e87da0);
    color: #fff;
    border-color: var(--sakura-500);
}

.am-card-copy:hover {
    background: #fef9c3;
    border-color: #fcd34d;
    color: #92400e;
}

.am-card-del:hover {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #dc2626;
}

/* 分页 */
.am-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 4px 0;
}

.am-pg {
    min-width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 1.5px solid var(--border, #f0d6df);
    background: #fff;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--ink-600, #555);
    transition: all 0.18s;
}

.am-pg:hover:not(:disabled) {
    border-color: var(--sakura-400);
    color: var(--sakura-600);
}

.am-pg:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.am-pg-info {
    font-size: 0.78rem;
    color: var(--ink-400, #aaa);
}

/* ── 详情侧栏 ───────────────────────────────────────────────── */
.am-detail {
    width: 240px;
    flex-shrink: 0;
    border-left: 1px solid var(--border, #f0d6df);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    background: var(--sakura-50, #fff5f8);
}

.am-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border, #f0d6df);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--sakura-600, #c44d75);
    flex-shrink: 0;
}

.am-detail-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--ink-400);
    font-size: 0.85rem;
    padding: 2px 6px;
    border-radius: 6px;
}

.am-detail-close:hover {
    background: var(--sakura-100);
}

.am-detail-preview {
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    background: #fff;
    border-bottom: 1px solid var(--border, #f0d6df);
}

.am-detail-img {
    max-width: 100%;
    max-height: 160px;
    object-fit: contain;
    border-radius: 8px;
}

.am-detail-audio {
    width: 100%;
}

.am-detail-text {
    font-size: 0.68rem;
    font-family: monospace;
    white-space: pre-wrap;
    max-height: 120px;
    overflow: auto;
    color: var(--ink-600, #555);
    margin: 0;
}

.am-detail-other {
    font-size: 3rem;
}

.am-detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.72rem;
}

.am-detail-table td {
    padding: 6px 14px;
    border-bottom: 1px solid var(--sakura-50, #fff5f8);
}

.am-detail-table td:first-child {
    color: var(--ink-400, #aaa);
    width: 42px;
}

.am-detail-table td:last-child {
    color: var(--ink-600, #555);
    font-weight: 600;
    word-break: break-all;
}

.am-detail-section {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--sakura-500, #e87da0);
    padding: 10px 14px 4px;
    text-transform: uppercase;
}

.am-snippet-wrap {
    position: relative;
    margin: 0 10px 10px;
}

.am-snippet {
    background: #1a1020;
    color: #f0e0e8;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 0.66rem;
    font-family: monospace;
    overflow: auto;
    max-height: 80px;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
}

.am-snippet-copy {
    position: absolute;
    top: 4px;
    right: 4px;
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

.am-snippet-copy:hover {
    background: rgba(255, 255, 255, 0.25);
}

.am-detail-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
}

.am-detail-insert {
    padding: 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--sakura-500, #e87da0), var(--sakura-600, #c44d75));
    color: #fff;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
}

.am-detail-insert:hover {
    transform: translateY(-1px);
}

.am-detail-del {
    padding: 7px;
    border-radius: 12px;
    font-size: 0.78rem;
    font-weight: 600;
    background: none;
    color: #dc2626;
    border: 1.5px solid #fca5a5;
    cursor: pointer;
    transition: all 0.2s;
}

.am-detail-del:hover {
    background: #fee2e2;
}

/* ── 动画 ───────────────────────────────────────────────────── */
.am-spin {
    animation: spin 1s linear infinite;
    display: inline-block;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.am-modal-enter-active,
.am-modal-leave-active {
    transition: opacity 0.22s, transform 0.22s;
}

.am-modal-enter-from,
.am-modal-leave-to {
    opacity: 0;
    transform: scale(0.96) translateY(10px);
}

.am-detail-enter-active,
.am-detail-leave-active {
    transition: all 0.22s ease;
    overflow: hidden;
}

.am-detail-enter-from,
.am-detail-leave-to {
    opacity: 0;
    width: 0;
}

.am-tip-enter-active,
.am-tip-leave-active {
    transition: all 0.2s;
}

.am-tip-enter-from,
.am-tip-leave-to {
    opacity: 0;
    max-height: 0;
}

.am-tip-enter-to,
.am-tip-leave-from {
    opacity: 1;
    max-height: 50px;
}
</style>