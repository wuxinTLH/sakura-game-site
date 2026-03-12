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

http.interceptors.response.use(
    res => res,
    err => {
        const msg = err.response?.data?.message || err.message || '网络错误'
        return Promise.reject(new Error(msg))
    }
)

export interface GamesQuery {
    search?: string
    page?: number
    limit?: number
    tags?: string
}

export const fetchGames = (params: GamesQuery = {}) =>
    http.get<GameListResponse>('/games', { params }).then(r => r.data)

export const fetchGame = (id: number) =>
    http.get<GameDetailResponse>(`/games/${id}`).then(r => r.data)

export const recordPlay = (id: number) =>
    http.post(`/games/${id}/play`).then(r => r.data)

export const createGame = (payload: GameCreatePayload) =>
    http.post('/games', payload).then(r => r.data)

export const updateGame = (id: number, payload: Partial<GameCreatePayload>) =>
    http.put(`/games/${id}`, payload).then(r => r.data)

export const deleteGame = (id: number) =>
    http.delete(`/games/${id}`).then(r => r.data)

// 新增到 api/games.ts 末尾
export const uploadGame = (formData: FormData) =>
    http.post('/upload/game', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)

export const getGames = (params: {
    page?: number
    limit?: number
    search?: string
    tags?: string
    sort?: 'newest' | 'hottest' | 'order'
}) => http.get('/games', { params }).then(r => r.data)

export const publishGame = (payload: {
    name: string; description: string; tags: string; author: string; game_code: string
}) => http.post('/games', payload).then(r => r.data)