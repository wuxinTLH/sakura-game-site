// src/stores/games.ts
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
        if (params) query.value = { ...query.value, ...params }
        loading.value = true
        error.value = null
        try {
            const res = await fetchGames(query.value)
            list.value = res.data.list
            pagination.value = res.data.pagination
        } catch (e: any) {
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    async function loadMore() {
        if (!hasMore.value || loading.value) return
        query.value.page = (query.value.page || 1) + 1
        loading.value = true
        try {
            const res = await fetchGames(query.value)
            list.value.push(...res.data.list)
            pagination.value = res.data.pagination
        } catch (e: any) {
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    function reset() {
        list.value = []
        query.value = { search: '', page: 1, limit: 12 }
        pagination.value = { page: 1, limit: 12, total: 0, totalPages: 0 }
    }

    return { list, pagination, loading, error, query, hasMore, load, loadMore, reset }
})