// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

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
        { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
    scrollBehavior: () => ({ top: 0 }),
})

router.afterEach(to => {
    document.title = (to.meta.title as string) || '桜游戏屋'
})

export default router