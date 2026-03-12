// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

// ── Vue 组件内部错误（渲染/生命周期/侦听器） ─────────────────────
app.config.errorHandler = (err, _instance, info) => {
    console.error('[Vue Error]', err)
    console.error('[Vue Error] 触发钩子:', info)
    // 生产环境可在此接入 Sentry / 自有日志服务：
    // if (import.meta.env.PROD) reportError({ err, info })
}

// ── Vue 警告（仅开发环境） ────────────────────────────────────────
app.config.warnHandler = (msg, _instance, trace) => {
    if (import.meta.env.DEV) {
        console.warn('[Vue Warn]', msg, '\n', trace)
    }
}

app.use(pinia)
app.use(router)
app.mount('#app')

// ── 未被 .catch() 捕获的 Promise 异常 ────────────────────────────
window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Rejection]', event.reason)
    // 阻止浏览器默认的 "Uncaught (in promise)" 报错
    event.preventDefault()
})

// ── 全局 JS 运行时错误 ────────────────────────────────────────────
window.addEventListener('error', (event) => {
    // 过滤掉资源加载错误（img/script src 404 等）
    if (event.target && (event.target as HTMLElement).tagName) return
    console.error('[Global Error]', event.message, `${event.filename}:${event.lineno}`)
})

// ── mount 之后再调用 store（pinia 已激活） ────────────────────────
import { useAdminStore } from '@/stores/admin'
const adminStore = useAdminStore()
adminStore.loadSettings()