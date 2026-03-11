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