<template>
    <div class="game-view">
        <!-- ── 加载态 ──────────────────────────────────────────────── -->
        <div class="loading-screen" v-if="loading">
            <div class="loading-petals">
                <span v-for="i in 5" :key="i" :style="{ animationDelay: i * 0.15 + 's' }">🌸</span>
            </div>
            <p>游戏加载中…</p>
        </div>

        <!-- ── 错误态 ──────────────────────────────────────────────── -->
        <div class="error-screen" v-else-if="error">
            <div class="error-icon">😵</div>
            <h2>游戏加载失败</h2>
            <p>{{ error }}</p>
            <div class="error-actions">
                <button @click="load" class="btn-retry">重试</button>
                <router-link to="/" class="btn-home">返回首页</router-link>
            </div>
        </div>

        <!-- ── 游戏内容 ────────────────────────────────────────────── -->
        <template v-else-if="game">
            <!-- 面包屑 -->
            <div class="breadcrumb-bar">
                <div class="breadcrumb-inner">
                    <router-link to="/" class="bc-link">🏠 首页</router-link>
                    <span class="bc-sep">›</span>
                    <span class="bc-current">{{ game.name }}</span>
                </div>
            </div>

            <!-- 游戏信息栏 -->
            <div class="game-meta-bar">
                <div class="game-meta-inner">
                    <div class="gm-cover">
                        <img v-if="game.image_url" :src="game.image_url" :alt="game.name" />
                        <span v-else class="gm-emoji">🎮</span>
                    </div>
                    <div class="gm-info">
                        <h1 class="gm-title">{{ game.name }}</h1>
                        <p class="gm-desc">{{ game.description }}</p>
                        <div class="gm-tags">
                            <span v-for="tag in tagList" :key="tag" class="tag">{{ tag }}</span>
                        </div>
                        <div class="gm-stats">
                            <span>👤 {{ game.author }}</span>
                            <span>▶ 已玩 {{ formatCount(game.play_count) }} 次</span>
                        </div>
                    </div>
                    <div class="gm-actions">
                        <button class="btn-fullscreen" @click="toggleFullscreen">
                            {{ isFullscreen ? '⬜ 退出全屏' : '⛶ 全屏' }}
                        </button>
                        <router-link to="/" class="btn-back">← 返回</router-link>
                    </div>
                </div>
            </div>

            <!-- 游戏画布 -->
            <div class="game-stage" ref="stageRef">
                <div class="stage-inner" :class="{ fullscreen: isFullscreen }">
                    <iframe ref="iframeRef" class="game-iframe" sandbox="allow-scripts allow-same-origin"
                        :srcdoc="game.game_code" frameborder="0" allowfullscreen title="game" @load="onIframeLoad" />
                    <!-- 全屏关闭按钮 -->
                    <button v-if="isFullscreen" class="fs-close-btn" @click="toggleFullscreen">✕ 退出全屏</button>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchGame, recordPlay } from '@/api/games'
import type { Game } from '@/types/game'

const route = useRoute()
const router = useRouter()

const game = ref<Game | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const iframeRef = ref<HTMLIFrameElement>()
const stageRef = ref<HTMLElement>()
const isFullscreen = ref(false)

const tagList = computed(() =>
    game.value?.tags
        ? game.value.tags.split(',').map(t => t.trim()).filter(Boolean)
        : []
)

function formatCount(n: number) {
    return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toString()
}

async function load() {
    const id = Number(route.params.id)
    if (!id) { router.replace('/'); return }
    loading.value = true
    error.value = null
    try {
        const res = await fetchGame(id)
        game.value = res.data
        // 更新 title
        document.title = res.data.name
        // 异步记录游玩次数
        recordPlay(id).catch(() => { })
    } catch (e: any) {
        error.value = e.message
    } finally {
        loading.value = false
    }
}

function onIframeLoad() {
    // iframe 加载完毕，可以扩展处理
}

function toggleFullscreen() {
    isFullscreen.value = !isFullscreen.value
    if (isFullscreen.value) {
        document.body.style.overflow = 'hidden'
    } else {
        document.body.style.overflow = ''
    }
}

// ESC 退出全屏
function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isFullscreen.value) toggleFullscreen()
}

onMounted(() => {
    load()
    document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    document.body.style.overflow = ''
    document.addEventListener('keydown', handleKeydown)
    document.title = '桜游戏屋'
})

// 路由变化时重新加载
watch(() => route.params.id, load)
</script>

<style scoped>
/* ── 加载 / 错误 ──────────────────────────────────────────────────── */
.loading-screen,
.error-screen {
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: var(--ink-400);
}

.loading-petals {
    display: flex;
    gap: 6px;
    font-size: 2rem;
}

.loading-petals span {
    display: inline-block;
    animation: sakuraSpin 1.2s ease-in-out infinite;
}

.loading-screen p {
    font-size: 1rem;
    color: var(--ink-400);
}

.error-icon {
    font-size: 3.5rem;
}

.error-screen h2 {
    font-size: 1.4rem;
    color: var(--ink-900);
}

.error-screen p {
    font-size: 0.9rem;
    color: var(--ink-400);
}

.error-actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
}

.btn-retry {
    padding: 10px 24px;
    border-radius: 20px;
    background: var(--sakura-500);
    color: #fff;
    font-weight: 700;
    transition: background var(--transition);
}

.btn-retry:hover {
    background: var(--sakura-600);
}

.btn-home {
    padding: 10px 24px;
    border-radius: 20px;
    border: 2px solid var(--border);
    color: var(--ink-600);
    font-weight: 600;
    transition: all var(--transition);
}

.btn-home:hover {
    border-color: var(--sakura-300);
    color: var(--sakura-600);
}

/* ── 面包屑 ───────────────────────────────────────────────────────── */
.breadcrumb-bar {
    background: var(--sakura-100);
    border-bottom: 1px solid var(--border);
}

.breadcrumb-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 8px 24px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
}

.bc-link {
    color: var(--sakura-500);
    transition: opacity var(--transition);
}

.bc-link:hover {
    opacity: 0.7;
}

.bc-sep {
    color: var(--ink-200);
}

.bc-current {
    color: var(--ink-600);
    font-weight: 500;
}

/* ── 游戏信息栏 ───────────────────────────────────────────────────── */
.game-meta-bar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 2px 12px rgba(196, 77, 117, 0.06);
}

.game-meta-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    gap: 18px;
}

.gm-cover {
    flex-shrink: 0;
    width: 96px;
    height: 60px;
    border-radius: 10px;
    overflow: hidden;
    background: var(--sakura-100);
    display: flex;
    align-items: center;
    justify-content: center;
}

.gm-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.gm-emoji {
    font-size: 2rem;
}

.gm-info {
    flex: 1;
    min-width: 0;
}

.gm-title {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 900;
    color: var(--ink-900);
    margin-bottom: 4px;
}

.gm-desc {
    font-size: 0.85rem;
    color: var(--ink-400);
    line-height: 1.5;
    margin-bottom: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.gm-tags {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-bottom: 6px;
}

.tag {
    font-size: 0.68rem;
    padding: 2px 8px;
    border-radius: 20px;
    background: var(--sakura-100);
    color: var(--sakura-600);
    border: 1px solid var(--sakura-200);
    font-weight: 500;
}

.gm-stats {
    display: flex;
    gap: 14px;
    font-size: 0.78rem;
    color: var(--ink-400);
}

.gm-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
}

.btn-fullscreen {
    padding: 8px 16px;
    border-radius: 10px;
    background: var(--ink-100);
    color: var(--ink-600);
    font-size: 0.82rem;
    font-weight: 600;
    transition: all var(--transition);
    border: 1.5px solid var(--border);
}

.btn-fullscreen:hover {
    background: var(--sakura-100);
    color: var(--sakura-600);
    border-color: var(--sakura-300);
}

.btn-back {
    padding: 8px 16px;
    border-radius: 10px;
    background: var(--sakura-500);
    color: #fff;
    font-size: 0.82rem;
    font-weight: 700;
    text-align: center;
    transition: background var(--transition);
}

.btn-back:hover {
    background: var(--sakura-600);
}

/* ── 游戏画布 ─────────────────────────────────────────────────────── */
.game-stage {
    max-width: 1100px;
    margin: 28px auto;
    padding: 0 20px 60px;
}

.stage-inner {
    position: relative;
    background: #111;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: var(--shadow-lg);
    border: 2px solid var(--border);
}

.stage-inner.fullscreen {
    position: fixed;
    inset: 0;
    z-index: 999;
    border-radius: 0;
    border: none;
    margin: 0;
}

.game-iframe {
    width: 100%;
    height: 70vh;
    min-height: 480px;
    display: block;
    border: none;
}

.stage-inner.fullscreen .game-iframe {
    height: 100vh;
    min-height: unset;
}

.fs-close-btn {
    position: absolute;
    top: 14px;
    right: 14px;
    padding: 8px 16px;
    border-radius: 20px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
    backdrop-filter: blur(8px);
    transition: background var(--transition);
    z-index: 10;
}

.fs-close-btn:hover {
    background: rgba(0, 0, 0, 0.85);
}

/* ── 响应式 ───────────────────────────────────────────────────────── */
@media (max-width: 600px) {
    .game-meta-inner {
        flex-wrap: wrap;
    }

    .gm-cover {
        display: none;
    }

    .gm-actions {
        flex-direction: row;
        width: 100%;
    }

    .btn-fullscreen,
    .btn-back {
        flex: 1;
    }

    .game-iframe {
        height: 55vh;
        min-height: 340px;
    }
}
</style>