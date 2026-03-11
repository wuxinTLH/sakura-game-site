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
        { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
    scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to, _from, next) => {
    const adminStore = useAdminStore()
    const setting = to.meta.requireSetting as keyof typeof adminStore.settings | undefined

    if (setting && !adminStore.settings[setting]) {
        return next('/')
    }
    next()
})

router.afterEach(to => {
    document.title = (to.meta.title as string) || '桜游戏屋'
})

export default router