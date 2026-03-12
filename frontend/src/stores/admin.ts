// src/stores/admin.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    adminLogin, adminLogout, getSettings, updateSettings,
    adminGetGames, adminUpdateGame, adminDeleteGame, adminToggleGame
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



export const useAdminStore = defineStore('admin', () => {
    const token = ref<string | null>(localStorage.getItem('admin_token'))
    const settings = ref<SiteSettings>({ editor_enabled: true, upload_enabled: true })
    const loading = ref(false)
    const games = ref<AdminGame[]>([])
    const gamesPagination = ref({ page: 1, limit: 15, total: 0, totalPages: 0 })

    const isLoggedIn = computed(() => !!token.value)

    async function loadSettings() {
        try {
            const res = await getSettings()
            settings.value = res.data
        } catch { /* 保持默认 */ }
    }

    async function login(password: string) {
        const res = await adminLogin(password)
        token.value = res.data.token
        localStorage.setItem('admin_token', res.data.token)
        return res
    }

    async function logout() {
        try { await adminLogout() } catch { /* ignore */ }
        token.value = null
        localStorage.removeItem('admin_token')
    }

    async function saveSettings(newSettings: Partial<SiteSettings>) {
        loading.value = true
        try {
            await updateSettings(newSettings)
            settings.value = { ...settings.value, ...newSettings }
        } finally {
            loading.value = false
        }
    }

    async function loadGames(params: { page?: number; limit?: number; search?: string } = {}) {
        loading.value = true
        try {
            const res = await adminGetGames(params)
            games.value = res.data.list
            gamesPagination.value = res.data.pagination
        } finally {
            loading.value = false
        }
    }

    async function updateGame(id: number, payload: Record<string, any>) {
        await adminUpdateGame(id, payload)
        const idx = games.value.findIndex(g => g.id === id)
        const game = games.value[idx]
        if (idx !== -1 && game) {
            games.value[idx] = { ...game, ...payload }
        }
    }

    async function deleteGame(id: number) {
        await adminDeleteGame(id)
        games.value = games.value.filter(g => g.id !== id)
        gamesPagination.value.total--
    }

    async function toggleGame(id: number) {
        const res = await adminToggleGame(id)
        const idx = games.value.findIndex(g => g.id === id)
        const game = games.value[idx]
        if (idx !== -1 && game) {
            game.is_active = res.data.is_active
        }
    }

    return {
        token, settings, loading, games, gamesPagination, isLoggedIn,
        loadSettings, login, logout, saveSettings,
        loadGames, updateGame, deleteGame, toggleGame,
    }

})
