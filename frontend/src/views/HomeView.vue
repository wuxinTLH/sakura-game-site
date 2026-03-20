<template>
    <div class="home-view">
        <!-- ── Hero 区域 ─────────────────────────────────────────────── -->
        <section class="hero">
            <div class="hero-inner">
                <h1 class="hero-title">
                    <span class="hero-sakura">🌸</span>
                    发现有趣的小游戏
                </h1>
                <p class="hero-sub">精心收录的趣味游戏合集，随时随地开玩</p>
                <SearchBar v-model="searchText" @search="onSearch" @tag="onTagSearch" class="hero-search" />
            </div>
        </section>

        <!-- ── 主内容 ──────────────────────────────────────────────────── -->
        <div class="content-wrap">

            <!-- 统计 + 排序工具栏 -->
            <div class="list-toolbar" v-if="!store.loading || store.list.length">
                <p class="list-total">
                    <template v-if="store.pagination.total > 0">
                        共 <strong>{{ store.pagination.total }}</strong> 款游戏
                        <template v-if="currentSearch">
                            ，关键词：<em>"{{ currentSearch }}"</em>
                        </template>
                        <template v-if="currentTag">
                            ，标签：<em>{{ currentTag }}</em>
                        </template>
                    </template>
                </p>
                <select class="sel-sort" v-model="sortBy" @change="onSortChange" title="排序方式">
                    <option value="order">默认排序</option>
                    <option value="newest">最新上架</option>
                    <option value="hottest">最多游玩</option>
                </select>
            </div>

            <!-- 错误提示 -->
            <div class="error-block" v-if="store.error">
                <p>⚠️ {{ store.error }}</p>
                <button @click="reload">重新加载</button>
            </div>

            <!-- 游戏列表 -->
            <div class="game-list" v-if="store.list.length">
                <GameCard v-for="(game, i) in store.list" :key="game.id" :game="game"
                    :style="{ animationDelay: `${i * 0.05}s` }" />
            </div>

            <!-- 空状态 -->
            <div class="empty-state" v-else-if="!store.loading">
                <div class="empty-icon">🌸</div>
                <h3>暂无游戏</h3>
                <p>{{ currentSearch || currentTag ? '换个关键词试试吧~' : '游戏列表为空，请稍后再来' }}</p>
                <button v-if="currentSearch || currentTag" @click="clearSearch" class="btn-clear">
                    清除筛选
                </button>
            </div>

            <!-- 加载骨架 -->
            <div class="skeleton-list" v-if="store.loading && !store.list.length">
                <div class="skeleton-card" v-for="i in 5" :key="i">
                    <div class="sk-cover"></div>
                    <div class="sk-body">
                        <div class="sk-line w60"></div>
                        <div class="sk-line w90"></div>
                        <div class="sk-line w45"></div>
                    </div>
                    <div class="sk-btn"></div>
                </div>
            </div>

            <!-- ── 页码分页 ───────────────────────────────────────────── -->
            <div class="pagination" v-if="store.pagination.totalPages > 1">
                <!-- 上一页 -->
                <button class="page-btn" :disabled="store.pagination.page <= 1"
                    @click="goPage(store.pagination.page - 1)" title="上一页">‹</button>

                <!-- 页码列表 -->
                <template v-for="p in pageRange" :key="String(p)">
                    <span v-if="p === '…'" class="page-ellipsis">…</span>
                    <button v-else class="page-btn" :class="{ active: p === store.pagination.page }"
                        @click="goPage(Number(p))">{{ p }}</button>
                </template>

                <!-- 下一页 -->
                <button class="page-btn" :disabled="store.pagination.page >= store.pagination.totalPages"
                    @click="goPage(store.pagination.page + 1)" title="下一页">›</button>
            </div>

            <!-- 全部加载完（单页时显示） -->
            <p class="list-end" v-if="store.pagination.totalPages <= 1 && store.list.length > 0 && !store.loading">
                ── 已加载全部 {{ store.pagination.total }} 款游戏 ──
            </p>

        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGamesStore } from '@/stores/games'
import GameCard from '@/components/GameCard.vue'
import SearchBar from '@/components/SearchBar.vue'

const store = useGamesStore()
const searchText = ref('')
const currentSearch = ref('')
const currentTag = ref('')
const sortBy = ref<'order' | 'newest' | 'hottest'>('order')

// ── 初始加载 ──────────────────────────────────────────────────────
onMounted(() => {
    store.load({ search: '', page: 1, sort: sortBy.value })
})

// ── 搜索 / 标签 ───────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout>

function onSearch(val: string) {
    currentSearch.value = val
    currentTag.value = ''
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
        store.load({ search: val, tags: '', page: 1, sort: sortBy.value })
    }, 50)
}

function onTagSearch(tag: string) {
    currentTag.value = tag
    currentSearch.value = ''
    searchText.value = ''
    store.load({ search: '', tags: tag, page: 1, sort: sortBy.value })
}

function clearSearch() {
    searchText.value = ''
    currentSearch.value = ''
    currentTag.value = ''
    store.load({ search: '', tags: '', page: 1, sort: sortBy.value })
}

function reload() {
    store.load({ search: currentSearch.value, tags: currentTag.value, page: 1, sort: sortBy.value })
}

// ── 排序切换 ──────────────────────────────────────────────────────
function onSortChange() {
    store.load({ search: currentSearch.value, tags: currentTag.value, page: 1, sort: sortBy.value })
}

// ── 分页跳转 ──────────────────────────────────────────────────────
function goPage(p: number) {
    store.load({ search: currentSearch.value, tags: currentTag.value, page: p, sort: sortBy.value })
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── 页码范围计算（最多显示 7 个，超出省略） ───────────────────────
const pageRange = computed<(number | '…')[]>(() => {
    const total = store.pagination.totalPages
    const cur = store.pagination.page
    if (!total || total <= 1) return []
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

    const pages: (number | '…')[] = [1]
    if (cur > 3) pages.push('…')
    const from = Math.max(2, cur - 1)
    const to = Math.min(total - 1, cur + 1)
    for (let p = from; p <= to; p++) pages.push(p)
    if (cur < total - 2) pages.push('…')
    pages.push(total)
    return pages
})
</script>

<style scoped>
/* ── Hero ─────────────────────────────────────────────────────────── */
.hero {
    background: linear-gradient(160deg, var(--sakura-100) 0%, #fff5f8 60%, var(--gold-lt) 100%);
    border-bottom: 1px solid var(--border);
    padding: 52px 24px 44px;
}

.hero-inner {
    max-width: 720px;
    margin: 0 auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.hero-sakura {
    display: inline-block;
    animation: sakuraSpin 6s linear infinite;
    margin-right: 6px;
}

.hero-title {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 5vw, 2.6rem);
    font-weight: 900;
    color: var(--ink-900);
    line-height: 1.2;
}

.hero-sub {
    font-size: 1rem;
    color: var(--ink-400);
    margin-bottom: 8px;
}

.hero-search {
    width: 100%;
    max-width: 600px;
}

/* ── Content ─────────────────────────────────────────────────────── */
.content-wrap {
    max-width: 860px;
    margin: 0 auto;
    padding: 28px 20px 60px;
}

/* ── 工具栏（统计 + 排序） ──────────────────────────────────────── */
.list-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    gap: 12px;
    flex-wrap: wrap;
}

.list-total {
    font-size: 0.88rem;
    color: var(--ink-400);
}

.list-total strong {
    color: var(--sakura-600);
}

.list-total em {
    color: var(--ink-600);
    font-style: normal;
}

.sel-sort {
    padding: 7px 14px;
    border-radius: 20px;
    border: 1.5px solid var(--border);
    background: var(--surface);
    color: var(--ink-600);
    font-size: 0.84rem;
    outline: none;
    cursor: pointer;
    transition: border-color var(--transition);
    flex-shrink: 0;
}

.sel-sort:hover,
.sel-sort:focus {
    border-color: var(--sakura-300);
}

/* ── 游戏列表 ────────────────────────────────────────────────────── */
.game-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

/* ── 空状态 ──────────────────────────────────────────────────────── */
.empty-state {
    text-align: center;
    padding: 80px 20px;
    color: var(--ink-400);
}

.empty-icon {
    font-size: 3.5rem;
    margin-bottom: 16px;
    opacity: 0.5;
}

.empty-state h3 {
    font-size: 1.2rem;
    margin-bottom: 8px;
    color: var(--ink-600);
}

.empty-state p {
    font-size: 0.9rem;
    margin-bottom: 20px;
}

.btn-clear {
    padding: 8px 24px;
    border-radius: 20px;
    background: var(--sakura-100);
    color: var(--sakura-600);
    border: 1.5px solid var(--sakura-300);
    font-size: 0.88rem;
    font-weight: 600;
    transition: all var(--transition);
}

.btn-clear:hover {
    background: var(--sakura-200);
}

/* ── 错误 ────────────────────────────────────────────────────────── */
.error-block {
    text-align: center;
    padding: 40px 20px;
    color: #c0392b;
    background: #fff5f5;
    border: 1px solid #f5c6cb;
    border-radius: var(--radius);
    margin-bottom: 16px;
}

.error-block button {
    margin-top: 12px;
    padding: 8px 20px;
    border-radius: 20px;
    background: #c0392b;
    color: #fff;
    font-size: 0.88rem;
}

/* ── 骨架屏 ──────────────────────────────────────────────────────── */
.skeleton-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.skeleton-card {
    display: flex;
    align-items: center;
    gap: 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
}

@keyframes shimmer {
    0% {
        background-position: -400px 0;
    }

    100% {
        background-position: 400px 0;
    }
}

.sk-cover,
.sk-line,
.sk-btn {
    background: linear-gradient(90deg, #f5e9ee 25%, #fce4ef 50%, #f5e9ee 75%);
    background-size: 800px 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 8px;
}

.sk-cover {
    flex-shrink: 0;
    width: 120px;
    height: 72px;
    border-radius: 10px;
}

.sk-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.sk-line {
    height: 12px;
    border-radius: 6px;
}

.w60 {
    width: 60%;
}

.w90 {
    width: 90%;
}

.w45 {
    width: 45%;
}

.sk-btn {
    flex-shrink: 0;
    width: 72px;
    height: 56px;
    border-radius: 12px;
}

/* ── 页码分页 ─────────────────────────────────────────────────────── */
.pagination {
    display: flex;
    align-items: center;
    gap: 6px;
    justify-content: center;
    margin-top: 36px;
    flex-wrap: wrap;
}

.page-btn {
    min-width: 36px;
    height: 36px;
    padding: 0 10px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    background: var(--surface);
    border: 1.5px solid var(--border);
    color: var(--ink-600);
    transition: all var(--transition);
    cursor: pointer;
    line-height: 1;
}

.page-btn:hover:not(:disabled) {
    border-color: var(--sakura-300);
    color: var(--sakura-500);
    background: var(--sakura-100);
}

.page-btn.active {
    background: var(--sakura-500);
    border-color: var(--sakura-500);
    color: #fff;
    font-weight: 700;
}

.page-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.page-ellipsis {
    min-width: 28px;
    text-align: center;
    color: var(--ink-300);
    font-size: 0.85rem;
    line-height: 36px;
    user-select: none;
}

/* ── 全部加载完 ───────────────────────────────────────────────────── */
.list-end {
    text-align: center;
    margin-top: 32px;
    font-size: 0.82rem;
    color: var(--ink-200);
    letter-spacing: 2px;
}
</style>