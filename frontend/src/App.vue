<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="header-inner">
        <router-link to="/" class="logo">
          <span class="logo-icon">🌸</span>
          <span class="logo-text">
            <span class="logo-main">桜游戏屋</span>
            <span class="logo-sub">SAKURA GAMES</span>
          </span>
        </router-link>
        <nav class="header-nav">
          <router-link to="/" class="nav-link" active-class="active">
            全部游戏
          </router-link>
          <router-link to="/local" class="nav-link" active-class="active">
            💾 本地游戏
          </router-link>
          <router-link v-if="adminStore.settings.upload_enabled" to="/add" class="nav-link" active-class="active">
            📤 上传游戏
          </router-link>
          <router-link v-if="adminStore.settings.editor_enabled" to="/editor" class="nav-link nav-link-editor"
            active-class="active">
            ✏️ 编辑器
          </router-link>
          <router-link to="/admin" class="nav-link nav-link-admin" active-class="active">
            ⚙️
          </router-link>
          <!-- 存储管理入口 -->
          <button class="nav-link nav-link-storage" :class="{ badge: storageWarning }" @click="openStorage"
            title="本地存储管理">
            🗄️
            <span v-if="storageWarning" class="storage-badge" />
          </button>
        </nav>
      </div>
      <div class="header-petal-strip" aria-hidden="true">
        <span v-for="i in 12" :key="i">🌸</span>
      </div>
    </header>

    <main class="site-main">
      <ErrorBoundary>
        <router-view />
      </ErrorBoundary>
    </main>

    <footer class="site-footer">
      <p>🌸 桜游戏屋 &nbsp;·&nbsp; 用爱制作的小游戏合集</p>
      <p class="footer-powered">
        Powered by <span class="powered-name">SakuraMikku</span>
        &nbsp;·&nbsp;
        <a href="https://github.com/wuxinTLH" target="_blank" rel="noopener noreferrer" class="footer-github">
          <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482
          0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463
          -.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832
          .092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683
          -.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59
          0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699
          1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336
          -.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
          GitHub
        </a>
      </p>
      <!-- 底部存储信息 -->
      <p class="footer-storage" @click="openStorage">
        🗄️ 本地存储 {{ storageInfo.usedKB }} KB
        <span class="footer-storage-bar">
          <span class="footer-storage-fill" :style="{ width: storagePercent + '%' }" />
        </span>
      </p>
    </footer>

    <!-- 全局 UI 层 -->
    <ToastContainer />
    <ConfirmDialog />

    <!-- 存储管理面板 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="storageOpen" class="storage-overlay" @click.self="storageOpen = false">
          <div class="storage-panel">
            <!-- 标题栏 -->
            <div class="sp-header">
              <span class="sp-title">🗄️ 本地存储管理</span>
              <button class="sp-close" @click="storageOpen = false">✕</button>
            </div>

            <!-- 总览 -->
            <div class="sp-overview">
              <div class="sp-stat">
                <span class="sp-stat-val">{{ storageInfo.usedKB }}</span>
                <span class="sp-stat-label">KB 已使用</span>
              </div>
              <div class="sp-stat">
                <span class="sp-stat-val">{{ localGamesStore.count }}</span>
                <span class="sp-stat-label">本地游戏</span>
              </div>
              <div class="sp-stat">
                <span class="sp-stat-val">{{ totalSaveCount }}</span>
                <span class="sp-stat-label">存档总数</span>
              </div>
              <div class="sp-stat">
                <span class="sp-stat-val">{{ storagePercent }}%</span>
                <span class="sp-stat-label">容量占用</span>
              </div>
            </div>
            <div class="sp-progress">
              <div class="sp-progress-fill" :class="progressClass" :style="{ width: storagePercent + '%' }" />
            </div>

            <!-- 分类清理 -->
            <div class="sp-section-title">分类清理</div>
            <div class="sp-items">

              <!-- 编辑器草稿 -->
              <div class="sp-item">
                <div class="sp-item-info">
                  <span class="sp-item-icon">📝</span>
                  <div>
                    <div class="sp-item-name">编辑器草稿</div>
                    <div class="sp-item-desc">当前{{ hasDraft ? '有' : '无' }}未保存草稿 · {{ draftSizeKB }} KB</div>
                  </div>
                </div>
                <button class="sp-btn sp-btn-warn" :disabled="!hasDraft" @click="clearDraft">
                  清除草稿
                </button>
              </div>

              <!-- 本地游戏列表（逐条） -->
              <div class="sp-item sp-item-expandable">
                <div class="sp-item-info">
                  <span class="sp-item-icon">💾</span>
                  <div>
                    <div class="sp-item-name">本地游戏</div>
                    <div class="sp-item-desc">{{ localGamesStore.count }} 个游戏 · {{ localGamesSizeKB }} KB</div>
                  </div>
                </div>
                <button class="sp-btn sp-btn-toggle" @click="expandGames = !expandGames">
                  {{ expandGames ? '收起' : '展开' }}
                </button>
              </div>
              <Transition name="expand">
                <div v-if="expandGames" class="sp-sublist">
                  <div v-if="localGamesStore.list.length === 0" class="sp-empty">暂无本地游戏</div>
                  <div v-for="game in localGamesStore.list" :key="game.id" class="sp-subitem">
                    <div class="sp-subitem-info">
                      <span class="sp-subitem-name">{{ game.name }}</span>
                      <span class="sp-subitem-meta">
                        存档 {{ getGameSaveCount(game.id) }} 个 ·
                        {{ getGameSizeKB(game.id) }} KB
                      </span>
                    </div>
                    <div class="sp-subitem-actions">
                      <button class="sp-btn sp-btn-sm" :disabled="getGameSaveCount(game.id) === 0"
                        @click="clearGameSaves(game.id, game.name)">
                        清存档
                      </button>
                      <button class="sp-btn sp-btn-sm sp-btn-danger" @click="removeGame(game.id, game.name)">
                        删游戏
                      </button>
                    </div>
                  </div>
                </div>
              </Transition>

              <!-- 全部存档 -->
              <div class="sp-item">
                <div class="sp-item-info">
                  <span class="sp-item-icon">🎮</span>
                  <div>
                    <div class="sp-item-name">全部游戏存档</div>
                    <div class="sp-item-desc">{{ totalSaveCount }} 条存档 · {{ allSavesSizeKB }} KB</div>
                  </div>
                </div>
                <button class="sp-btn sp-btn-warn" :disabled="totalSaveCount === 0" @click="clearAllSaves">
                  清除全部
                </button>
              </div>

              <!-- 全部进度 -->
              <div class="sp-item">
                <div class="sp-item-info">
                  <span class="sp-item-icon">📊</span>
                  <div>
                    <div class="sp-item-name">游戏进度记录</div>
                    <div class="sp-item-desc">{{ progressCount }} 条记录 · {{ allProgressSizeKB }} KB</div>
                  </div>
                </div>
                <button class="sp-btn sp-btn-warn" :disabled="progressCount === 0" @click="clearAllProgress">
                  清除全部
                </button>
              </div>
            </div>

            <!-- 一键清除全部 -->
            <div class="sp-footer">
              <button class="sp-btn sp-btn-danger sp-btn-full" @click="clearAll">
                🗑️ 清除全部本地数据
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminStore } from '@/stores/admin'
import { useLocalGamesStore } from '@/stores/localGames'
import ToastContainer from '@/components/ToastContainer.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

// ── Stores ───────────────────────────────────────────────────
const adminStore = useAdminStore()
const localGamesStore = useLocalGamesStore()

// ── 存储面板状态 ─────────────────────────────────────────────
const storageOpen = ref(false)
const expandGames = ref(false)

function openStorage() {
  refresh()
  storageOpen.value = true
}

// ── 存储键常量（与 localGames.ts 保持一致）───────────────────
const SAVE_PREFIX = 'sakura_save:'
const PROG_PREFIX = 'sakura_prog:'
const DRAFT_KEY = 'sakura_editor_draft'

// ── 工具：获取 localStorage 中某个键的字节数（UTF-16）────────
function keyBytes(key: string): number {
  const val = localStorage.getItem(key)
  return val ? val.length * 2 : 0
}

function toKB(bytes: number): string {
  return (bytes / 1024).toFixed(1)
}

// ── 全局存储用量 ─────────────────────────────────────────────
const storageInfo = ref({ usedKB: '0.0', usedBytes: 0 })

function calcTotalUsed(): number {
  let total = 0
  for (const key in localStorage) {
    if (!Object.prototype.hasOwnProperty.call(localStorage, key)) continue
    total += (localStorage.getItem(key)?.length ?? 0) * 2
  }
  return total
}

const storagePercent = computed(() => {
  const pct = (storageInfo.value.usedBytes / (5 * 1024 * 1024)) * 100
  return Math.min(Math.round(pct), 100)
})

const progressClass = computed(() => {
  if (storagePercent.value > 80) return 'danger'
  if (storagePercent.value > 50) return 'warn'
  return ''
})

const storageWarning = computed(() => storagePercent.value > 75)

// ── 草稿 ─────────────────────────────────────────────────────
const hasDraft = ref(false)
const draftSizeKB = ref('0.0')

// ── 本地游戏 ─────────────────────────────────────────────────
const localGamesSizeKB = ref('0.0')

function calcLocalGamesSize(): number {
  const raw = localStorage.getItem('sakura_local_games')
  return raw ? raw.length * 2 : 0
}

// ── 存档统计 ─────────────────────────────────────────────────
const totalSaveCount = ref(0)
const allSavesSizeKB = ref('0.0')

function getSaveKeys(): string[] {
  return Object.keys(localStorage).filter(k => k.startsWith(SAVE_PREFIX))
}

function getGameSaveCount(gameId: string): number {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + gameId)
    return raw ? (JSON.parse(raw) as unknown[]).length : 0
  } catch { return 0 }
}

function getGameSizeKB(gameId: string): string {
  const saveBytes = keyBytes(SAVE_PREFIX + gameId)
  const progBytes = keyBytes(PROG_PREFIX + gameId)
  return toKB(saveBytes + progBytes)
}

// ── 进度统计 ─────────────────────────────────────────────────
const progressCount = ref(0)
const allProgressSizeKB = ref('0.0')

function getProgressKeys(): string[] {
  return Object.keys(localStorage).filter(k => k.startsWith(PROG_PREFIX))
}

// ── 刷新所有统计 ─────────────────────────────────────────────
function refresh() {
  const usedBytes = calcTotalUsed()
  storageInfo.value = { usedBytes, usedKB: toKB(usedBytes) }

  hasDraft.value = !!localStorage.getItem(DRAFT_KEY)
  draftSizeKB.value = toKB(keyBytes(DRAFT_KEY))

  localGamesSizeKB.value = toKB(calcLocalGamesSize())

  const saveKeys = getSaveKeys()
  let saveTotalBytes = 0
  let saveTotalCount = 0
  for (const k of saveKeys) {
    saveTotalBytes += keyBytes(k)
    try {
      saveTotalCount += (JSON.parse(localStorage.getItem(k) ?? '[]') as unknown[]).length
    } catch { /* ignore */ }
  }
  totalSaveCount.value = saveTotalCount
  allSavesSizeKB.value = toKB(saveTotalBytes)

  const progKeys = getProgressKeys()
  progressCount.value = progKeys.length
  allProgressSizeKB.value = toKB(progKeys.reduce((s, k) => s + keyBytes(k), 0))
}

onMounted(refresh)

// ── 清理操作 ─────────────────────────────────────────────────

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
  refresh()
}

function clearGameSaves(gameId: string, name: string) {
  if (!confirm(`确认清除「${name}」的全部存档？`)) return
  localStorage.removeItem(SAVE_PREFIX + gameId)
  refresh()
}

function removeGame(gameId: string, name: string) {
  if (!confirm(`确认删除本地游戏「${name}」及其所有存档和进度？\n此操作不可恢复。`)) return
  localGamesStore.remove(gameId)
  localStorage.removeItem(SAVE_PREFIX + gameId)
  localStorage.removeItem(PROG_PREFIX + gameId)
  refresh()
}

function clearAllSaves() {
  if (!confirm('确认清除所有游戏的存档？此操作不可恢复。')) return
  getSaveKeys().forEach(k => localStorage.removeItem(k))
  refresh()
}

function clearAllProgress() {
  if (!confirm('确认清除所有游戏的进度记录？此操作不可恢复。')) return
  getProgressKeys().forEach(k => localStorage.removeItem(k))
  refresh()
}

function clearAll() {
  if (!confirm('确认清除全部本地数据？\n包括：本地游戏、存档、进度、草稿。\n此操作完全不可恢复！')) return
  // 只清除 sakura_ 前缀的键，保留其他应用数据
  const sakuraKeys = Object.keys(localStorage).filter(k => k.startsWith('sakura_') || k === 'admin_token')
  // admin_token 不清
  sakuraKeys.filter(k => k !== 'admin_token').forEach(k => localStorage.removeItem(k))
  localGamesStore.list.splice(0)
  refresh()
}
</script>

<style scoped>
/* ── 原有样式全部保留 ──────────────────────────────────────── */
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.site-main {
  flex: 1;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 248, 251, 0.88);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 2px 16px rgba(196, 77, 117, 0.08);
}

.header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  transition: opacity var(--transition);
}

.logo:hover {
  opacity: 0.8;
}

.logo-icon {
  font-size: 1.8rem;
  line-height: 1;
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.logo-main {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--sakura-600);
  letter-spacing: 1px;
}

.logo-sub {
  font-size: 0.6rem;
  letter-spacing: 3px;
  color: var(--ink-400);
  font-weight: 500;
}

.header-nav {
  display: flex;
  gap: 4px;
}

.nav-link {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ink-600);
  transition: all var(--transition);
}

.nav-link:hover,
.nav-link.active {
  background: var(--sakura-100);
  color: var(--sakura-600);
}

.nav-link-editor {
  background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
  color: #fff !important;
  padding: 6px 16px;
}

.nav-link-editor:hover {
  opacity: 0.88;
  background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
}

.nav-link-admin {
  font-size: 1.1rem;
  padding: 6px 10px;
  color: var(--ink-400) !important;
}

.nav-link-admin:hover,
.nav-link-admin.active {
  background: var(--ink-100);
  color: var(--ink-600) !important;
}

/* 存储按钮 */
.nav-link-storage {
  position: relative;
  font-size: 1.1rem;
  padding: 6px 10px;
  color: var(--ink-400) !important;
  background: none;
  border: none;
  cursor: pointer;
}

.nav-link-storage:hover {
  background: var(--ink-100);
  color: var(--ink-600) !important;
}

.storage-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f87171;
  border: 1.5px solid white;
}

.header-petal-strip {
  display: flex;
  justify-content: space-around;
  padding: 2px 0;
  background: linear-gradient(90deg, var(--sakura-200), var(--sakura-300), var(--sakura-200));
  font-size: 0.55rem;
  opacity: 0.7;
  overflow: hidden;
}

.site-footer {
  padding: 24px;
  text-align: center;
  font-size: 0.82rem;
  color: var(--ink-400);
  border-top: 1px solid var(--border);
  background: var(--sakura-100);
}

.footer-powered {
  margin-top: 6px;
  font-size: 0.78rem;
  color: var(--ink-200);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.powered-name {
  color: var(--sakura-500);
  font-weight: 600;
}

.footer-github {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-400);
  font-weight: 500;
  transition: color var(--transition);
}

.footer-github:hover {
  color: var(--sakura-500);
}

.github-icon {
  width: 14px;
  height: 14px;
}

/* 底部存储条 */
.footer-storage {
  margin-top: 8px;
  font-size: 0.75rem;
  color: var(--ink-300);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: color var(--transition);
}

.footer-storage:hover {
  color: var(--sakura-500);
}

.footer-storage-bar {
  width: 80px;
  height: 4px;
  border-radius: 2px;
  background: var(--sakura-200);
  overflow: hidden;
}

.footer-storage-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--sakura-400);
  transition: width 0.4s ease;
}

/* ── 存储面板 ─────────────────────────────────────────────── */
.storage-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.storage-panel {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(196, 77, 117, 0.2);
  display: flex;
  flex-direction: column;
}

.sp-header {
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

.sp-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--sakura-600, #c44d75);
}

.sp-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: var(--ink-400, #aaa);
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.sp-close:hover {
  background: var(--sakura-100, #fde8ef);
}

/* 总览格 */
.sp-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 20px 24px 12px;
}

.sp-stat {
  background: var(--sakura-50, #fff5f8);
  border-radius: 12px;
  padding: 12px 8px;
  text-align: center;
  border: 1px solid var(--sakura-100, #fde8ef);
}

.sp-stat-val {
  display: block;
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--sakura-600, #c44d75);
}

.sp-stat-label {
  font-size: 0.7rem;
  color: var(--ink-400, #aaa);
  margin-top: 2px;
  display: block;
}

/* 进度条 */
.sp-progress {
  margin: 0 24px 20px;
  height: 8px;
  border-radius: 4px;
  background: var(--sakura-100, #fde8ef);
  overflow: hidden;
}

.sp-progress-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--sakura-400, #e87da0);
  transition: width 0.5s ease;
}

.sp-progress-fill.warn {
  background: #fb923c;
}

.sp-progress-fill.danger {
  background: #f87171;
}

/* 分类标题 */
.sp-section-title {
  padding: 0 24px 8px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-400, #aaa);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* 列表项 */
.sp-items {
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--sakura-50, #fff5f8);
  border: 1px solid var(--sakura-100, #fde8ef);
  gap: 12px;
}

.sp-item-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.sp-item-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
}

.sp-item-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink-700, #444);
}

.sp-item-desc {
  font-size: 0.75rem;
  color: var(--ink-400, #aaa);
  margin-top: 1px;
}

/* 子列表 */
.sp-sublist {
  margin: 0 0 4px;
  padding: 8px 12px;
  background: var(--sakura-50, #fff5f8);
  border: 1px solid var(--sakura-100, #fde8ef);
  border-top: none;
  border-radius: 0 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sp-empty {
  font-size: 0.8rem;
  color: var(--ink-300, #ccc);
  text-align: center;
  padding: 8px;
}

.sp-subitem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 4px;
  border-bottom: 1px dashed var(--sakura-100, #fde8ef);
}

.sp-subitem:last-child {
  border-bottom: none;
}

.sp-subitem-info {
  flex: 1;
  min-width: 0;
}

.sp-subitem-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ink-600, #666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sp-subitem-meta {
  font-size: 0.72rem;
  color: var(--ink-300, #ccc);
}

.sp-subitem-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* 按钮 */
.sp-btn {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.sp-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.sp-btn-warn {
  background: var(--sakura-100, #fde8ef);
  color: var(--sakura-600, #c44d75);
}

.sp-btn-warn:not(:disabled):hover {
  background: var(--sakura-200, #fbd0df);
}

.sp-btn-toggle {
  background: var(--ink-100, #f5f5f5);
  color: var(--ink-500, #888);
}

.sp-btn-toggle:hover {
  background: var(--ink-200, #eee);
}

.sp-btn-danger {
  background: #fee2e2;
  color: #dc2626;
}

.sp-btn-danger:hover {
  background: #fecaca;
}

.sp-btn-sm {
  padding: 4px 10px;
  font-size: 0.75rem;
  background: var(--sakura-100, #fde8ef);
  color: var(--sakura-600, #c44d75);
}

.sp-btn-sm:not(:disabled):hover {
  background: var(--sakura-200, #fbd0df);
}

.sp-btn-sm.sp-btn-danger {
  background: #fee2e2;
  color: #dc2626;
}

.sp-btn-sm.sp-btn-danger:hover {
  background: #fecaca;
}

.sp-btn-full {
  width: 100%;
  padding: 12px;
  font-size: 0.9rem;
  border-radius: 12px;
}

/* 底部 */
.sp-footer {
  padding: 16px 24px 20px;
  border-top: 1px solid var(--border, #f0d6df);
  margin-top: 12px;
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.96);
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
  max-height: 400px;
}
</style>