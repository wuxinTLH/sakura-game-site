// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAdminStore } from '@/stores/admin'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: () => import('@/views/HomeView.vue'),
            meta: { title: '桜游戏屋' },
        },
        {
            path: '/game/:id',
            name: 'game',
            component: () => import('@/views/GameView.vue'),
            meta: { title: '加载中...' },
        },
        {
            path: '/editor',
            name: 'editor',
            component: () => import('@/views/EditorView.vue'),
            meta: { title: '游戏编辑器 - 桜游戏屋', requireSetting: 'editor_enabled' },
        },
        {
            path: '/local',
            name: 'local',
            component: () => import('@/views/LocalGamesView.vue'),
            meta: { title: '本地游戏 - 桜游戏屋' },
        },
        {
            path: '/add',
            name: 'add',
            component: () => import('@/views/AddGameView.vue'),
            meta: { title: '上传游戏 - 桜游戏屋', requireSetting: 'upload_enabled' },
        },
        {
            path: '/admin',
            name: 'admin',
            component: () => import('@/views/AdminView.vue'),
            meta: { title: '站点管理 - 桜游戏屋' },
        },
        {
            path: '/online-games',
            name: 'online-games',
            component: () => import('@/views/OnlineGamesView.vue'),
            meta: { title: '在线游戏管理 · 桜', requiresAdmin: true },
        },
        {
            path: '/admin/assets',
            name: 'admin-assets',
            component: () => import('@/views/AdminAssetsView.vue'),
            meta: { title: '素材管理 · 桜', requiresAdmin: true },
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'not-found',
            component: () => import('@/views/NotFoundView.vue'),
            meta: { title: '页面未找到 · 桜游戏屋' },
        },
    ],
    scrollBehavior(_to, _from, savedPosition) {
        if (savedPosition) return savedPosition
        return { top: 0, behavior: 'smooth' }
    },
})

router.beforeEach((to, _from, next) => {
    if (to.meta?.title) {
        document.title = to.meta.title as string
    }

    if (to.meta?.requiresAdmin) {
        const token = localStorage.getItem('admin_token')
        if (!token) {
            next({ name: 'admin', query: { redirect: to.fullPath } })
            return
        }
    }
    const settingKey = to.meta?.requireSetting as string | undefined
    if (settingKey) {
        const adminStore = useAdminStore()
        const enabled = adminStore.settings[settingKey as keyof typeof adminStore.settings]
        if (!enabled) {
            next({ name: 'home' })
            return
        }
    }

    next()
})

router.afterEach(to => {
    document.title = (to.meta.title as string) || '桜游戏屋'
})

export default router