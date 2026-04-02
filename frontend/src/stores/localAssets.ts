// src/stores/localAssets.ts
// ★ P0 修复：本地资源存储从 localStorage 迁移到 IndexedDB
// 资源文件（图片/音频）以 Base64 Data URI 存储，单文件可达 2MB，必须用 IndexedDB

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { openDB, type IDBPDatabase } from 'idb'

export type LocalAssetType = 'image' | 'audio' | 'json' | 'text' | 'other'

export interface LocalAsset {
    id: string
    name: string
    type: LocalAssetType
    mime: string
    size: number
    data_uri: string
    created_at: string
}

// ── IndexedDB Schema ──────────────────────────────────────────────
interface LocalAssetsDB {
    assets: {
        key: string
        value: LocalAsset
        indexes: { 'by-type': string; 'by-created': string }
    }
}

const DB_NAME = 'sakura-local-assets'
const DB_VERSION = 1
const MAX_FILE_BYTES = 2 * 1024 * 1024   // 单文件 2MB

let _db: IDBPDatabase<LocalAssetsDB> | null = null

async function getDB(): Promise<IDBPDatabase<LocalAssetsDB>> {
    if (_db) return _db
    _db = await openDB<LocalAssetsDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('assets')) {
                const s = db.createObjectStore('assets', { keyPath: 'id' })
                s.createIndex('by-type', 'type')
                s.createIndex('by-created', 'created_at')
            }
        },
    })
    return _db
}

// localStorage 历史数据迁移
async function migrateFromLocalStorage() {
    const LEGACY_KEY = 'sakura_local_assets'
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return
    try {
        const old: LocalAsset[] = JSON.parse(raw)
        if (!Array.isArray(old) || old.length === 0) return
        const db = await getDB()
        const tx = db.transaction('assets', 'readwrite')
        for (const a of old) {
            const existing = await tx.store.get(a.id)
            if (!existing) await tx.store.put(a)
        }
        await tx.done
        localStorage.removeItem(LEGACY_KEY)
        console.log(`[LocalAssets] 已迁移 ${old.length} 个资源到 IndexedDB`)
    } catch (e) {
        console.warn('[LocalAssets] 迁移失败:', e)
    }
}

function mimeToType(mime: string): LocalAssetType {
    if (mime.startsWith('image/')) return 'image'
    if (mime.startsWith('audio/')) return 'audio'
    if (mime === 'application/json') return 'json'
    if (mime.startsWith('text/')) return 'text'
    return 'other'
}

export const useLocalAssetsStore = defineStore('localAssets', () => {
    const assets = ref<LocalAsset[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    const byType = computed(() => {
        const map: Record<LocalAssetType, LocalAsset[]> = { image: [], audio: [], json: [], text: [], other: [] }
        for (const a of assets.value) map[a.type].push(a)
        return map
    })

    async function init() {
        await migrateFromLocalStorage()
        await loadAssets()
    }

    async function loadAssets() {
        loading.value = true
        error.value = null
        try {
            const db = await getDB()
            const all = await db.getAll('assets')
            assets.value = all.sort((a, b) => b.created_at.localeCompare(a.created_at))
        } catch (e: any) {
            error.value = '加载资源失败：' + e.message
        } finally {
            loading.value = false
        }
    }

    async function addAsset(file: File): Promise<LocalAsset | null> {
        if (file.size > MAX_FILE_BYTES) {
            error.value = `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），单文件限 2MB`
            return null
        }
        error.value = null
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = async () => {
                try {
                    const asset: LocalAsset = {
                        id: `la_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                        name: file.name,
                        type: mimeToType(file.type),
                        mime: file.type,
                        size: file.size,
                        data_uri: reader.result as string,
                        created_at: new Date().toISOString(),
                    }
                    const db = await getDB()
                    await db.put('assets', asset)
                    await loadAssets()
                    resolve(asset)
                } catch (e) { reject(e) }
            }
            reader.onerror = () => reject(new Error('文件读取失败'))
            reader.readAsDataURL(file)
        })
    }

    async function removeAsset(id: string) {
        try {
            const db = await getDB()
            await db.delete('assets', id)
            await loadAssets()
        } catch (e: any) {
            error.value = '删除资源失败：' + e.message
        }
    }

    async function clearAll() {
        try {
            const db = await getDB()
            await db.clear('assets')
            assets.value = []
        } catch (e: any) {
            error.value = '清除资源失败：' + e.message
        }
    }

    function getById(id: string): LocalAsset | undefined {
        return assets.value.find(a => a.id === id)
    }

    function getSnippet(asset: LocalAsset): string {
        if (asset.type === 'image') return `<img src="${asset.data_uri}" alt="${asset.name}" />`
        if (asset.type === 'audio') return `<audio src="${asset.data_uri}" controls></audio>`
        if (asset.type === 'json') {
            const b64 = asset.data_uri.split(',')[1]
            const decoded = b64 !== undefined ? (() => { try { return atob(b64) } catch { return '{}' } })() : '{}'
            return `// ${asset.name}\nconst data = ${decoded};`
        }
        return asset.data_uri
    }

    return {
        assets, loading, error, byType,
        init, loadAssets, addAsset, removeAsset, clearAll,
        getById, getSnippet,
    }
})