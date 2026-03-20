// src/stores/localAssets.ts
// 本地资源管理器 Store
// 所有资源以 Base64 Data URI 形式存储在 localStorage 中，完全离线可用。
// 存储键：sakura_local_assets（JSON 数组 LocalAsset[]）
// 单文件上限：2MB（Base64 后约 2.7MB）
// 本地总容量软上限：20MB（localStorage 实际上限约 5~10MB，保守设置）

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ── 类型 ──────────────────────────────────────────────────────────
export type LocalAssetType = 'image' | 'audio' | 'json' | 'text' | 'other'

export interface LocalAsset {
    id: string        // 本地唯一 ID：`la_${Date.now()}_${random}`
    name: string        // 文件原始名称
    type: LocalAssetType
    mime: string        // MIME 类型
    size: number        // 原始文件字节数
    data_uri: string        // 完整 data URI（data:image/png;base64,...）
    created_at: string        // ISO 时间戳
}

// ── 常量 ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'sakura_local_assets'
const MAX_FILE_BYTES = 2 * 1024 * 1024          // 单文件 2MB
const SOFT_QUOTA = 20 * 1024 * 1024         // 本地总量软上限 20MB

// ── 工具：MIME → 类型分类 ────────────────────────────────────────
function mimeToType(mime: string): LocalAssetType {
    if (mime.startsWith('image/')) return 'image'
    if (mime.startsWith('audio/')) return 'audio'
    if (mime === 'application/json') return 'json'
    if (mime.startsWith('text/')) return 'text'
    return 'other'
}

// ── 工具：读取文件为 Data URI ────────────────────────────────────
function readFileAsDataURI(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('文件读取失败'))
        reader.readAsDataURL(file)
    })
}

// ── Store ────────────────────────────────────────────────────────
export const useLocalAssetsStore = defineStore('localAssets', () => {

    // ── 状态 ────────────────────────────────────────────────────
    const assets = ref<LocalAsset[]>([])

    // ── 派生 ────────────────────────────────────────────────────
    /** 已用字节总量（累计 size 字段，size 是原始字节数） */
    const usedBytes = computed(() =>
        assets.value.reduce((sum, a) => sum + a.size, 0)
    )

    /** data_uri 实际占用（Base64 膨胀约 1.33 倍） */
    const storedBytes = computed(() =>
        assets.value.reduce((sum, a) => sum + a.data_uri.length, 0)
    )

    /** 用量百分比（相对软上限） */
    const usagePct = computed(() =>
        +(storedBytes.value / SOFT_QUOTA * 100).toFixed(1)
    )

    const quota = computed(() => ({
        used: storedBytes.value,
        limit: SOFT_QUOTA,
        pct: usagePct.value,
    }))

    // ── 持久化 ──────────────────────────────────────────────────
    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(assets.value))
        } catch (e) {
            console.warn('[localAssets] localStorage 写入失败（可能已满）', e)
            throw new Error('本地存储已满，请删除部分资源后重试')
        }
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) assets.value = JSON.parse(raw)
        } catch {
            assets.value = []
        }
    }

    // ── 上传文件（读取为 Data URI 后存入 localStorage）───────────
    async function uploadFile(file: File): Promise<LocalAsset> {
        // 1. 文件大小校验
        if (file.size > MAX_FILE_BYTES) {
            throw new Error(`文件超过 2MB 上限（当前 ${(file.size / 1024 / 1024).toFixed(1)} MB）`)
        }

        // 2. MIME 白名单校验
        const ALLOWED_MIME = new Set([
            'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
            'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
            'application/json', 'text/plain', 'text/csv',
        ])
        if (!ALLOWED_MIME.has(file.type)) {
            throw new Error(`不支持的文件类型：${file.type}`)
        }

        // 3. 容量检查
        if (storedBytes.value + file.size * 1.4 > SOFT_QUOTA) {
            throw new Error(`本地资源库已满（上限 ${(SOFT_QUOTA / 1024 / 1024).toFixed(0)} MB），请先删除旧资源`)
        }

        // 4. 读取为 Data URI
        const data_uri = await readFileAsDataURI(file)

        // 5. 构造资源对象
        const asset: LocalAsset = {
            id: `la_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            type: mimeToType(file.type),
            mime: file.type,
            size: file.size,
            data_uri,
            created_at: new Date().toISOString(),
        }

        // 6. 写入
        assets.value.unshift(asset)
        persist()

        return asset
    }

    // ── 删除 ────────────────────────────────────────────────────
    function remove(id: string) {
        assets.value = assets.value.filter(a => a.id !== id)
        persist()
    }

    // ── 按 ID 获取 ──────────────────────────────────────────────
    function getById(id: string): LocalAsset | undefined {
        return assets.value.find(a => a.id === id)
    }

    // ── 按类型筛选 ──────────────────────────────────────────────
    function filterByType(type: LocalAssetType | ''): LocalAsset[] {
        if (!type) return assets.value
        return assets.value.filter(a => a.type === type)
    }

    // ── 清空全部 ────────────────────────────────────────────────
    function clear() {
        assets.value = []
        localStorage.removeItem(STORAGE_KEY)
    }

    // ── 初始化 ──────────────────────────────────────────────────
    load()

    return {
        assets,
        usedBytes,
        storedBytes,
        usagePct,
        quota,
        MAX_FILE_BYTES,
        SOFT_QUOTA,
        uploadFile,
        remove,
        getById,
        filterByType,
        clear,
        load,
    }
})

// ── 单独导出工具函数（供 AssetManager 等组件直接使用）──────────────
export { mimeToType }