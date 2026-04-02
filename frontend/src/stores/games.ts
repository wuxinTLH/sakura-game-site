// src/stores/games.ts
// ★ P1 修复：loadMore 也加 error 状态；添加 sort 参数支持分类浏览
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchGames, type GamesQuery } from '@/api/games'
import type { GameListItem, Pagination } from '@/types/game'

export const useGamesStore = defineStore('games', () => {
    const list = ref<GameListItem[]>([])
    const pagination = ref<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 })
    const loading = ref(false)
    const error = ref<string | null>(null)
    const query = ref<GamesQuery>({ search: '', page: 1, limit: 12 })

    const hasMore = computed(() => pagination.value.page < pagination.value.totalPages)

    async function load(params?: GamesQuery) {
        if (params) query.value = { ...query.value, ...params, page: 1 }
        loading.value = true
        error.value = null
        try {
            const res = await fetchGames(query.value)
            list.value = res.data.list
            pagination.value = res.data.pagination
        } catch (e: any) {
            // ★ P1 修复：error 状态明确，组件层可展示重试按钮
            error.value = e.message || '加载游戏列表失败，请检查网络连接'
        } finally {
            loading.value = false
        }
    }

    async function loadMore() {
        if (!hasMore.value || loading.value) return
        query.value.page = (query.value.page || 1) + 1
        loading.value = true
        error.value = null
        try {
            const res = await fetchGames(query.value)
            list.value.push(...res.data.list)
            pagination.value = res.data.pagination
        } catch (e: any) {
            error.value = e.message || '加载更多失败'
            // 加载失败时回退页码
            query.value.page = (query.value.page || 2) - 1
        } finally {
            loading.value = false
        }
    }

    // ★ 新增：按分类加载（供分类浏览功能使用）
    async function loadByCategory(params: { tags?: string; sort?: string; search?: string }) {
        return load({ ...params, page: 1 })
    }

    function reset() {
        list.value = []
        query.value = { search: '', page: 1, limit: 12 }
        pagination.value = { page: 1, limit: 12, total: 0, totalPages: 0 }
        error.value = null
    }

    return { list, pagination, loading, error, query, hasMore, load, loadMore, loadByCategory, reset }
})