// src/api/assets.ts
// 资源管理器接口

import axios from 'axios'

// ── 带 token 的实例（增删需鉴权）─────────────────────────────
const authHttp = axios.create({ baseURL: '/api', timeout: 30000 })
authHttp.interceptors.request.use(cfg => {
    const token = localStorage.getItem('admin_token')
    if (token) cfg.headers['x-admin-token'] = token
    return cfg
})
authHttp.interceptors.response.use(
    r => r,
    err => {
        const msg = err.response?.data?.message || err.message || '网络错误'
        if (err.response?.status === 401) localStorage.removeItem('admin_token')
        return Promise.reject(new Error(msg))
    }
)

// ── 公共只读实例 ──────────────────────────────────────────────
const http = axios.create({ baseURL: '/api', timeout: 15000 })
http.interceptors.response.use(r => r, err => {
    return Promise.reject(new Error(err.response?.data?.message || err.message))
})

// ── 类型 ──────────────────────────────────────────────────────
export type AssetType = 'image' | 'audio' | 'json' | 'text' | 'other'

export interface Asset {
    id: number
    name: string
    type: AssetType
    mime: string
    size: number
    game_id: number | null
    created_at: string
    data_uri?: string   // 仅详情接口返回
}

export interface AssetQuota {
    used: number   // 已用字节
    limit: number   // 上限字节
    pct: number   // 百分比 0~100
}

// ── 接口函数 ──────────────────────────────────────────────────

/** 全站资源用量 */
export const getAssetQuota = (): Promise<AssetQuota> =>
    http.get('/assets/quota').then(r => r.data)

/** 获取某游戏可用资源（含公共资源） */
export const getGameAssets = (gameId: number): Promise<{ list: Asset[] }> =>
    http.get(`/assets/game/${gameId}`).then(r => r.data)

/** 资源列表（分页） */
export const listAssets = (params?: {
    game_id?: number
    type?: AssetType
    page?: number
    limit?: number
}): Promise<{ total: number; page: number; list: Asset[] }> =>
    http.get('/assets', { params }).then(r => r.data)

/** 获取单个资源（含 data_uri） */
export const getAsset = (id: number): Promise<Asset> =>
    http.get(`/assets/${id}`).then(r => r.data)

/** 上传资源文件（需鉴权） */
export const uploadAsset = (
    file: File,
    gameId?: number | null
): Promise<Asset> => {
    const form = new FormData()
    form.append('file', file)
    form.append('game_id', gameId != null ? String(gameId) : 'null')
    return authHttp.post('/assets', form).then(r => r.data)
}

/** 删除资源（需鉴权） */
export const deleteAsset = (id: number): Promise<{ message: string }> =>
    authHttp.delete(`/assets/${id}`).then(r => r.data)

// ── 工具函数 ──────────────────────────────────────────────────

/** 格式化文件大小 */
export function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 资源类型图标 */
export function assetIcon(type: AssetType): string {
    const map: Record<AssetType, string> = {
        image: '🖼️',
        audio: '🎵',
        json: '📋',
        text: '📄',
        other: '📦',
    }
    return map[type] ?? '📦'
}

/** 生成可嵌入 HTML 的引用代码片段 */
export function assetSnippet(asset: Asset): string {
    if (!asset.data_uri) return `/* 请先获取资源详情 */`
    switch (asset.type) {
        case 'image':
            return `<img src="${asset.data_uri}" alt="${asset.name}" />`
        case 'audio':
            return `<audio src="${asset.data_uri}" controls></audio>`
        case 'json':
        case 'text':
            return `/* 通过 fetch('GET /api/assets/${asset.id}') 获取 data_uri 后解析 */`
        default:
            return asset.data_uri
    }
}