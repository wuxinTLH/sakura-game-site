<template>
    <div class="local-view">
        <!-- Hero -->
        <section class="local-hero">
            <div class="local-hero-inner">
                <h1 class="local-hero-title">
                    <span>💾</span> 本地游戏
                </h1>
                <p class="local-hero-sub">你在编辑器中保存的游戏，仅存储在当前浏览器本地</p>
                <button class="btn-new" @click="router.push('/editor')">
                    ✏️ 新建游戏
                </button>
            </div>
        </section>

        <div class="local-content">
            <!-- 空状态 -->
            <div class="local-empty" v-if="!store.list.length">
                <div class="empty-icon">💾</div>
                <h3>还没有本地游戏</h3>
                <p>在编辑器中编写并保存后，游戏会出现在这里</p>
                <button class="btn-go-editor" @click="router.push('/editor')">
                    去编辑器创建
                </button>
            </div>

            <!-- 游戏列表 -->
            <div class="local-list" v-else>
                <div class="local-card" v-for="game in store.list" :key="game.id">
                    <!-- 左：信息 -->
                    <div class="lc-info">
                        <div class="lc-header">
                            <h3 class="lc-name">{{ game.name }}</h3>
                            <div class="lc-tags" v-if="game.tags">
                                <span v-for="tag in game.tags.split(',').filter(Boolean)" :key="tag" class="tag">{{
                                    tag.trim() }}</span>
                            </div>
                        </div>
                        <p class="lc-desc" v-if="game.description">{{ game.description }}</p>
                        <div class="lc-meta">
                            <span v-if="game.author">👤 {{ game.author }}</span>
                            <span>🕐 {{ formatDate(game.updatedAt) }}</span>
                            <span>📝 {{ game.code.length }} 字符</span>
                        </div>
                    </div>

                    <!-- 右：操作 -->
                    <div class="lc-actions">
                        <button class="btn-play" @click="playGame(game)">
                            ▶ 游玩
                        </button>
                        <button class="btn-edit" @click="editGame(game)">
                            ✏️ 编辑
                        </button>
                        <button class="btn-export" @click="store.exportGame(game.id)" title="导出为 HTML">
                            ⬇ 导出
                        </button>
                        <button class="btn-delete" @click="confirmDelete(game)" title="删除">
                            🗑
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 游玩弹窗 -->
        <div class="play-modal-mask" v-if="playingGame" @click.self="playingGame = null">
            <div class="play-modal">
                <div class="play-modal-header">
                    <span class="play-modal-title">🎮 {{ playingGame.name }}</span>
                    <button class="play-close" @click="playingGame = null">✕</button>
                </div>
                <iframe class="play-iframe" sandbox="allow-scripts allow-same-origin" :srcdoc="playingGame.code"
                    frameborder="0" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLocalGamesStore } from '@/stores/localGames'
import type { LocalGame } from '@/stores/localGames'

const store = useLocalGamesStore()
const router = useRouter()

const playingGame = ref<LocalGame | null>(null)

function playGame(game: LocalGame) {
    playingGame.value = game
}

function editGame(game: LocalGame) {
    router.push({ path: '/editor', query: { id: game.id } })
}

function confirmDelete(game: LocalGame) {
    if (confirm(`确认删除"${game.name}"？此操作不可恢复。`)) {
        store.remove(game.id)
    }
}

function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
/* Hero */
.local-hero {
    background: linear-gradient(160deg, #1a1a2e 0%, #16213e 100%);
    border-bottom: 1px solid #2a2a44;
    padding: 44px 24px 36px;
}

.local-hero-inner {
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
}

.local-hero-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 4vw, 2.2rem);
    font-weight: 900;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
}

.local-hero-sub {
    color: #888;
    font-size: 0.9rem;
}

.btn-new {
    margin-top: 6px;
    padding: 10px 28px;
    border-radius: 50px;
    background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
    color: #fff;
    font-weight: 700;
    font-size: 0.95rem;
    transition: all 0.2s;
}

.btn-new:hover {
    transform: scale(1.04);
    opacity: 0.9;
}

/* Content */
.local-content {
    max-width: 900px;
    margin: 0 auto;
    padding: 28px 20px 60px;
}

/* 空状态 */
.local-empty {
    text-align: center;
    padding: 80px 20px;
}

.empty-icon {
    font-size: 3.5rem;
    margin-bottom: 16px;
    opacity: 0.4;
}

.local-empty h3 {
    font-size: 1.2rem;
    color: var(--ink-600);
    margin-bottom: 8px;
}

.local-empty p {
    color: var(--ink-400);
    font-size: 0.9rem;
    margin-bottom: 20px;
}

.btn-go-editor {
    padding: 10px 28px;
    border-radius: 50px;
    background: var(--sakura-500);
    color: #fff;
    font-weight: 700;
    font-size: 0.9rem;
    transition: background 0.2s;
}

.btn-go-editor:hover {
    background: var(--sakura-600);
}

/* 游戏列表 */
.local-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.local-card {
    display: flex;
    align-items: center;
    gap: 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
    transition: all var(--transition);
    box-shadow: var(--shadow);
    animation: fadeUp 0.35s ease both;
}

.local-card:hover {
    border-color: var(--sakura-300);
    box-shadow: var(--shadow-lg);
    transform: translateY(-1px);
}

.lc-info {
    flex: 1;
    min-width: 0;
}

.lc-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 5px;
}

.lc-name {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--ink-900);
}

.lc-tags {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
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

.lc-desc {
    font-size: 0.83rem;
    color: var(--ink-400);
    line-height: 1.5;
    margin-bottom: 6px;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.lc-meta {
    display: flex;
    gap: 12px;
    font-size: 0.75rem;
    color: var(--ink-200);
    flex-wrap: wrap;
}

/* 操作按钮 */
.lc-actions {
    display: flex;
    gap: 7px;
    flex-shrink: 0;
    flex-wrap: wrap;
}

.btn-play {
    padding: 7px 16px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
    color: #fff;
    font-size: 0.82rem;
    font-weight: 700;
    transition: all 0.2s;
}

.btn-play:hover {
    opacity: 0.88;
    transform: scale(1.03);
}

.btn-edit,
.btn-export {
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 0.82rem;
    background: var(--ink-100);
    color: var(--ink-600);
    border: 1px solid var(--border);
    transition: all 0.2s;
}

.btn-edit:hover,
.btn-export:hover {
    background: var(--sakura-100);
    color: var(--sakura-600);
    border-color: var(--sakura-300);
}

.btn-delete {
    padding: 7px 10px;
    border-radius: 8px;
    font-size: 0.85rem;
    background: #fff0f0;
    color: #e05a5a;
    border: 1px solid #fcc;
    transition: all 0.2s;
}

.btn-delete:hover {
    background: #ffe0e0;
}

/* 游玩弹窗 */
.play-modal-mask {
    position: fixed;
    inset: 0;
    background: #000b;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
}

.play-modal {
    width: min(900px, 96vw);
    height: min(640px, 92vh);
    background: #111;
    border-radius: 14px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 80px #000c;
}

.play-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #1a1a2e;
    border-bottom: 1px solid #2a2a44;
}

.play-modal-title {
    font-weight: 700;
    color: #fff;
    font-size: 0.95rem;
}

.play-close {
    background: none;
    color: #888;
    font-size: 1.1rem;
    border-radius: 6px;
    padding: 2px 8px;
    transition: all 0.2s;
}

.play-close:hover {
    background: #ff4d4d22;
    color: #ff6b6b;
}

.play-iframe {
    flex: 1;
    width: 100%;
    border: none;
    display: block;
}

@media (max-width: 560px) {
    .local-card {
        flex-wrap: wrap;
    }

    .lc-actions {
        width: 100%;
    }

    .btn-play {
        flex: 1;
    }
}
</style>