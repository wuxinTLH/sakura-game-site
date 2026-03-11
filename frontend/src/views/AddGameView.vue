<template>
    <div class="add-view">
        <!-- Hero -->
        <section class="add-hero">
            <div class="add-hero-inner">
                <h1 class="add-hero-title">
                    <span>📤</span> 上传游戏
                </h1>
                <p class="add-hero-sub">上传 .html / .vue / .ts 文件，自动解析并保存至游戏库</p>
            </div>
        </section>

        <div class="add-content">
            <div class="add-form-wrap">

                <!-- 文件上传区 -->
                <div class="drop-zone" :class="{ dragover: isDragging, 'has-file': !!selectedFile }"
                    @dragover.prevent="isDragging = true" @dragleave="isDragging = false" @drop.prevent="onDrop"
                    @click="fileInputRef?.click()">
                    <input ref="fileInputRef" type="file" accept=".html,.vue,.ts" style="display:none"
                        @change="onFileChange" />

                    <template v-if="!selectedFile">
                        <div class="drop-icon">📂</div>
                        <p class="drop-title">点击或拖拽文件到此处</p>
                        <p class="drop-sub">支持 <code>.html</code> <code>.vue</code> <code>.ts</code>，最大 10MB</p>
                    </template>

                    <template v-else>
                        <div class="file-preview">
                            <span class="file-icon">{{ fileIcon }}</span>
                            <div class="file-info">
                                <span class="file-name">{{ selectedFile.name }}</span>
                                <span class="file-size">{{ formatSize(selectedFile.size) }}</span>
                            </div>
                            <button class="file-remove" @click.stop="removeFile">✕</button>
                        </div>
                        <!-- 代码预览 -->
                        <div class="code-preview" v-if="fileContent">
                            <div class="code-preview-header">
                                <span>预览（前 30 行）</span>
                            </div>
                            <pre class="code-preview-body">{{ previewLines }}</pre>
                        </div>
                    </template>
                </div>

                <!-- 游戏信息表单 -->
                <div class="form-section">
                    <h3 class="form-section-title">游戏信息</h3>

                    <div class="form-row">
                        <label>游戏名称 <em>*</em></label>
                        <input v-model="form.name" placeholder="请输入游戏名称" maxlength="50"
                            :class="{ error: errors.name }" />
                        <span class="field-error" v-if="errors.name">{{ errors.name }}</span>
                    </div>

                    <div class="form-row">
                        <label>游戏介绍</label>
                        <textarea v-model="form.description" placeholder="简单介绍一下这个游戏的玩法" rows="3" />
                    </div>

                    <div class="form-grid">
                        <div class="form-row">
                            <label>标签</label>
                            <input v-model="form.tags" placeholder="益智,休闲（逗号分隔）" />
                        </div>
                        <div class="form-row">
                            <label>作者</label>
                            <input v-model="form.author" placeholder="作者名称" />
                        </div>
                        <div class="form-row">
                            <label>排序权重</label>
                            <input v-model.number="form.sort_order" type="number" placeholder="数字越大越靠前" />
                        </div>
                    </div>

                    <!-- 文件类型说明 -->
                    <div class="file-type-tips">
                        <div class="tip-item">
                            <code>.html</code>
                            <span>完整 HTML 文件，直接运行，推荐格式</span>
                        </div>
                        <div class="tip-item">
                            <code>.vue</code>
                            <span>自动提取 template / script / style 转为 HTML</span>
                        </div>
                        <div class="tip-item">
                            <code>.ts</code>
                            <span>自动移除类型注解，包装为 HTML + Canvas 运行</span>
                        </div>
                    </div>
                </div>

                <!-- 提交 -->
                <div class="form-actions">
                    <button class="btn-cancel" @click="router.back()">取消</button>
                    <button class="btn-submit" :disabled="!selectedFile || !form.name.trim() || uploading"
                        @click="submit">
                        <span v-if="uploading" class="loading-dots">上传中</span>
                        <span v-else>📤 上传游戏</span>
                    </button>
                </div>

                <!-- 结果提示 -->
                <div class="result-bar success" v-if="result === 'success'">
                    ✅ 游戏上传成功！<router-link to="/">返回首页查看</router-link>
                </div>
                <div class="result-bar error" v-if="result === 'error'">
                    ❌ 上传失败：{{ errorMsg }}
                </div>

            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { uploadGame } from '@/api/games'

const router = useRouter()

// ── 文件 ──────────────────────────────────────────────────────────
const fileInputRef = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const fileContent = ref('')
const isDragging = ref(false)

const fileIcon = computed(() => {
    if (!selectedFile.value) return '📄'
    const ext = selectedFile.value.name.split('.').pop()
    return ext === 'html' ? '🌐' : ext === 'vue' ? '💚' : '🔷'
})

const previewLines = computed(() =>
    fileContent.value.split('\n').slice(0, 30).join('\n')
)

function readFile(file: File) {
    selectedFile.value = file
    const reader = new FileReader()
    reader.onload = e => { fileContent.value = e.target?.result as string || '' }
    reader.readAsText(file, 'utf-8')
}

function onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) readFile(file)
}

function onDrop(e: DragEvent) {
    isDragging.value = false
    const file = e.dataTransfer?.files[0]
    if (file) readFile(file)
}

function removeFile() {
    selectedFile.value = null
    fileContent.value = ''
    if (fileInputRef.value) fileInputRef.value.value = ''
}

function formatSize(bytes: number) {
    return bytes < 1024
        ? bytes + ' B'
        : bytes < 1024 * 1024
            ? (bytes / 1024).toFixed(1) + ' KB'
            : (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

// ── 表单 ──────────────────────────────────────────────────────────
const form = ref({ name: '', description: '', tags: '', author: '', sort_order: 0 })
const errors = ref<Record<string, string>>({})

function validate() {
    errors.value = {}
    if (!form.value.name.trim()) errors.value.name = '请填写游戏名称'
    return Object.keys(errors.value).length === 0
}

// ── 上传 ──────────────────────────────────────────────────────────
const uploading = ref(false)
const result = ref<'success' | 'error' | null>(null)
const errorMsg = ref('')

async function submit() {
    if (!validate() || !selectedFile.value) return
    uploading.value = true
    result.value = null

    const fd = new FormData()
    fd.append('file', selectedFile.value)
    fd.append('name', form.value.name)
    fd.append('description', form.value.description)
    fd.append('tags', form.value.tags)
    fd.append('author', form.value.author)
    fd.append('sort_order', String(form.value.sort_order))

    try {
        await uploadGame(fd)
        result.value = 'success'
        // 重置
        removeFile()
        form.value = { name: '', description: '', tags: '', author: '', sort_order: 0 }
    } catch (e: any) {
        result.value = 'error'
        errorMsg.value = e.message
    } finally {
        uploading.value = false
    }
}
</script>

<style scoped>
/* Hero */
.add-hero {
    background: linear-gradient(160deg, var(--sakura-100) 0%, #fff5f8 100%);
    border-bottom: 1px solid var(--border);
    padding: 44px 24px 36px;
}

.add-hero-inner {
    max-width: 720px;
    margin: 0 auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.add-hero-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 4vw, 2.2rem);
    font-weight: 900;
    color: var(--ink-900);
    display: flex;
    align-items: center;
    gap: 10px;
}

.add-hero-sub {
    color: var(--ink-400);
    font-size: 0.9rem;
}

/* Content */
.add-content {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 20px 60px;
}

.add-form-wrap {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

/* 拖拽上传区 */
.drop-zone {
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    padding: 32px;
    text-align: center;
    cursor: pointer;
    background: var(--surface);
    transition: all var(--transition);
    min-height: 140px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.drop-zone:hover,
.drop-zone.dragover {
    border-color: var(--sakura-400);
    background: var(--sakura-100);
}

.drop-zone.has-file {
    border-style: solid;
    border-color: var(--sakura-300);
    background: var(--sakura-100);
    align-items: stretch;
    cursor: default;
}

.drop-icon {
    font-size: 2.5rem;
}

.drop-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--ink-600);
}

.drop-sub {
    font-size: 0.82rem;
    color: var(--ink-400);
}

.drop-sub code {
    background: var(--sakura-100);
    color: var(--sakura-600);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.8rem;
}

/* 文件预览 */
.file-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: var(--surface);
    border-radius: 10px;
    border: 1px solid var(--border);
    cursor: default;
}

.file-icon {
    font-size: 1.8rem;
    flex-shrink: 0;
}

.file-info {
    flex: 1;
    text-align: left;
}

.file-name {
    display: block;
    font-weight: 600;
    color: var(--ink-900);
    font-size: 0.9rem;
}

.file-size {
    font-size: 0.75rem;
    color: var(--ink-400);
}

.file-remove {
    background: none;
    color: var(--ink-200);
    font-size: 0.9rem;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
}

.file-remove:hover {
    background: #ffe0e0;
    color: #e05a5a;
}

/* 代码预览 */
.code-preview {
    margin-top: 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    text-align: left;
}

.code-preview-header {
    padding: 5px 12px;
    background: var(--ink-100);
    font-size: 0.72rem;
    color: var(--ink-400);
}

.code-preview-body {
    padding: 10px 12px;
    margin: 0;
    background: #0f0f1e;
    color: #b0b0d0;
    font-size: 0.75rem;
    line-height: 1.6;
    max-height: 160px;
    overflow: auto;
    font-family: 'Consolas', monospace;
    white-space: pre;
}

/* 表单 */
.form-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
}

.form-section-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--ink-600);
    margin-bottom: 18px;
}

.form-row {
    margin-bottom: 14px;
}

.form-row label {
    display: block;
    font-size: 0.8rem;
    color: var(--ink-400);
    margin-bottom: 5px;
    font-weight: 500;
}

.form-row label em {
    color: var(--sakura-500);
    font-style: normal;
}

.form-row input,
.form-row textarea {
    width: 100%;
    padding: 9px 13px;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 9px;
    color: var(--ink-900);
    font-size: 0.88rem;
    outline: none;
    font-family: var(--font-body);
    transition: border-color 0.2s;
}

.form-row input:focus,
.form-row textarea:focus {
    border-color: var(--sakura-400);
}

.form-row input.error {
    border-color: #e05a5a;
}

.form-row textarea {
    resize: vertical;
}

.field-error {
    font-size: 0.75rem;
    color: #e05a5a;
    margin-top: 3px;
    display: block;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
}

/* 类型说明 */
.file-type-tips {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin-top: 16px;
    padding: 14px;
    background: var(--sakura-100);
    border-radius: 10px;
}

.tip-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.8rem;
}

.tip-item code {
    padding: 2px 8px;
    border-radius: 5px;
    font-size: 0.75rem;
    background: var(--surface);
    color: var(--sakura-600);
    border: 1px solid var(--sakura-200);
    flex-shrink: 0;
    min-width: 48px;
    text-align: center;
}

.tip-item span {
    color: var(--ink-400);
}

/* 操作按钮 */
.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.btn-cancel {
    padding: 10px 24px;
    border-radius: 10px;
    background: var(--ink-100);
    color: var(--ink-600);
    border: 1.5px solid var(--border);
    font-size: 0.9rem;
    transition: all 0.2s;
}

.btn-cancel:hover {
    border-color: var(--sakura-300);
    color: var(--sakura-500);
}

.btn-submit {
    padding: 10px 32px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
    color: #fff;
    font-weight: 700;
    font-size: 0.9rem;
    transition: all 0.2s;
}

.btn-submit:hover:not(:disabled) {
    opacity: 0.9;
    transform: scale(1.02);
}

.btn-submit:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* 结果提示 */
.result-bar {
    padding: 12px 18px;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 500;
}

.result-bar.success {
    background: #e8fdf0;
    color: #2e7d4f;
    border: 1px solid #b2dfcc;
}

.result-bar.success a {
    color: var(--sakura-600);
    text-decoration: underline;
    margin-left: 8px;
}

.result-bar.error {
    background: #fff0f0;
    color: #c0392b;
    border: 1px solid #f5c6cb;
}

.loading-dots::after {
    content: '...';
    animation: dots 1.2s steps(4, end) infinite;
}

@keyframes dots {

    0%,
    20% {
        content: '.';
    }

    40% {
        content: '..';
    }

    60%,
    100% {
        content: '...';
    }
}

@media (max-width: 560px) {
    .form-grid {
        grid-template-columns: 1fr;
    }

    .drop-zone {
        padding: 20px;
    }
}
</style>