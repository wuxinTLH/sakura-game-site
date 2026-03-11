<template>
    <div class="editor-view">
        <!-- 顶栏 -->
        <div class="editor-topbar">
            <div class="editor-topbar-left">
                <h2 class="editor-title">✏️ 游戏编辑器</h2>
                <span class="editor-status" :class="statusClass">{{ statusText }}</span>
            </div>
            <div class="editor-topbar-right">
                <button class="btn-icon-text" @click="formatCode" title="格式化">
                    <span>⌥</span> 格式化
                </button>
                <button class="btn-icon-text" @click="clearCode" title="清空">
                    <span>🗑</span> 清空
                </button>
                <button class="btn-save" @click="openSaveModal" :disabled="!code.trim()">
                    💾 保存到本地
                </button>
            </div>
        </div>

        <!-- 主体：编辑器 + 预览 -->
        <div class="editor-body" :class="{ 'preview-only': layout === 'preview' }">

            <!-- 左：代码编辑区 -->
            <div class="editor-pane" v-show="layout !== 'preview'">
                <div class="pane-header">
                    <span class="pane-title">📝 代码</span>
                    <span class="code-len">{{ code.length }} 字符</span>
                </div>
                <div class="editor-wrap">
                    <div class="line-numbers" ref="lineNumRef">
                        <div v-for="n in lineCount" :key="n">{{ n }}</div>
                    </div>
                    <textarea ref="textareaRef" v-model="code" class="code-textarea" spellcheck="false"
                        placeholder="在此输入游戏 HTML 代码..." @scroll="syncScroll" @keydown.tab.prevent="insertTab" />
                </div>
            </div>

            <!-- 分隔线（可拖拽） -->
            <div class="resize-handle" v-show="layout === 'split'" @mousedown="startResize"></div>

            <!-- 右：实时预览区 -->
            <div class="preview-pane" v-show="layout !== 'editor'">
                <div class="pane-header">
                    <span class="pane-title">👁 预览</span>
                    <div class="preview-actions">
                        <button class="btn-sm" @click="refreshPreview">↺ 刷新</button>
                        <button class="btn-sm" @click="openFullPreview">⛶ 全屏</button>
                    </div>
                </div>
                <div class="preview-wrap">
                    <iframe ref="previewRef" class="preview-iframe" sandbox="allow-scripts allow-same-origin"
                        :srcdoc="previewCode" frameborder="0" style="background:#fff" />
                    <div class="preview-empty" v-if="!code.trim()">
                        <span>🎮</span>
                        <p>在左侧输入代码后自动预览</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 布局切换 + 模板 -->
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
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLocalGamesStore } from '@/stores/localGames'

const store = useLocalGamesStore()
const route = useRoute()
const router = useRouter()

// ── 编辑器状态 ────────────────────────────────────────────────────────
const code = ref('')
const previewCode = ref('')
const textareaRef = ref<HTMLTextAreaElement>()
const previewRef = ref<HTMLIFrameElement>()
const lineNumRef = ref<HTMLDivElement>()
const editingId = ref<string | undefined>()
const layout = ref<'split' | 'editor' | 'preview'>('split')

const layouts = [
    { value: 'split', label: '⬛⬛ 分栏' },
    { value: 'editor', label: '⬛ 仅编辑' },
    { value: 'preview', label: '👁 仅预览' },
] as const

// ── 代码行数 ──────────────────────────────────────────────────────────
const lineCount = computed(() => (code.value.match(/\n/g) || []).length + 1)

// ── 状态提示 ──────────────────────────────────────────────────────────
const saved = ref(false)
const statusText = computed(() => saved.value ? '✅ 已保存' : code.value ? '● 未保存' : '空')
const statusClass = computed(() => saved.value ? 'status-saved' : code.value ? 'status-dirty' : '')

// ── 防抖实时预览 ──────────────────────────────────────────────────────
let previewTimer: ReturnType<typeof setTimeout>
watch(code, val => {
    saved.value = false
    clearTimeout(previewTimer)
    previewTimer = setTimeout(() => { previewCode.value = val }, 600)
})

// ── 若从本地游戏页跳转过来，载入对应代码 ────────────────────────────
if (route.query.id) {
    const g = store.getById(route.query.id as string)
    if (g) {
        code.value = g.code
        editingId.value = g.id
        previewCode.value = g.code
    }
}

// ── Tab 插入 ──────────────────────────────────────────────────────────
function insertTab(e: KeyboardEvent) {
    const el = e.target as HTMLTextAreaElement
    const s = el.selectionStart
    const end = el.selectionEnd
    code.value = code.value.substring(0, s) + '  ' + code.value.substring(end)
    nextTick(() => { el.selectionStart = el.selectionEnd = s + 2 })
}

// ── 滚动同步行号 ──────────────────────────────────────────────────────
function syncScroll() {
    if (lineNumRef.value && textareaRef.value) {
        lineNumRef.value.scrollTop = textareaRef.value.scrollTop
    }
}

// ── 刷新预览 ─────────────────────────────────────────────────────────
function refreshPreview() { previewCode.value = code.value }

// ── 全屏预览 ─────────────────────────────────────────────────────────
function openFullPreview() {
    const w = window.open('', '_blank')
    if (w) { w.document.write(code.value); w.document.close() }
}

// ── 清空 ─────────────────────────────────────────────────────────────
function clearCode() {
    if (code.value && !confirm('确认清空代码？')) return
    code.value = ''
    previewCode.value = ''
    editingId.value = undefined
}

// ── 格式化（简单缩进修正） ────────────────────────────────────────────
function formatCode() {
    // 基础美化：统一换行
    code.value = code.value.replace(/>\s*</g, '>\n<').trim()
}

// ── 拖拽分隔线调整宽度 ────────────────────────────────────────────
function startResize(e: MouseEvent) {
    e.preventDefault()
    const body = document.querySelector('.editor-body') as HTMLElement
    const leftPane = document.querySelector('.editor-pane') as HTMLElement
    if (!body || !leftPane) return

    const startX = e.clientX
    const startWidth = leftPane.offsetWidth

    function onMove(e: MouseEvent) {
        const newWidth = startWidth + (e.clientX - startX)
        const totalWidth = body.offsetWidth
        const percent = (newWidth / totalWidth) * 100
        if (percent > 20 && percent < 80) {
            leftPane.style.flex = 'none'
            leftPane.style.width = `${percent}%`
        }
    }

    function onUp() {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
}

// ── 模板 ─────────────────────────────────────────────────────────────
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
    background: #1a1a2e;
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    font-family: sans-serif;
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
    if (code.value && !confirm(`应用模板"${tpl.name}"将覆盖当前代码，确认？`)) return
    code.value = tpl.code
    previewCode.value = tpl.code
}

// ── 保存弹窗 ─────────────────────────────────────────────────────────
const showSaveModal = ref(false)
const saveForm = ref({ name: '', description: '', tags: '', author: '' })

function openSaveModal() {
    if (editingId.value) {
        const g = store.getById(editingId.value)
        if (g) {
            saveForm.value = { name: g.name, description: g.description, tags: g.tags, author: g.author }
        }
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
        code: code.value,
    })
    if (!editingId.value) {
        editingId.value = store.list[0]?.id
    }
    saved.value = true
    showSaveModal.value = false
}
</script>

<style scoped>
.editor-view {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 80px);
    background: #f5f5f5;
    color: #e0e0e0;
}

/* 顶栏 */
.editor-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: #16162a;
    border-bottom: 1px solid #2a2a44;
    flex-shrink: 0;
    gap: 12px;
    flex-wrap: wrap;
}

.editor-topbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.editor-topbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.editor-title {
    font-size: 1rem;
    font-weight: 700;
    color: #fff;
}

.editor-status {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 20px;
    background: #2a2a44;
}

.status-saved {
    color: #4af476;
}

.status-dirty {
    color: #ffa06a;
}

.btn-icon-text {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 8px;
    background: #1e1e34;
    color: #aaa;
    font-size: 0.82rem;
    border: 1px solid #2a2a44;
    transition: all 0.2s;
}

.btn-icon-text:hover {
    background: #2a2a44;
    color: #fff;
}

.btn-save {
    padding: 7px 18px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
    color: #fff;
    font-size: 0.85rem;
    font-weight: 700;
    transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
    opacity: 0.88;
    transform: scale(1.02);
}

.btn-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* 主体 */
.editor-body {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
}

.editor-body.preview-only .preview-pane {
    flex: 1;
}

/* 左：编辑器 */
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
    padding: 6px 14px;
    background: #1a1a2e;
    border-bottom: 1px solid #2a2a44;
    font-size: 0.78rem;
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

.editor-wrap {
    flex: 1;
    display: flex;
    overflow: hidden;
    font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.65;
}

.line-numbers {
    padding: 12px 8px;
    background: #0d0d1e;
    color: #444;
    text-align: right;
    user-select: none;
    overflow: hidden;
    min-width: 42px;
    flex-shrink: 0;
    font-size: 12px;
}

.line-numbers div {
    height: 1.65em;
}

.code-textarea {
    flex: 1;
    padding: 12px;
    background: #0f0f1e;
    color: #e0e0ff;
    border: none;
    outline: none;
    resize: none;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    white-space: pre;
    overflow: auto;
    tab-size: 2;
}

.code-textarea::placeholder {
    color: #333;
}

/* 分隔线 */
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

/* 右：预览 */
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
    font-size: 0.75rem;
    border: 1px solid #2a2a44;
    transition: all 0.2s;
}

.btn-sm:hover {
    background: #2a2a44;
    color: #fff;
}

.preview-wrap {
    flex: 1;
    position: relative;
    background: #ffffff;
}

.preview-iframe {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
    background: #ffffff;
}

.preview-empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #333;
    pointer-events: none;
    font-size: 2.5rem;
}

.preview-empty p {
    font-size: 0.85rem;
    color: #444;
}

/* 底部工具栏 */
.editor-toolbar {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    padding: 8px 16px;
    background: #16162a;
    border-top: 1px solid #2a2a44;
    flex-shrink: 0;
}

.toolbar-group {
    display: flex;
    align-items: center;
    gap: 6px;
}

.toolbar-label {
    font-size: 0.75rem;
    color: #666;
}

.btn-layout,
.btn-tpl {
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 0.75rem;
    background: #1e1e34;
    color: #888;
    border: 1px solid #2a2a44;
    transition: all 0.15s;
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

/* 保存弹窗 */
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
    font-size: 1.1rem;
}

.form-row {
    margin-bottom: 14px;
}

.form-row label {
    display: block;
    font-size: 0.8rem;
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
    font-size: 0.88rem;
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
    font-size: 0.88rem;
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
    font-size: 0.88rem;
}

.btn-confirm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
</style>