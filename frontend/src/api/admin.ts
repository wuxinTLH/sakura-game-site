// src/api/admin.ts
import axios from 'axios'

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