<template>
    <article class="game-card" @click="handleClick">
        <!-- 左：封面图 -->
        <div class="card-cover" @click.stop="handleClick">
            <img v-if="game.image_url" :src="game.image_url" :alt="game.name" loading="lazy" @error="imgError = true" />
            <div v-else class="cover-placeholder">
                <span class="cover-emoji">🎮</span>
            </div>
            <!-- 游玩次数徽章 -->
            <span class="play-badge" v-if="game.play_count > 0">
                ▶ {{ formatCount(game.play_count) }}
            </span>
        </div>

        <!-- 中：信息 -->
        <div class="card-body">
            <div class="card-meta">
                <h3 class="game-name">{{ game.name }}</h3>
                <div class="tag-list" v-if="game.tags">
                    <span v-for="tag in tagList" :key="tag" class="tag">{{ tag }}</span>
                </div>
            </div>
            <p class="game-desc">{{ game.description }}</p>
            <div class="card-footer-info">
                <span class="author">👤 {{ game.author }}</span>
            </div>
        </div>

        <!-- 右：按钮 -->
        <div class="card-action" @click.stop>
            <button class="btn-play" @click="handleClick">
                <span class="btn-icon">▶</span>
                开始游戏
            </button>
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { GameListItem } from '@/types/game'

const props = defineProps<{ game: GameListItem }>()
const router = useRouter()
const imgError = ref(false)

const tagList = computed(() =>
    props.game.tags
        ? props.game.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3)
        : []
)

function handleClick() {
    router.push({ name: 'game', params: { id: props.game.id } })
}

function formatCount(n: number) {
    return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toString()
}
</script>

<style scoped>
.game-card {
    display: flex;
    align-items: center;
    gap: 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
    cursor: pointer;
    transition: all var(--transition);
    box-shadow: var(--shadow);
    animation: fadeUp 0.4s ease both;
}

.game-card:hover {
    border-color: var(--sakura-300);
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
}

/* 封面 */
.card-cover {
    position: relative;
    flex-shrink: 0;
    width: 120px;
    height: 72px;
    border-radius: 10px;
    overflow: hidden;
    background: var(--sakura-100);
}

.card-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
}

.game-card:hover .card-cover img {
    transform: scale(1.06);
}

.cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--sakura-100), var(--sakura-200));
}

.cover-emoji {
    font-size: 2.2rem;
}

.play-badge {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 0.65rem;
    padding: 2px 6px;
    border-radius: 20px;
    backdrop-filter: blur(4px);
}

/* 信息 */
.card-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.card-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.game-name {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--ink-900);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tag-list {
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

.game-desc {
    font-size: 0.85rem;
    color: var(--ink-400);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.card-footer-info {
    display: flex;
    gap: 12px;
    font-size: 0.75rem;
    color: var(--ink-200);
}

.author {
    font-weight: 500;
    color: var(--ink-400);
}

/* 按钮 */
.card-action {
    flex-shrink: 0;
}

.btn-play {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 20px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
    color: #fff;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 16px rgba(196, 77, 117, 0.35);
    transition: all var(--transition);
    min-width: 72px;
}

.btn-play:hover {
    background: linear-gradient(135deg, var(--sakura-600), var(--sakura-700));
    transform: scale(1.05);
    box-shadow: 0 6px 24px rgba(196, 77, 117, 0.45);
}

.btn-play:active {
    transform: scale(0.97);
}

.btn-icon {
    font-size: 1.3rem;
}

/* 响应式 */
@media (max-width: 560px) {
    .game-card {
        padding: 12px 14px;
        gap: 12px;
    }

    .card-cover {
        width: 80px;
        height: 54px;
    }

    .game-desc {
        display: none;
    }

    .btn-play {
        padding: 10px 14px;
        font-size: 0.78rem;
    }
}
</style>