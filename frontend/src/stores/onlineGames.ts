// src/stores/onlineGames.ts
// 在线游戏管理 Store（管理后台专用，区别于前台展示的 games.ts）
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminGetGames } from '@/api/admin'

export interface OnlineGame {
    id: number
    name: string
    description: string
    image_url: string
    game_code: string
    game_type: string
    tags: string
    author: string
    play_count: number
    is_active: number   // 1=上架 0=下架
    sort_order: number
    created_at: string
    updated_at: string
}

export interface FetchParams {
    page?: number
    limit?: number
    search?: string
    status?: 'active' | 'inactive'
    sort?: 'newest' | 'hottest' | 'order'
}

export const useOnlineGamesStore = defineStore('onlineGames', () => {
    const games = ref<OnlineGame[]>([])
    const loading = ref(false)
    const total = ref(0)
    const pagination = ref({ page: 1, pages: 1 })

    // 修复(问题8)：原版从当前页数据过滤，翻页后数字会变，改为后端全量统计
    const activeTotal   = ref(0)
    const inactiveTotal = ref(0)
    const activeCount   = computed(() => activeTotal.value)
    const inactiveCount = computed(() => inactiveTotal.value)

    async function fetchGames(params: FetchParams = {}) {
        loading.value = true
        try {
            // adminGetGames 对应 GET /api/admin/games
            // 后端支持 status 参数：active | inactive | 不传=全部
            const res = await adminGetGames({
                page: params.page ?? 1,
                limit: params.limit ?? 20,
                search: params.search,
                // 将前端的 status/sort 参数透传
                ...(params.status ? { status: params.status } : {}),
                ...(params.sort ? { sort: params.sort } : {}),
            })
            // 兼容两种后端返回结构：
            //   { data: { list, total, page, pages } }
            //   { list, total, page, pages }
            const data = res?.data ?? res
            games.value = data.list ?? []
            total.value = data.total ?? 0
            pagination.value = {
                page: data.page ?? 1,
                pages: data.pages ?? 1,
            }
        } finally {
            loading.value = false
        }
    }

    async function fetchTotals() {
        try {
            const [resA, resI] = await Promise.all([
                adminGetGames({ page: 1, limit: 1, search: 'active'   }),
                adminGetGames({ page: 1, limit: 1, search: 'inactive' }),
            ])
            const da = resA?.data ?? resA
            const di = resI?.data ?? resI
            activeTotal.value   = da.total ?? 0
            inactiveTotal.value = di.total ?? 0
        } catch { /* 静默失败 */ }
    }

    return {
        games, loading, total, pagination,
        activeCount, inactiveCount,
        fetchGames, fetchTotals,
    }
})