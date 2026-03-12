<template>
    <div class="toast-container">
        <transition-group name="toast">
            <div v-for="t in toasts" :key="t.id" class="toast-item" :class="`toast-${t.type}`" @click="remove(t.id)">
                <span class="toast-icon">{{ icons[t.type] }}</span>
                <span class="toast-msg">{{ t.message }}</span>
            </div>
        </transition-group>
    </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts } = useToast()

const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }

function remove(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
}
</script>

<style scoped>
.toast-container {
    position: fixed;
    bottom: 28px;
    right: 24px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
}

.toast-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 18px;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 500;
    box-shadow: 0 4px 20px #0004;
    cursor: pointer;
    pointer-events: auto;
    max-width: 360px;
    backdrop-filter: blur(8px);
}

.toast-success {
    background: #1a3a2a;
    color: #4af476;
    border: 1px solid #2a6a4a;
}

.toast-error {
    background: #3a1a1a;
    color: #ff7070;
    border: 1px solid #6a2a2a;
}

.toast-warning {
    background: #3a2e0a;
    color: #ffc84a;
    border: 1px solid #6a5a1a;
}

.toast-info {
    background: #1a1a3a;
    color: #70b0ff;
    border: 1px solid #2a2a6a;
}

.toast-icon {
    font-size: 1rem;
    flex-shrink: 0;
}

.toast-msg {
    flex: 1;
    line-height: 1.4;
}

/* 动画 */
.toast-enter-active {
    transition: all 0.28s ease;
}

.toast-leave-active {
    transition: all 0.22s ease;
}

.toast-enter-from {
    opacity: 0;
    transform: translateX(30px);
}

.toast-leave-to {
    opacity: 0;
    transform: translateX(30px);
}
</style>