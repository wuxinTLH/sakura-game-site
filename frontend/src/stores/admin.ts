// src/stores/admin.ts
// ★ P1 修复：所有 store actions 加 try/catch + error 状态（统一错误边界）
// ★ 修复：updateGame 类型错误（spread 合并后保证所有字段非 undefined）
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    adminLogin, adminLogout, getSettings, updateSettings,
    adminGetGames, adminUpdateGame, adminDeleteGame, adminToggleGame, getAdminStats
} from '@/api/admin'

export interface SiteSettings {
    editor_enabled: boolean
    upload_enabled: boolean
}

export interface AdminGame {
    id: number
    name: string
    description: string
    tags: string
    author: string
    play_count: number
    sort_order: number
    is_active: number
    created_at: string
    updated_at: string
}

// ★ 修复：AdminStats 增加 trend / tagDist 可选字段，与后端返回保持一致
interface AdminStats {
    total: number
    active: number
    inactive: number
    totalPlays: number
    topGames: { id: number; name: string; play_count: number; author: string; tags?: string }[]
    recentGames: { id: number; name: string; created_at: string; author: string }[]
    trend?: { date: string; count: number }[]
    tagDist?: { tag: string; count: number }[]
}

export const useAdminStore = defineStore('admin', () => {
    const token = ref<string | null>(localStorage.getItem('admin_token'))
    const settings = ref<SiteSettings>({ editor_enabled: true, upload_enabled: true })
    const loading = ref(false)
    const error = ref<string | null>(null)
    const games = ref<AdminGame[]>([])
    const gamesPagination = ref({ page: 1, limit: 15, total: 0, totalPages: 0 })
    const stats = ref<AdminStats | null>(null)

    const isLoggedIn = computed(() => !!token.value)

    async function loadSettings() {
        error.value = null
        try {
            const res = await getSettings()
            settings.value = res.data
        } catch (e: any) {
            console.warn('[AdminStore] loadSettings 失败，使用默认配置:', e.message)
        }
    }

    async function login(password: string) {
        loading.value = true
        error.value = null
        try {
            const res = await adminLogin(password)
            token.value = res.data.token
            localStorage.setItem('admin_token', res.data.token)
            return res
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    async function logout() {
        try { await adminLogout() } catch { /* ignore */ }
        token.value = null
        localStorage.removeItem('admin_token')
        error.value = null
    }

    async function saveSettings(newSettings: Partial<SiteSettings>) {
        loading.value = true
        error.value = null
        try {
            await updateSettings(newSettings)
            settings.value = { ...settings.value, ...newSettings }
        } catch (e: any) {
            error.value = '保存配置失败：' + e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    async function loadGames(params: { page?: number; limit?: number; search?: string } = {}) {
        loading.value = true
        error.value = null
        try {
            const res = await adminGetGames(params)
            games.value = res.data.list
            gamesPagination.value = res.data.pagination
        } catch (e: any) {
            error.value = '加载游戏列表失败：' + e.message
        } finally {
            loading.value = false
        }
    }

    async function updateGame(id: number, payload: Record<string, any>) {
        error.value = null
        try {
            await adminUpdateGame(id, payload)
            const idx = games.value.findIndex(g => g.id === id)
            if (idx !== -1) {
                // ★ 修复：用 Object.assign 原地更新，避免 spread 产生 undefined 字段
                // payload 中只含部分字段（name/tags/author 等），合并后需保证 AdminGame 全字段存在
                const existing = games.value[idx]
                if (existing) {
                    Object.assign(existing, payload)
                }
            }
        } catch (e: any) {
            error.value = '更新游戏失败：' + e.message
            throw e
        }
    }

    async function deleteGame(id: number) {
        error.value = null
        try {
            await adminDeleteGame(id)
            games.value = games.value.filter(g => g.id !== id)
            gamesPagination.value.total--
        } catch (e: any) {
            error.value = '删除游戏失败：' + e.message
            throw e
        }
    }

    async function toggleGame(id: number) {
        error.value = null
        try {
            const res = await adminToggleGame(id)
            const game = games.value.find(g => g.id === id)
            if (game) {
                game.is_active = res.data.is_active
            }
        } catch (e: any) {
            error.value = '切换状态失败：' + e.message
            throw e
        }
    }

    async function loadStats() {
        error.value = null
        try {
            const res = await getAdminStats()
            stats.value = res.data
        } catch (e: any) {
            error.value = '加载统计失败：' + e.message
        }
    }

    return {
        token, settings, loading, error,
        games, gamesPagination, isLoggedIn, stats,
        loadSettings, login, logout, saveSettings,
        loadGames, updateGame, deleteGame, toggleGame, loadStats,
    }
})