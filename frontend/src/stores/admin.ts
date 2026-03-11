// src/stores/admin.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminLogin, adminLogout, getSettings, updateSettings } from '@/api/admin'

export interface SiteSettings {
    editor_enabled: boolean
    upload_enabled: boolean
}

export const useAdminStore = defineStore('admin', () => {
    const token = ref<string | null>(localStorage.getItem('admin_token'))
    const settings = ref<SiteSettings>({ editor_enabled: true, upload_enabled: true })
    const loading = ref(false)

    const isLoggedIn = computed(() => !!token.value)

    // 启动时加载公开配置
    async function loadSettings() {
        try {
            const res = await getSettings()
            settings.value = res.data
        } catch {
            // 网络失败时保持默认开启
        }
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

    return { token, settings, loading, isLoggedIn, loadSettings, login, logout, saveSettings }
})