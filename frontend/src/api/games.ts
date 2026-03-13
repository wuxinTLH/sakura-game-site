// src/api/games.ts
import axios from 'axios'
import type {
    GameListResponse,
    GameDetailResponse,
    GameCreatePayload,
} from '@/types/game'

const http = axios.create({
    baseURL: '/api',
    timeout: 15000,
})

// ── 公共接口的响应拦截器（只处理错误信息）────────────────────────
http.interceptors.response.use(
    res => res,
    err => {
        const msg = err.response?.data?.message || err.message || '网络错误'
        return Promise.reject(new Error(msg))
    }
)

// ── 需要管理员 token 的实例（发布/上传走这里）───────────────────
// 与公共 http 实例分开，避免所有请求都带上 token 头。
// 不从 admin.ts 导入 http 是为了避免循环依赖。
const authHttp = axios.create({
    baseURL: '/api',
    timeout: 15000,
})

authHttp.interceptors.request.use(config => {
    // 每次请求时动态读取，确保登录后写入的 token 立即生效
    const token = localStorage.getItem('admin_token')
    if (token) config.headers['x-admin-token'] = token
    return config
})

authHttp.interceptors.response.use(
    res => res,
    err => {
        const msg = err.response?.data?.message || err.message || '网络错误'
        if (err.response?.status === 401) {
            localStorage.removeItem('admin_token')
        }
        return Promise.reject(new Error(msg))
    }
)

// ── 类型 ─────────────────────────────────────────────────────────
export interface GamesQuery {
    search?: string
    page?: number
    limit?: number
    tags?: string
}

// ── 公共接口（无需 token）────────────────────────────────────────

export const fetchGames = (params: GamesQuery = {}) =>
    http.get<GameListResponse>('/games', { params }).then(r => r.data)

export const fetchGame = (id: number) =>
    http.get<GameDetailResponse>(`/games/${id}`).then(r => r.data)

export const recordPlay = (id: number) =>
    http.post(`/games/${id}/play`).then(r => r.data)

export const getGames = (params: {
    page?: number
    limit?: number
    search?: string
    tags?: string
    sort?: 'newest' | 'hottest' | 'order'
}) => http.get('/games', { params }).then(r => r.data)

// ── 需要管理员 token 的接口（改用 authHttp）─────────────────────

export const createGame = (payload: GameCreatePayload) =>
    authHttp.post('/games', payload).then(r => r.data)

export const updateGame = (id: number, payload: Partial<GameCreatePayload>) =>
    authHttp.put(`/games/${id}`, payload).then(r => r.data)

export const deleteGame = (id: number) =>
    authHttp.delete(`/games/${id}`).then(r => r.data)

/**
 * 发布游戏（POST /api/games）
 *
 * 修复：改用 authHttp，每次请求动态读取 admin_token 并写入请求头，
 * 原来用 http 实例没有 token 拦截器，导致 401 未授权。
 */
export const publishGame = (payload: {
    name: string
    description: string
    tags: string
    author: string
    game_code: string
    game_type?: string
    image_url?: string
    sort_order?: number
}) => authHttp.post('/games', payload).then(r => r.data)

/**
 * 上传游戏文件（POST /api/upload/game）
 *
 * 修复1：改用 authHttp，携带 admin_token。
 * 修复2：删除手动设置的 Content-Type: multipart/form-data。
 *        手动设置会导致 boundary 缺失，服务端 multer 无法解析请求体。
 *        axios 检测到 FormData 后会自动设置正确的含 boundary 的头。
 */
export const uploadGame = (formData: FormData) =>
    authHttp.post('/upload/game', formData).then(r => r.data)