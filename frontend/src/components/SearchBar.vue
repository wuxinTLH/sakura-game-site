<template>
    <div class="search-wrap">
        <div class="search-box" :class="{ focused }">
            <span class="search-icon">🔍</span>
            <input ref="inputRef" v-model="localValue" type="search" class="search-input" :placeholder="placeholder"
                @focus="focused = true" @blur="focused = false" @input="onInput" @keydown.enter="onEnter"
                @keydown.escape="clear" />
            <button v-if="localValue" class="clear-btn" @click="clear" aria-label="清除">✕</button>
        </div>

        <!-- 快速标签 -->
        <div class="tag-shortcuts" v-if="tags.length">
            <button v-for="tag in tags" :key="tag" class="tag-btn" :class="{ active: activeTag === tag }"
                @click="selectTag(tag)">{{ tag }}</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
    modelValue?: string
    placeholder?: string
    tags?: string[]
    debounce?: number
}>(), {
    modelValue: '',
    placeholder: '搜索游戏名称、介绍、标签…',
    tags: () => ['益智', '经典', '休闲', '策略', '数字', '动作'],
    debounce: 350,
})

const emit = defineEmits<{
    (e: 'update:modelValue', v: string): void
    (e: 'search', v: string): void
    (e: 'tag', v: string): void
}>()

const localValue = ref(props.modelValue)
const focused = ref(false)
const activeTag = ref('')
const inputRef = ref<HTMLInputElement>()

let timer: ReturnType<typeof setTimeout>

watch(() => props.modelValue, v => { localValue.value = v })

function onInput() {
    activeTag.value = ''
    clearTimeout(timer)
    timer = setTimeout(() => {
        emit('update:modelValue', localValue.value)
        emit('search', localValue.value)
    }, props.debounce)
}

function onEnter() {
    clearTimeout(timer)
    emit('update:modelValue', localValue.value)
    emit('search', localValue.value)
}

function clear() {
    localValue.value = ''
    activeTag.value = ''
    emit('update:modelValue', '')
    emit('search', '')
    inputRef.value?.focus()
}

function selectTag(tag: string) {
    if (activeTag.value === tag) {
        activeTag.value = ''
        localValue.value = ''
        emit('tag', '')
        emit('search', '')
    } else {
        activeTag.value = tag
        localValue.value = ''
        emit('tag', tag)
    }
}
</script>

<style scoped>
.search-wrap {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* 搜索框 */
.search-box {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 50px;
    padding: 10px 18px;
    transition: border-color var(--transition), box-shadow var(--transition);
}

.search-box.focused {
    border-color: var(--sakura-400);
    box-shadow: 0 0 0 4px rgba(232, 99, 142, 0.12);
}

.search-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
}

.search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 1rem;
    font-family: var(--font-body);
    color: var(--ink-900);
}

.search-input::placeholder {
    color: var(--ink-200);
}

.search-input::-webkit-search-cancel-button {
    display: none;
}

.clear-btn {
    background: none;
    color: var(--ink-200);
    font-size: 0.85rem;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition);
    flex-shrink: 0;
}

.clear-btn:hover {
    background: var(--sakura-100);
    color: var(--sakura-600);
}

/* 标签快捷 */
.tag-shortcuts {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.tag-btn {
    padding: 4px 14px;
    border-radius: 20px;
    border: 1.5px solid var(--border);
    background: var(--surface);
    color: var(--ink-400);
    font-size: 0.8rem;
    font-weight: 500;
    transition: all var(--transition);
    font-family: var(--font-body);
}

.tag-btn:hover {
    border-color: var(--sakura-300);
    color: var(--sakura-500);
}

.tag-btn.active {
    background: var(--sakura-500);
    border-color: var(--sakura-500);
    color: #fff;
}
</style>