<template>
    <!-- ★ 列表模式（默认）-->
    <article v-if="!isGrid" class="game-card" @click="handleClick">
        <!-- 左：封面图 -->
        <div class="card-cover" @click.stop="handleClick">
            <!-- 有封面 URL 且未加载失败 -->
            <img v-if="game.image_url && !imgError"
                 :src="game.image_url"
                 :alt="game.name"
                 loading="lazy"
                 @error="imgError = true" />
            <!-- ★ 无封面或加载失败：默认桜主题 SVG（问题1） -->
            <div v-else class="cover-placeholder">
                <svg viewBox="0 0 120 72" xmlns="http://www.w3.org/2000/svg" class="default-cover-svg">
                    <defs>
                        <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#ffe4ec"/>
                            <stop offset="100%" stop-color="#ffd6e8"/>
                        </linearGradient>
                    </defs>
                    <rect width="120" height="72" fill="url(#cardBg)"/>
                    <!-- 中心樱花 -->
                    <g transform="translate(60,34)">
                        <ellipse cx="0" cy="-13" rx="5" ry="9" fill="#f48fb1" opacity=".85" transform="rotate(0)"/>
                        <ellipse cx="0" cy="-13" rx="5" ry="9" fill="#f48fb1" opacity=".85" transform="rotate(72)"/>
                        <ellipse cx="0" cy="-13" rx="5" ry="9" fill="#f48fb1" opacity=".85" transform="rotate(144)"/>
                        <ellipse cx="0" cy="-13" rx="5" ry="9" fill="#f48fb1" opacity=".85" transform="rotate(216)"/>
                        <ellipse cx="0" cy="-13" rx="5" ry="9" fill="#f48fb1" opacity=".85" transform="rotate(288)"/>
                        <circle cx="0" cy="0" r="5" fill="#fff"/>
                        <circle cx="0" cy="0" r="3" fill="#f8bbd0"/>
                    </g>
                    <!-- 小花瓣装饰 -->
                    <g opacity=".4">
                        <ellipse cx="16" cy="16" rx="3" ry="5" fill="#f48fb1" transform="rotate(-20,16,16)"/>
                        <ellipse cx="104" cy="22" rx="3" ry="5" fill="#f48fb1" transform="rotate(25,104,22)"/>
                        <ellipse cx="20" cy="56" rx="2.5" ry="4" fill="#f48fb1" transform="rotate(15,20,56)"/>
                        <ellipse cx="100" cy="56" rx="3" ry="5" fill="#f48fb1" transform="rotate(-18,100,56)"/>
                    </g>
                    <!-- 游戏名截断文字 -->
                    <text x="60" y="67"
                          text-anchor="middle"
                          font-family="sans-serif"
                          font-size="8"
                          fill="#c0396b"
                          opacity=".7">{{ truncatedName }}</text>
                </svg>
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

    <!-- ★ 网格模式（问题3）：紧凑卡片，封面为主 -->
    <article v-else class="game-card-grid" @click="handleClick">
        <div class="grid-cover">
            <img v-if="props.game.image_url && !imgError"
                 :src="props.game.image_url"
                 :alt="props.game.name"
                 loading="lazy"
                 @error="imgError = true" />
            <div v-else class="grid-cover-default">
                <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                    <defs>
                        <linearGradient id="gcBg" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#ffe4ec"/>
                            <stop offset="100%" stop-color="#ffd6e8"/>
                        </linearGradient>
                    </defs>
                    <rect width="120" height="80" fill="url(#gcBg)"/>
                    <g transform="translate(60,36)">
                        <ellipse cx="0" cy="-14" rx="5.5" ry="10" fill="#f48fb1" opacity=".85" transform="rotate(0)"/>
                        <ellipse cx="0" cy="-14" rx="5.5" ry="10" fill="#f48fb1" opacity=".85" transform="rotate(72)"/>
                        <ellipse cx="0" cy="-14" rx="5.5" ry="10" fill="#f48fb1" opacity=".85" transform="rotate(144)"/>
                        <ellipse cx="0" cy="-14" rx="5.5" ry="10" fill="#f48fb1" opacity=".85" transform="rotate(216)"/>
                        <ellipse cx="0" cy="-14" rx="5.5" ry="10" fill="#f48fb1" opacity=".85" transform="rotate(288)"/>
                        <circle cx="0" cy="0" r="5.5" fill="#fff"/>
                        <circle cx="0" cy="0" r="3" fill="#f8bbd0"/>
                    </g>
                </svg>
            </div>
            <span class="grid-play-badge" v-if="props.game.play_count > 0">
                ▶ {{ formatCount(props.game.play_count) }}
            </span>
        </div>
        <div class="grid-info">
            <h3 class="grid-name">{{ props.game.name }}</h3>
            <div class="grid-tags" v-if="tagList.length">
                <span v-for="tag in tagList.slice(0,2)" :key="tag" class="tag">{{ tag }}</span>
            </div>
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { GameListItem } from '@/types/game'

const props  = defineProps<{ game: GameListItem; mode?: 'list' | 'grid' }>()
const isGrid = computed(() => props.mode === 'grid')
const router = useRouter()
const imgError = ref(false)

const tagList = computed(() =>
    props.game.tags
        ? props.game.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3)
        : []
)

// ★ SVG 内显示的截断名称（问题1）
const truncatedName = computed(() => {
    const n = props.game.name || ''
    return n.length > 10 ? n.slice(0, 9) + '…' : n
})

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

/* ★ 默认封面容器（问题1） */
.cover-placeholder {
    width: 100%;
    height: 100%;
}

.default-cover-svg {
    width: 100%;
    height: 100%;
    display: block;
    transition: transform 0.4s ease;
}

.game-card:hover .default-cover-svg {
    transform: scale(1.04);
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
/* ★ 网格卡片（问题3） */
.game-card-grid {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    cursor: pointer;
    transition: all var(--transition);
    background: var(--surface);
    box-shadow: var(--shadow);
    animation: fadeUp 0.4s ease both;
    display: flex;
    flex-direction: column;
}

.game-card-grid:hover {
    border-color: var(--sakura-300);
    box-shadow: var(--shadow-lg);
    transform: translateY(-3px);
}

.grid-cover {
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 2;
    overflow: hidden;
    background: var(--sakura-100);
}

.grid-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
    display: block;
}

.game-card-grid:hover .grid-cover img {
    transform: scale(1.06);
}

.grid-cover-default {
    width: 100%;
    height: 100%;
}

.grid-play-badge {
    position: absolute;
    bottom: 4px;
    right: 5px;
    background: rgba(0,0,0,0.5);
    color: #fff;
    font-size: 0.62rem;
    padding: 1px 6px;
    border-radius: 10px;
    backdrop-filter: blur(4px);
}

.grid-info {
    padding: 8px 10px 10px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.grid-name {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--ink-900);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-display);
}

.grid-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}
</style>