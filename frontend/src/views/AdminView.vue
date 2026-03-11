<template>
    <div class="admin-view">
        <!-- ── 未登录：登录面板 ─────────────────────────────────────── -->
        <div class="login-wrap" v-if="!store.isLoggedIn">
            <div class="login-card">
                <div class="login-icon">🔐</div>
                <h2 class="login-title">管理员登录</h2>
                <p class="login-sub">输入管理员密码以访问后台</p>

                <div class="form-row">
                    <input v-model="password" :type="showPwd ? 'text' : 'password'" class="pwd-input"
                        placeholder="请输入管理员密码" @keydown.enter="doLogin" :class="{ error: loginError }" />
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

        <!-- ── 已登录：管理面板 ─────────────────────────────────────── -->
        <template v-else>
            <section class="admin-hero">
                <div class="admin-hero-inner">
                    <h1 class="admin-hero-title">
                        <span>⚙️</span> 站点管理
                    </h1>
                    <p class="admin-hero-sub">控制前端功能模块的开关状态</p>
                    <button class="btn-logout" @click="doLogout">退出登录</button>
                </div>
            </section>

            <div class="admin-content">

                <!-- 权限开关卡片 -->
                <div class="settings-card">
                    <h3 class="card-title">🎛 功能开关</h3>
                    <p class="card-desc">关闭后对应页面将对所有用户不可访问，导航栏入口也会隐藏。</p>

                    <div class="switch-list">

                        <!-- 编辑器开关 -->
                        <div class="switch-item">
                            <div class="switch-info">
                                <span class="switch-icon">✏️</span>
                                <div>
                                    <div class="switch-name">游戏编辑器</div>
                                    <div class="switch-desc">允许用户在本地编写并预览游戏代码</div>
                                </div>
                            </div>
                            <div class="switch-control">
                                <span class="switch-status" :class="local.editor_enabled ? 'on' : 'off'">
                                    {{ local.editor_enabled ? '开启' : '关闭' }}
                                </span>
                                <button class="toggle-btn" :class="{ active: local.editor_enabled }"
                                    @click="local.editor_enabled = !local.editor_enabled">
                                    <span class="toggle-thumb"></span>
                                </button>
                            </div>
                        </div>

                        <!-- 上传开关 -->
                        <div class="switch-item">
                            <div class="switch-info">
                                <span class="switch-icon">📤</span>
                                <div>
                                    <div class="switch-name">游戏上传</div>
                                    <div class="switch-desc">允许用户上传 .html / .vue / .ts 文件入库</div>
                                </div>
                            </div>
                            <div class="switch-control">
                                <span class="switch-status" :class="local.upload_enabled ? 'on' : 'off'">
                                    {{ local.upload_enabled ? '开启' : '关闭' }}
                                </span>
                                <button class="toggle-btn" :class="{ active: local.upload_enabled }"
                                    @click="local.upload_enabled = !local.upload_enabled">
                                    <span class="toggle-thumb"></span>
                                </button>
                            </div>
                        </div>

                    </div>

                    <!-- 保存按钮 -->
                    <div class="card-footer">
                        <span class="unsaved-tip" v-if="isDirty">● 有未保存的更改</span>
                        <button class="btn-save" :disabled="!isDirty || store.loading" @click="saveSettings">
                            <span v-if="store.loading">保存中…</span>
                            <span v-else>💾 保存设置</span>
                        </button>
                    </div>

                    <!-- 保存结果 -->
                    <div class="save-result success" v-if="saveResult === 'success'">✅ 设置已保存</div>
                    <div class="save-result error" v-if="saveResult === 'error'">❌ 保存失败：{{ saveError }}</div>
                </div>

                <!-- 当前状态预览 -->
                <div class="status-card">
                    <h3 class="card-title">📊 当前状态</h3>
                    <div class="status-grid">
                        <div class="status-item" :class="store.settings.editor_enabled ? 'enabled' : 'disabled'">
                            <span>✏️ 编辑器</span>
                            <span class="status-badge">{{ store.settings.editor_enabled ? '✅ 运行中' : '🔴 已关闭' }}</span>
                        </div>
                        <div class="status-item" :class="store.settings.upload_enabled ? 'enabled' : 'disabled'">
                            <span>📤 上传</span>
                            <span class="status-badge">{{ store.settings.upload_enabled ? '✅ 运行中' : '🔴 已关闭' }}</span>
                        </div>
                    </div>
                </div>

            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useAdminStore } from '@/stores/admin'

const store = useAdminStore()

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

// ── 设置 ──────────────────────────────────────────────────────────
const local = reactive({
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

const saveResult = ref<'success' | 'error' | null>(null)
const saveError = ref('')

async function saveSettings() {
    saveResult.value = null
    try {
        await store.saveSettings({ ...local })
        saveResult.value = 'success'
        setTimeout(() => { saveResult.value = null }, 3000)
    } catch (e: any) {
        saveResult.value = 'error'
        saveError.value = e.message
    }
}
</script>

<style scoped>
/* ── 登录 ─────────────────────────────────────────────────────────── */
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
}

.btn-login:hover:not(:disabled) {
    opacity: 0.88;
    transform: scale(1.01);
}

.btn-login:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* ── Hero ─────────────────────────────────────────────────────────── */
.admin-hero {
    background: linear-gradient(160deg, #1a1a2e 0%, #16213e 100%);
    border-bottom: 1px solid #2a2a44;
    padding: 44px 24px 36px;
}

.admin-hero-inner {
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
}

.admin-hero-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 4vw, 2.2rem);
    font-weight: 900;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
}

.admin-hero-sub {
    color: #888;
    font-size: 0.9rem;
}

.btn-logout {
    margin-top: 6px;
    padding: 8px 22px;
    border-radius: 20px;
    border: 1.5px solid #3a3a5a;
    color: #aaa;
    font-size: 0.85rem;
    font-weight: 500;
    background: transparent;
    transition: all 0.2s;
}

.btn-logout:hover {
    border-color: #e05a5a;
    color: #e05a5a;
}

/* ── Content ──────────────────────────────────────────────────────── */
.admin-content {
    max-width: 760px;
    margin: 0 auto;
    padding: 28px 20px 60px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* 卡片 */
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

/* 开关列表 */
.switch-list {
    display: flex;
    flex-direction: column;
    gap: 0;
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

/* Toggle 按钮 */
.toggle-btn {
    width: 52px;
    height: 28px;
    border-radius: 14px;
    background: #e0e0e0;
    position: relative;
    transition: background 0.25s;
    flex-shrink: 0;
    border: none;
    cursor: pointer;
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

/* 卡片底部 */
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
}

.btn-save:hover:not(:disabled) {
    opacity: 0.88;
    transform: scale(1.02);
}

.btn-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* 保存结果 */
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

/* 状态卡片 */
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

@media (max-width: 480px) {
    .status-grid {
        grid-template-columns: 1fr;
    }

    .login-card {
        padding: 28px 20px;
    }
}
</style>