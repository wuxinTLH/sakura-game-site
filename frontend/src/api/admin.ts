// src/api/admin.ts
import axios from 'axios'

// ── /api/admin/* 的实例（原有，不动）─────────────────────────
const http = axios.create({
    baseURL: '/api/admin',
    timeout: 10000,
})

http.interceptors.request.use(config => {
    const token = localStorage.getItem('admin_token')
    if (token) config.headers['x-admin-token'] = token
    return config
})

http.interceptors.response.use(
    res => res,
    err => {
        const msg = err.response?.data?.message || err.message || '网络错误'
        if (err.response?.status === 401) {
            localStorage.removeItem('admin_token')
        }
        return Promise.reject(new Error(msg))
    }
)

// ── /api/* 的实例（新增，用于发布/上传游戏）─────────────────
// 发布游戏走 POST /api/games，上传走 POST /api/upload/game，
// 两者不在 /api/admin 下，需要单独实例，但同样需要携带 token。
const gameHttp = axios.create({
    baseURL: '/api',
    timeout: 15000,
})

gameHttp.interceptors.request.use(config => {
    const token = localStorage.getItem('admin_token')
    if (token) config.headers['x-admin-token'] = token
    return config
})

gameHttp.interceptors.response.use(
    res => res,
    err => {
        const msg = err.response?.data?.message || err.message || '网络错误'
        if (err.response?.status === 401) {
            localStorage.removeItem('admin_token')
        }
        return Promise.reject(new Error(msg))
    }
)

// ── 原有接口（保持不变）──────────────────────────────────────
export const adminLogin = (password: string) =>
    http.post('/login', { password }).then(r => r.data)

export const adminLogout = () =>
    http.post('/logout').then(r => r.data)

export const getSettings = () =>
    http.get('/settings').then(r => r.data)

export const updateSettings = (settings: Record<string, boolean>) =>
    http.put('/settings', settings).then(r => r.data)

export const adminGetGames = (params: { page?: number; limit?: number; search?: string }) =>
    http.get('/games', { params }).then(r => r.data)

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

// ── 新增：发布 & 上传接口 ─────────────────────────────────────
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

/**
 * 将本地游戏直接发布到后端数据库
 * 对应 POST /api/games（写操作，需管理员 token）
 */
export const publishGame = (payload: PublishGamePayload) =>
    gameHttp.post('/games', payload).then(r => r.data)

/**
 * 上传游戏文件（.html / .vue / .ts）
 * 对应 POST /api/upload/game（需管理员 token）
 *
 * ⚠️ 调用方直接传 FormData，此处不设置 Content-Type，
 *    让浏览器自动生成含 boundary 的 multipart/form-data 头，
 *    否则服务端 multer 无法解析请求体。
 */
export const uploadGameFile = (formData: FormData) =>
    gameHttp.post('/upload/game', formData).then(r => r.data)