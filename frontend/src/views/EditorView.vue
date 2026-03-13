<template>
    <div class="editor-view">

        <!-- 草稿恢复提示 -->
        <div class="draft-banner" v-if="showDraftTip">
            <span>📋 发现上次未保存的草稿</span>
            <div class="draft-banner-actions">
                <button class="draft-btn-restore" @click="restoreDraft">恢复草稿</button>
                <button class="draft-btn-discard" @click="discardDraft">丢弃</button>
            </div>
        </div>

        <!-- 顶栏 -->
        <div class="editor-topbar">
            <div class="editor-topbar-left">
                <h2 class="editor-title">✏️ 游戏编辑器</h2>
                <span class="editor-status" :class="statusClass">{{ statusText }}</span>
                <span class="draft-time" v-if="draftTime && !saved">🕐 已暂存 {{ draftTime }}</span>
            </div>
            <div class="editor-topbar-right">
                <button class="btn-icon-text" :disabled="!canUndo" @click="doUndo()" title="撤销 Ctrl+Z">↩ 撤销</button>
                <button class="btn-icon-text" :disabled="!canRedo" @click="doRedo()" title="重做 Ctrl+Y">↪ 重做</button>
                <div class="topbar-divider"></div>
                <select class="sel-lang" v-model="currentLang" @change="onLangChange" title="语言">
                    <option value="html">HTML</option>
                    <option value="javascript">JS</option>
                    <option value="css">CSS</option>
                </select>
                <button class="btn-icon-text" @click="toggleTheme" title="切换主题">
                    {{ currentTheme === 'dark' ? '☀️ 亮色' : '🌙 暗色' }}
                </button>
                <div class="topbar-divider"></div>
                <!-- ★ 资源管理器入口按钮 -->
                <button class="btn-icon-text btn-asset" @click="assetOpen = true" title="资源管理器（图片 / 音频 / JSON）">🗂
                    资源</button>
                <div class="topbar-divider"></div>
                <button class="btn-icon-text" @click="clearCode" title="清空">🗑 清空</button>
                <button class="btn-save" @click="openSaveModal" :disabled="!hasCode" title="保存 Ctrl+S">
                    💾 保存到本地
                </button>
            </div>
        </div>

        <!-- 主体 -->
        <div class="editor-body">

            <!-- 左：CodeMirror 编辑器 -->
            <div class="editor-pane" v-show="layout !== 'preview'">
                <div class="pane-header">
                    <span class="pane-title">📝 代码</span>
                    <span class="code-len">{{ codeLength }} 字符 · {{ lineCount }} 行</span>
                </div>
                <div ref="editorContainer" class="cm-wrap"></div>
            </div>

            <!-- 分隔线 -->
            <div class="resize-handle" v-show="layout === 'split'" @mousedown="startResize"></div>

            <!-- 右：实时预览 -->
            <div class="preview-pane" v-show="layout !== 'editor'">
                <div class="pane-header">
                    <span class="pane-title">👁 预览</span>
                    <div class="preview-actions">
                        <button class="btn-sm" @click="refreshPreview">↺ 刷新</button>
                        <button class="btn-sm" @click="openFullPreview">⛶ 全屏</button>
                    </div>
                </div>
                <div class="preview-wrap">
                    <iframe ref="previewRef" class="preview-iframe"
                        sandbox="allow-scripts allow-same-origin allow-modals" :srcdoc="previewCode" frameborder="0"
                        style="background:#fff" />
                    <div class="preview-empty" v-if="!hasCode">
                        <span>🎮</span>
                        <p>在左侧输入代码后自动预览</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 底部工具栏 -->
        <div class="editor-toolbar">
            <div class="toolbar-group">
                <span class="toolbar-label">布局：</span>
                <button v-for="l in layouts" :key="l.value" class="btn-layout" :class="{ active: layout === l.value }"
                    @click="layout = l.value">{{ l.label }}</button>
            </div>
            <div class="toolbar-group">
                <span class="toolbar-label">模板：</span>
                <button v-for="tpl in templates" :key="tpl.name" class="btn-tpl" @click="applyTemplate(tpl)">{{ tpl.name
                    }}</button>
            </div>
            <div class="toolbar-group toolbar-shortcuts">
                <span class="toolbar-label">快捷键：</span>
                <span class="shortcut"><kbd>Ctrl</kbd>+<kbd>S</kbd> 保存</span>
                <span class="shortcut"><kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤销</span>
                <span class="shortcut"><kbd>Ctrl</kbd>+<kbd>Y</kbd> 重做</span>
                <span class="shortcut"><kbd>Tab</kbd> 缩进</span>
            </div>
        </div>

        <!-- 保存弹窗 -->
        <div class="modal-mask" v-if="showSaveModal" @click.self="showSaveModal = false">
            <div class="modal-box">
                <h3>💾 保存游戏</h3>
                <div class="form-row">
                    <label>游戏名称 <em>*</em></label>
                    <input v-model="saveForm.name" placeholder="请输入游戏名称" maxlength="50" />
                </div>
                <div class="form-row">
                    <label>游戏介绍</label>
                    <textarea v-model="saveForm.description" placeholder="简单介绍一下这个游戏" rows="2" />
                </div>
                <div class="form-row">
                    <label>标签</label>
                    <input v-model="saveForm.tags" placeholder="益智,休闲（逗号分隔）" />
                </div>
                <div class="form-row">
                    <label>作者</label>
                    <input v-model="saveForm.author" placeholder="作者名称" />
                </div>
                <div class="modal-actions">
                    <button class="btn-cancel" @click="showSaveModal = false">取消</button>
                    <button class="btn-confirm" @click="confirmSave" :disabled="!saveForm.name.trim()">
                        确认保存
                    </button>
                </div>
            </div>
        </div>

        <!-- ★ 资源管理器浮层 ─────────────────────────────────────────
             编辑器里的本地草稿没有服务端 gameId，因此传 :game-id="null"。
             资源管理器只显示全部公共资源（s_g_assets.game_id IS NULL）。
             点击「插入」后，代码片段会插入到 CodeMirror 光标位置。
        ──────────────────────────────────────────────────────────── -->
        <AssetManager v-model:open="assetOpen" :game-id="null" @insert="onAssetInsert" />

    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLocalGamesStore } from '@/stores/localGames'
import { useCodeMirror, type EditorTheme, type EditorLang } from '@/composables/useCodeMirror'
// ★ 新增导入
import AssetManager from '@/components/AssetManager.vue'
import type { Asset } from '@/api/assets'

const store = useLocalGamesStore()
const route = useRoute()

// ── CodeMirror 解构 ───────────────────────────────────────────────
const currentTheme = ref<EditorTheme>('dark')
const currentLang = ref<EditorLang>('html')

const {
    container: editorContainer,
    canUndo,
    canRedo,
    setValue,
    getValue,
    setTheme,
    setLang,
    doUndo,
    doRedo,
} = useCodeMirror({
    initialValue: '',
    theme: currentTheme.value,
    lang: currentLang.value,
    onChange(val) {
        code.value = val
        saved.value = false
        schedulePreview(val)
        scheduleDraft(val)
    },
})

// ── 编辑器状态 ────────────────────────────────────────────────────
const code = ref('')
const previewCode = ref('')
const previewRef = ref<HTMLIFrameElement>()
const editingId = ref<string | undefined>()
const layout = ref<'split' | 'editor' | 'preview'>('split')
const saved = ref(false)

const hasCode = computed(() => code.value.trim().length > 0)
const codeLength = computed(() => code.value.length)
const lineCount = computed(() => (code.value.match(/\n/g) || []).length + 1)

const statusText = computed(() => saved.value ? '✅ 已保存' : hasCode.value ? '● 未保存' : '空')
const statusClass = computed(() => saved.value ? 'status-saved' : hasCode.value ? 'status-dirty' : '')

const layouts = [
    { value: 'split', label: '⬛⬛ 分栏' },
    { value: 'editor', label: '⬛ 仅编辑' },
    { value: 'preview', label: '👁 仅预览' },
] as const

// ── 防抖预览 ──────────────────────────────────────────────────────
let previewTimer: ReturnType<typeof setTimeout>
function schedulePreview(val: string) {
    clearTimeout(previewTimer)
    previewTimer = setTimeout(() => { previewCode.value = val }, 600)
}

// ── 编辑器暂存 ────────────────────────────────────────────────────
const DRAFT_KEY = 'sakura_editor_draft'
const draftTime = ref('')
const showDraftTip = ref(false)

function saveDraft(val: string) {
    if (!val.trim()) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
        code: val,
        savedAt: new Date().toISOString(),
        editingId: editingId.value ?? '',
    }))
    draftTime.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function loadDraft(): { code: string; savedAt: string; editingId: string } | null {
    try {
        const raw = localStorage.getItem(DRAFT_KEY)
        return raw ? JSON.parse(raw) : null
    } catch { return null }
}

function restoreDraft() {
    const draft = loadDraft()
    if (!draft) return
    setValue(draft.code)
    previewCode.value = draft.code
    if (draft.editingId) editingId.value = draft.editingId
    showDraftTip.value = false
    draftTime.value = new Date(draft.savedAt)
        .toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function discardDraft() {
    localStorage.removeItem(DRAFT_KEY)
    showDraftTip.value = false
}

let draftTimer: ReturnType<typeof setTimeout>
function scheduleDraft(val: string) {
    clearTimeout(draftTimer)
    draftTimer = setTimeout(() => saveDraft(val), 3000)
}

// ── 主题 / 语言切换 ───────────────────────────────────────────────
function toggleTheme() {
    currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
    setTheme(currentTheme.value)
}
function onLangChange() {
    setLang(currentLang.value)
}

// ── 刷新 / 全屏预览 ───────────────────────────────────────────────
function refreshPreview() { previewCode.value = code.value }
function openFullPreview() {
    const w = window.open('', '_blank')
    if (w) { w.document.write(code.value); w.document.close() }
}

// ── 清空 ──────────────────────────────────────────────────────────
function clearCode() {
    if (hasCode.value && !confirm('确认清空代码？')) return
    setValue('')
    code.value = ''
    previewCode.value = ''
    editingId.value = undefined
    saved.value = false
    localStorage.removeItem(DRAFT_KEY)
    draftTime.value = ''
}

// ── 拖拽分隔线 ────────────────────────────────────────────────────
function startResize(e: MouseEvent) {
    e.preventDefault()
    const body = document.querySelector('.editor-body') as HTMLElement
    const leftPane = document.querySelector('.editor-pane') as HTMLElement
    if (!body || !leftPane) return
    const startX = e.clientX
    const startWidth = leftPane.offsetWidth
    function onMove(e: MouseEvent) {
        const pct = ((startWidth + e.clientX - startX) / body.offsetWidth) * 100
        if (pct > 20 && pct < 80) {
            leftPane.style.flex = 'none'
            leftPane.style.width = `${pct}%`
        }
    }
    function onUp() {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
}

// ── 模板 ──────────────────────────────────────────────────────────
const templates = [
    {
        name: '空白 HTML',
        code: `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>我的游戏</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1a1a2e; color: #fff;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 100vh; font-family: sans-serif;
  }
</style>
</head>
<body>
  <h1>🎮 我的游戏</h1>
  <script>
    // 在这里写游戏逻辑
  <\/script>
</body>
</html>`,
    },
    {
        name: 'Canvas 模板',
        code: `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>Canvas 游戏</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #111; display: flex; align-items: center; justify-content: center; height: 100vh; }
  canvas { border: 2px solid #4af476; border-radius: 8px; }
</style>
</head>
<body>
<canvas id="c" width="480" height="480"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  function draw() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 在这里绘制游戏画面
  }
  function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop);
  }
  gameLoop();
<\/script>
</body>
</html>`,
    },
]

function applyTemplate(tpl: { name: string; code: string }) {
    if (hasCode.value && !confirm(`应用模板"${tpl.name}"将覆盖当前代码，确认？`)) return
    setValue(tpl.code)
    previewCode.value = tpl.code
    saved.value = false
}

// ── 保存弹窗 ──────────────────────────────────────────────────────
const showSaveModal = ref(false)
const saveForm = ref({ name: '', description: '', tags: '', author: '' })

function openSaveModal() {
    if (editingId.value) {
        const g = store.getById(editingId.value)
        if (g) saveForm.value = { name: g.name, description: g.description, tags: g.tags, author: g.author }
    }
    showSaveModal.value = true
}

function confirmSave() {
    store.save({
        id: editingId.value,
        name: saveForm.value.name,
        description: saveForm.value.description,
        tags: saveForm.value.tags,
        author: saveForm.value.author,
        code: getValue(),
    })
    if (!editingId.value) editingId.value = store.list[0]?.id
    saved.value = true
    showSaveModal.value = false
    localStorage.removeItem(DRAFT_KEY)
    draftTime.value = ''
}

// ── Ctrl+S 快捷键 ─────────────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (hasCode.value) openSaveModal()
    }
}

// ── 生命周期 ──────────────────────────────────────────────────────
onMounted(() => {
    document.addEventListener('keydown', onKeydown)

    if (route.query.id) {
        const g = store.getById(route.query.id as string)
        if (g) {
            setValue(g.code)
            previewCode.value = g.code
            editingId.value = g.id
            return
        }
    }

    const draft = loadDraft()
    if (draft?.code?.trim()) {
        showDraftTip.value = true
    }
})

onUnmounted(() => {
    document.removeEventListener('keydown', onKeydown)
    clearTimeout(previewTimer)
    clearTimeout(draftTimer)
})

// ══════════════════════════════════════════════════════════════════
// ★ 资源管理器
// ──────────────────────────────────────────────────────────────────
// 编辑器处于本地草稿模式，没有服务端 gameId，固定传 null，
// 资源管理器将展示全部公共资源（s_g_assets.game_id IS NULL）。
//
// 插入策略（三级降级）：
//   Level 1 — useCodeMirror 若额外暴露了 editorView ref，直接 dispatch
//   Level 2 — 通过 DOM 找 .cm-editor 上 CodeMirror 挂载的私有属性拿实例
//   Level 3 — 兜底：getValue() + 字符串拼接 + setValue()，追加到末尾
// ══════════════════════════════════════════════════════════════════

const assetOpen = ref(false)

function onAssetInsert({ snippet }: { snippet: string; asset: Asset }) {
    // ── Level 1：composable 若暴露了 EditorView 实例直接用 ────────
    // （若 useCodeMirror 未导出 editorView，此处 ts-ignore 跳过）
    // @ts-ignore
    const exposedView = typeof editorView !== 'undefined' ? editorView?.value : null

    // ── Level 2：从 DOM 上读取 CodeMirror 挂载的实例 ─────────────
    const cmEl = (editorContainer.value as HTMLElement | null)
        ?.querySelector('.cm-editor') as HTMLElement | null
    // CodeMirror 6 将 EditorView 实例挂载在 DOM 的 `cmView` 属性上
    // @ts-ignore
    const domView = cmEl?.cmView ?? null

    const view = exposedView ?? domView

    if (view && typeof view.dispatch === 'function') {
        // 有实例：精确插入到当前选区/光标位置
        const { from, to } = view.state.selection.main
        view.dispatch({
            changes: { from, to, insert: snippet },
            selection: { anchor: from + snippet.length },
        })
        view.focus()
    } else {
        // Level 3 兜底：追加到代码末尾
        const current = getValue()
        setValue(current + (current.endsWith('\n') ? '' : '\n') + snippet)
    }

    // 触发预览刷新 & 标记未保存
    schedulePreview(getValue())
    saved.value = false
}
</script>

<style scoped>
.editor-view {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 80px);
    background: #0f0f1a;
}

/* ── 草稿提示条 ───────────────────────────────────────────────── */
.draft-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    flex-shrink: 0;
    background: #1e1e08;
    border-bottom: 1px solid #4a4a00;
    font-size: 0.82rem;
    color: #d4b84a;
    animation: slideDown 0.25s ease;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.draft-banner-actions {
    display: flex;
    gap: 8px;
}

.draft-btn-restore {
    padding: 4px 14px;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    background: #4a4a00;
    color: #d4b84a;
    border: 1px solid #6a6a00;
    cursor: pointer;
    transition: all 0.2s;
}

.draft-btn-restore:hover {
    background: #6a6a00;
}

.draft-btn-discard {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.78rem;
    background: transparent;
    color: #888;
    border: 1px solid #333;
    cursor: pointer;
    transition: all 0.2s;
}

.draft-btn-discard:hover {
    color: #e05a5a;
    border-color: #e05a5a;
}

/* ── 顶栏 ─────────────────────────────────────────────────────── */
.editor-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #16162a;
    border-bottom: 1px solid #2a2a44;
    flex-shrink: 0;
    gap: 10px;
    flex-wrap: wrap;
}

.editor-topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.editor-topbar-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}

.editor-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #fff;
}

.editor-status {
    font-size: 0.72rem;
    padding: 2px 8px;
    border-radius: 20px;
    background: #2a2a44;
    color: #aaa;
}

.status-saved {
    color: #4af476;
}

.status-dirty {
    color: #ffa06a;
}

.draft-time {
    font-size: 0.7rem;
    color: #666;
    padding: 2px 8px;
    border-radius: 20px;
    background: #1a1a2e;
}

.topbar-divider {
    width: 1px;
    height: 20px;
    background: #2a2a44;
    margin: 0 2px;
}

.btn-icon-text {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 11px;
    border-radius: 7px;
    background: #1e1e34;
    color: #aaa;
    font-size: 0.8rem;
    border: 1px solid #2a2a44;
    transition: all 0.2s;
    cursor: pointer;
}

.btn-icon-text:hover:not(:disabled) {
    background: #2a2a44;
    color: #fff;
}

.btn-icon-text:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

/* ★ 资源管理器按钮——桜色区别于普通操作按钮 */
.btn-asset {
    color: var(--sakura-300, #f9b8cc) !important;
    border-color: #3d2535 !important;
    background: #1e1228 !important;
}

.btn-asset:hover:not(:disabled) {
    background: #2a1a38 !important;
    color: var(--sakura-200, #fcd5e4) !important;
    border-color: var(--sakura-500, #e87da0) !important;
}

.sel-lang {
    padding: 5px 10px;
    border-radius: 7px;
    background: #1e1e34;
    color: #aaa;
    font-size: 0.8rem;
    border: 1px solid #2a2a44;
    outline: none;
    cursor: pointer;
    transition: all 0.2s;
}

.sel-lang:hover {
    border-color: #4a4a66;
    color: #fff;
}

.btn-save {
    padding: 6px 16px;
    border-radius: 7px;
    background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
    color: #fff;
    font-size: 0.82rem;
    font-weight: 700;
    transition: all 0.2s;
    cursor: pointer;
    border: none;
}

.btn-save:hover:not(:disabled) {
    opacity: 0.88;
    transform: scale(1.02);
}

.btn-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* ── 主体 ─────────────────────────────────────────────────────── */
.editor-body {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
}

.editor-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    border-right: 1px solid #2a2a44;
}

.pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 12px;
    background: #1a1a2e;
    border-bottom: 1px solid #2a2a44;
    font-size: 0.75rem;
    color: #888;
    flex-shrink: 0;
}

.pane-title {
    font-weight: 600;
    color: #bbb;
}

.code-len {
    color: #555;
}

.cm-wrap {
    flex: 1;
    overflow: hidden;
    min-height: 0;
}

.cm-wrap :deep(.cm-editor) {
    height: 100%;
    font-size: 13px;
}

.cm-wrap :deep(.cm-scroller) {
    overflow: auto;
    font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace !important;
}

.cm-wrap :deep(.cm-focused) {
    outline: none;
}

.resize-handle {
    width: 4px;
    background: #2a2a44;
    cursor: col-resize;
    flex-shrink: 0;
    transition: background 0.2s;
}

.resize-handle:hover {
    background: var(--sakura-500);
}

.preview-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.preview-actions {
    display: flex;
    gap: 6px;
}

.btn-sm {
    padding: 3px 10px;
    border-radius: 6px;
    background: #1e1e34;
    color: #aaa;
    font-size: 0.72rem;
    border: 1px solid #2a2a44;
    transition: all 0.2s;
    cursor: pointer;
}

.btn-sm:hover {
    background: #2a2a44;
    color: #fff;
}

.preview-wrap {
    flex: 1;
    position: relative;
    background: #fff;
}

.preview-iframe {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
    background: #fff;
}

.preview-empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #ccc;
    pointer-events: none;
    font-size: 2.5rem;
}

.preview-empty p {
    font-size: 0.85rem;
    color: #aaa;
}

/* ── 底部工具栏 ───────────────────────────────────────────────── */
.editor-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 7px 14px;
    background: #16162a;
    border-top: 1px solid #2a2a44;
    flex-shrink: 0;
}

.toolbar-group {
    display: flex;
    align-items: center;
    gap: 5px;
}

.toolbar-label {
    font-size: 0.72rem;
    color: #666;
}

.btn-layout,
.btn-tpl {
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 0.72rem;
    background: #1e1e34;
    color: #888;
    border: 1px solid #2a2a44;
    transition: all 0.15s;
    cursor: pointer;
}

.btn-layout:hover,
.btn-tpl:hover {
    color: #fff;
    border-color: #4a4a66;
}

.btn-layout.active {
    background: var(--sakura-600);
    color: #fff;
    border-color: var(--sakura-500);
}

.toolbar-shortcuts {
    margin-left: auto;
}

.shortcut {
    font-size: 0.7rem;
    color: #555;
    margin-left: 8px;
}

kbd {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 4px;
    background: #1e1e34;
    border: 1px solid #3a3a55;
    color: #888;
    font-size: 0.68rem;
    font-family: inherit;
}

/* ── 保存弹窗 ─────────────────────────────────────────────────── */
.modal-mask {
    position: fixed;
    inset: 0;
    background: #0008;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
}

.modal-box {
    background: #1a1a2e;
    border: 1px solid #2a2a44;
    border-radius: 14px;
    padding: 28px;
    width: min(480px, 92vw);
    box-shadow: 0 20px 60px #000a;
}

.modal-box h3 {
    color: #fff;
    margin-bottom: 20px;
    font-size: 1.05rem;
}

.form-row {
    margin-bottom: 14px;
}

.form-row label {
    display: block;
    font-size: 0.78rem;
    color: #888;
    margin-bottom: 5px;
}

.form-row label em {
    color: var(--sakura-400);
    font-style: normal;
}

.form-row input,
.form-row textarea {
    width: 100%;
    padding: 8px 12px;
    background: #0f0f1e;
    border: 1px solid #2a2a44;
    border-radius: 8px;
    color: #e0e0ff;
    font-size: 0.86rem;
    outline: none;
    font-family: var(--font-body);
    transition: border-color 0.2s;
}

.form-row input:focus,
.form-row textarea:focus {
    border-color: var(--sakura-500);
}

.form-row textarea {
    resize: vertical;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}

.btn-cancel {
    padding: 8px 20px;
    border-radius: 8px;
    background: #1e1e34;
    color: #888;
    border: 1px solid #2a2a44;
    font-size: 0.86rem;
    cursor: pointer;
}

.btn-cancel:hover {
    color: #fff;
}

.btn-confirm {
    padding: 8px 24px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
    color: #fff;
    font-weight: 700;
    font-size: 0.86rem;
    cursor: pointer;
    border: none;
}

.btn-confirm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

@media (max-width: 640px) {
    .editor-topbar-right {
        display: none;
    }

    .toolbar-shortcuts {
        display: none;
    }
}
</style>