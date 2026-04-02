// src/api/admin.ts
// ★ P0 修复：Token 过期（401）时弹出友好提示并跳转登录页，不再静默失败
import axios, { type AxiosInstance } from 'axios'

// ── 创建带 token 的 axios 实例 ─────────────────────────────────────
function createAuthHttp(baseURL: string, timeout = 10000): AxiosInstance {
    const instance = axios.create({ baseURL, timeout })

    // 请求拦截：动态注入最新 token
    instance.interceptors.request.use(config => {
        const token = localStorage.getItem('admin_token')
        if (token) config.headers['x-admin-token'] = token
        return config
    })

    // 响应拦截：统一处理错误，特别处理 401
    instance.interceptors.response.use(
        res => res,
        err => {
            const msg = err.response?.data?.message || err.message || '网络错误'
            if (err.response?.status === 401) {
                // ★ P0 修复：Token 失效时清除本地状态 + 用户友好提示
                localStorage.removeItem('admin_token')
                // 派发自定义事件，让 App.vue 展示提示并跳转
                window.dispatchEvent(new CustomEvent('sakura:token-expired', {
                    detail: { redirect: window.location.pathname }
                }))
            }
            return Promise.reject(new Error(msg))
        }
    )

    return instance
}

// /api/admin/* 的实例
const http = createAuthHttp('/api/admin')

// /api/* 的实例（发布/上传游戏用）
const gameHttp = createAuthHttp('/api', 15000)

// ── 接口定义 ──────────────────────────────────────────────────────
export const adminLogin = (password: string) =>
    http.post('/login', { password }).then(r => r.data)

export const adminLogout = () =>
    http.post('/logout').then(r => r.data)

export const getSettings = () =>
    http.get('/settings').then(r => r.data)

export const updateSettings = (settings: Record<string, boolean>) =>
    http.put('/settings', settings).then(r => r.data)

export const adminGetGames = (params: {
    page?: number; limit?: number; search?: string
    status?: string; sort?: string
}) => http.get('/games', { params }).then(r => r.data)

export const adminUpdateGame = (id: number, payload: Record<string, any>) =>
    http.put(`/games/${id}`, payload).then(r => r.data)

export const adminDeleteGame = (id: number) =>
    http.delete(`/games/${id}`).then(r => r.data)

export const adminToggleGame = (id: number) =>
    http.put(`/games/${id}/toggle`).then(r => r.data)

export const getApiList = () =>
    http.get('/api-list').then(r => r.data)

export const getAdminStats = () =>
    http.get('/stats').then(r => r.data)

export interface PublishGamePayload {
    name: string
    description?: string
    game_code: string
    game_type?: string
    tags?: string
    author?: string
    sort_order?: number
    image_url?: string
}

export const publishGame = (payload: PublishGamePayload) =>
    gameHttp.post('/games', payload).then(r => r.data)

export const uploadGameFile = (formData: FormData) =>
    gameHttp.post('/upload/game', formData).then(r => r.data)