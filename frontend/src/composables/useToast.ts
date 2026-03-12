// src/composables/useToast.ts
import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: number
    type: ToastType
    message: string
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
    function show(message: string, type: ToastType = 'info', duration = 3000) {
        const id = ++nextId
        toasts.value.push({ id, type, message })
        setTimeout(() => {
            toasts.value = toasts.value.filter(t => t.id !== id)
        }, duration)
    }

    return {
        toasts,
        success: (msg: string) => show(msg, 'success'),
        error: (msg: string) => show(msg, 'error', 4000),
        warning: (msg: string) => show(msg, 'warning'),
        info: (msg: string) => show(msg, 'info'),
    }
}