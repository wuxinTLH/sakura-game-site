<template>
    <slot v-if="!hasError" />
    <div class="error-boundary" v-else>
        <div class="error-boundary-inner">
            <div class="eb-icon">💥</div>
            <h3>页面模块加载出错</h3>
            <p>{{ errorMessage }}</p>
            <button class="eb-btn" @click="reset">🔄 重试</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const hasError = ref(false)
const errorMessage = ref('')

onErrorCaptured((err) => {
    hasError.value = true
    errorMessage.value = err instanceof Error ? err.message : String(err)
    console.error('[ErrorBoundary]', err)
    return false   // 阻止错误继续向上传播
})

function reset() {
    hasError.value = false
    errorMessage.value = ''
}
</script>

<style scoped>
.error-boundary {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
}

.error-boundary-inner {
    text-align: center;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 32px;
    max-width: 400px;
    box-shadow: var(--shadow);
}

.eb-icon {
    font-size: 2.5rem;
    margin-bottom: 12px;
}

.error-boundary-inner h3 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--ink-900);
    margin-bottom: 8px;
}

.error-boundary-inner p {
    font-size: 0.82rem;
    color: var(--ink-400);
    margin-bottom: 16px;
}

.eb-btn {
    padding: 8px 22px;
    border-radius: 8px;
    font-size: 0.85rem;
    background: var(--sakura-500);
    color: #fff;
    font-weight: 600;
    cursor: pointer;
}
</style>