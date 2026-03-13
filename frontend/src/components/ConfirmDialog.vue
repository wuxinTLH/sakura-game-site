<template>
    <Teleport to="body">
        <Transition name="confirm-fade">
            <div v-if="visible" class="confirm-mask" @click.self="_cancel">
                <div class="confirm-box" role="dialog" aria-modal="true">
                    <h3 class="confirm-title">{{ options.title }}</h3>
                    <p class="confirm-body" v-if="options.body">{{ options.body }}</p>
                    <div class="confirm-btns">
                        <button class="confirm-btn cancel" @click="_cancel">
                            {{ options.cancelText ?? '取消' }}
                        </button>
                        <button class="confirm-btn ok" :class="{ danger: options.danger }" @click="_ok">
                            {{ options.okText ?? '确认' }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
const { visible, options, _ok, _cancel } = useConfirm()
</script>

<style scoped>
.confirm-mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9000;
    padding: 20px;
}

.confirm-box {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #e8e8e8);
    border-radius: 14px;
    padding: 28px 24px 20px;
    width: min(380px, 100%);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.confirm-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--ink-900, #1a1a1a);
    margin-bottom: 8px;
}

.confirm-body {
    font-size: 0.875rem;
    color: var(--ink-400, #888);
    line-height: 1.6;
    margin-bottom: 20px;
}

.confirm-btns {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

.confirm-btn {
    padding: 8px 22px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    border: 1.5px solid transparent;
}

.confirm-btn.cancel {
    background: var(--bg, #f5f5f5);
    border-color: var(--border, #e0e0e0);
    color: var(--ink-600, #555);
}

.confirm-btn.cancel:hover {
    border-color: var(--ink-400, #aaa);
}

.confirm-btn.ok {
    background: var(--sakura-500, #e8537a);
    color: #fff;
    border-color: var(--sakura-500, #e8537a);
}

.confirm-btn.ok:hover {
    filter: brightness(1.1);
}

.confirm-btn.ok.danger {
    background: #e74c3c;
    border-color: #e74c3c;
}

/* 动画 */
.confirm-fade-enter-active {
    transition: all 0.2s ease;
}

.confirm-fade-leave-active {
    transition: all 0.15s ease;
}

.confirm-fade-enter-from {
    opacity: 0;
}

.confirm-fade-leave-to {
    opacity: 0;
}

.confirm-fade-enter-from .confirm-box {
    transform: scale(0.94) translateY(-8px);
}

.confirm-fade-leave-to .confirm-box {
    transform: scale(0.96);
}
</style>
