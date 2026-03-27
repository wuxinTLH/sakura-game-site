// src/api/tags.ts
// GET /api/tags — 获取所有标签枚举（末尾含「其他」）
// 复用与 games.ts 一致的 baseURL: '/api'，无需额外 axios 实例

import axios from 'axios'

const http = axios.create({
    baseURL: '/api',
    timeout: 10000,
})

http.interceptors.response.use(
    res => res,
    err => {
        const msg = err.response?.data?.message || err.message || '网络错误'
        return Promise.reject(new Error(msg))
    }
)

/** 获取所有标签枚举列表，末尾含「其他」 */
export async function fetchTags(): Promise<string[]> {
    const res = await http.get<{ success: boolean; data: string[] }>('/tags')
    return res.data.data ?? []
}