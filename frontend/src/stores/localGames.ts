// src/stores/localGames.ts
// ★ P0 修复：localStorage → IndexedDB（彻底解决 5MB 上限问题）
// ★ P1 修复：所有 action 加 try/catch + error 状态（统一错误边界）
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { publishGame, uploadGameFile } from '@/api/admin'
import { openDB, type IDBPDatabase } from 'idb'

// ── 类型 ──────────────────────────────────────────────────────────
export interface LocalGame {
    id: string
    name: string
    description: string
    tags: string
    author: string
    code: string
    image_url?: string
    createdAt: string
    updatedAt: string
}

export interface GameSave {
    slot: number
    label: string
    data: Record<string, unknown>
    screenshot?: string
    savedAt: string
    playtime?: number
}

export interface GameProgress {
    highScore: number
    level: number | string
    completed: boolean
    playCount: number
    totalPlaytime: number
    lastPlayedAt: string
    extra?: Record<string, unknown>
}

// ── IndexedDB Schema ──────────────────────────────────────────────
interface SakuraDBSchema {
    localGames: {
        key: string
        value: LocalGame
        indexes: { 'by-updatedAt': string }
    }
    editorDraft: {
        key: string
        value: { id: string; code: string; editingId: string; savedAt: string }
    }
    gameSaves: {
        key: string
        value: { key: string; gameId: string; slot: number } & GameSave
        indexes: { 'by-gameId': string }
    }
    gameProgress: {
        key: string
        value: { gameId: string } & GameProgress
    }
}

const DB_NAME = 'sakura-local-db'
const DB_VERSION = 1

let _db: IDBPDatabase<SakuraDBSchema> | null = null

async function getDB(): Promise<IDBPDatabase<SakuraDBSchema>> {
    if (_db) return _db
    _db = await openDB<SakuraDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('localGames')) {
                const gs = db.createObjectStore('localGames', { keyPath: 'id' })
                gs.createIndex('by-updatedAt', 'updatedAt')
            }
            if (!db.objectStoreNames.contains('editorDraft')) {
                db.createObjectStore('editorDraft', { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains('gameSaves')) {
                const ss = db.createObjectStore('gameSaves', { keyPath: 'key' })
                ss.createIndex('by-gameId', 'gameId')
            }
            if (!db.objectStoreNames.contains('gameProgress')) {
                db.createObjectStore('gameProgress', { keyPath: 'gameId' })
            }
        },
    })
    return _db
}

// ── localStorage 历史数据迁移（一次性）────────────────────────────
async function migrateFromLocalStorage() {
    const LEGACY_KEY = 'sakura_local_games'
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return
    try {
        const games: LocalGame[] = JSON.parse(raw)
        if (!Array.isArray(games) || games.length === 0) return
        const db = await getDB()
        const tx = db.transaction('localGames', 'readwrite')
        for (const g of games) {
            const existing = await tx.store.get(g.id)
            if (!existing) await tx.store.put(g)
        }
        await tx.done
        localStorage.removeItem(LEGACY_KEY)
        // 同时清除旧草稿 key
        localStorage.removeItem('sakura_editor_draft')
        console.log(`[LocalGames] 已迁移 ${games.length} 个游戏到 IndexedDB`)
    } catch (e) {
        console.warn('[LocalGames] localStorage 迁移失败:', e)
    }
}

const MAX_SLOTS = 10

// ── Store ─────────────────────────────────────────────────────────
export const useLocalGamesStore = defineStore('localGames', () => {
    // 列表只保存元数据（不含 code），减少内存占用
    const list = ref<Omit<LocalGame, 'code'>[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const count = computed(() => list.value.length)

    // ── 初始化（App.vue onMounted 时调用一次）─────────────────────
    async function init() {
        await migrateFromLocalStorage()
        await loadList()
    }

    // ── 加载列表元数据（不含 code）────────────────────────────────
    async function loadList() {
        loading.value = true
        error.value = null
        try {
            const db = await getDB()
            const all = await db.getAllFromIndex('localGames', 'by-updatedAt')
            list.value = all.reverse().map(({ code: _, ...meta }) => meta)
        } catch (e: any) {
            error.value = '加载本地游戏失败：' + (e?.message ?? '未知错误')
        } finally {
            loading.value = false
        }
    }

    // ── 按需读取完整代码（编辑/游玩时调用）────────────────────────
    async function getCode(id: string): Promise<string> {
        try {
            const db = await getDB()
            const game = await db.get('localGames', id)
            return game?.code ?? ''
        } catch { return '' }
    }

    // ── 读取完整游戏对象（含 code）────────────────────────────────
    async function getById(id: string): Promise<LocalGame | undefined> {
        try {
            const db = await getDB()
            return db.get('localGames', id)
        } catch { return undefined }
    }

    // ── 保存游戏（无大小限制）─────────────────────────────────────
    async function save(
        game: Omit<LocalGame, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): Promise<string> {
        error.value = null
        try {
            const db = await getDB()
            const now = new Date().toISOString()
            let record: LocalGame

            if (game.id) {
                const existing = await db.get('localGames', game.id)
                record = { ...game, id: game.id, createdAt: existing?.createdAt ?? now, updatedAt: now } as LocalGame
            } else {
                const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
                record = { ...game, id, createdAt: now, updatedAt: now } as LocalGame
            }

            await db.put('localGames', record)
            await loadList()
            return record.id
        } catch (e: any) {
            error.value = '保存失败：' + (e?.message ?? '未知错误')
            throw e
        }
    }

    // ── 删除 ──────────────────────────────────────────────────────
    async function remove(id: string) {
        error.value = null
        try {
            const db = await getDB()
            await db.delete('localGames', id)
            const saves = await db.getAllFromIndex('gameSaves', 'by-gameId', id)
            const tx = db.transaction(['gameSaves', 'gameProgress'], 'readwrite')
            for (const s of saves) tx.objectStore('gameSaves').delete(s.key)
            tx.objectStore('gameProgress').delete(id)
            await tx.done
            await loadList()
        } catch (e: any) {
            error.value = '删除失败：' + (e?.message ?? '未知错误')
            throw e
        }
    }

    // ── 导出 HTML ─────────────────────────────────────────────────
    async function exportGame(id: string) {
        try {
            const db = await getDB()
            const game = await db.get('localGames', id)
            if (!game) return
            const blob = new Blob([game.code], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `${game.name}.html`; a.click()
            URL.revokeObjectURL(url)
        } catch (e) { console.error('[LocalGames] exportGame 失败:', e) }
    }

    // ── 编辑器草稿（IndexedDB 异步，不阻塞主线程）─────────────────
    async function saveDraft(code: string, editingId = '') {
        try {
            if (!code.trim()) return
            const db = await getDB()
            await db.put('editorDraft', { id: 'current', code, editingId, savedAt: new Date().toISOString() })
        } catch (e) { console.warn('[LocalGames] 草稿保存失败:', e) }
    }

    async function loadDraft(): Promise<{ code: string; savedAt: string; editingId: string } | null> {
        try {
            const db = await getDB()
            const d = await db.get('editorDraft', 'current')
            return d?.code?.trim() ? d : null
        } catch { return null }
    }

    async function clearDraft() {
        try {
            const db = await getDB()
            await db.delete('editorDraft', 'current')
        } catch { /* ignore */ }
    }

    // ── 游戏存档 ──────────────────────────────────────────────────
    async function getSaves(gameId: string): Promise<GameSave[]> {
        try {
            const db = await getDB()
            const rows = await db.getAllFromIndex('gameSaves', 'by-gameId', gameId)
            return rows.sort((a, b) => a.slot - b.slot)
        } catch { return [] }
    }

    async function writeSave(
        gameId: string, slot: number,
        data: Record<string, unknown>,
        options?: { label?: string; screenshot?: string; playtime?: number }
    ): Promise<boolean> {
        if (slot < 0 || slot >= MAX_SLOTS) return false
        try {
            const db = await getDB()
            await db.put('gameSaves', {
                key: `${gameId}:${slot}`, gameId, slot,
                label: options?.label ?? `存档 ${slot + 1}`,
                data, screenshot: options?.screenshot,
                savedAt: new Date().toISOString(), playtime: options?.playtime,
            })
            return true
        } catch { return false }
    }

    async function deleteSave(gameId: string, slot: number) {
        try {
            const db = await getDB()
            await db.delete('gameSaves', `${gameId}:${slot}`)
        } catch { /* ignore */ }
    }

    // ── 游戏进度 ──────────────────────────────────────────────────
    async function getProgress(gameId: string): Promise<GameProgress> {
        const def: GameProgress = { highScore: 0, level: 1, completed: false, playCount: 0, totalPlaytime: 0, lastPlayedAt: new Date().toISOString() }
        try {
            const db = await getDB()
            const p = await db.get('gameProgress', gameId)
            return p ? { ...def, ...p } : def
        } catch { return def }
    }

    async function updateProgress(gameId: string, patch: Partial<GameProgress>) {
        try {
            const current = await getProgress(gameId)
            const db = await getDB()
            await db.put('gameProgress', {
                ...current, ...patch, gameId,
                highScore: Math.max(current.highScore, patch.highScore ?? 0),
                lastPlayedAt: new Date().toISOString(),
            })
        } catch { /* ignore */ }
    }

    // ── 发布到服务器 ───────────────────────────────────────────────
    async function publishToServer(id: string): Promise<number> {
        const game = await getById(id)
        if (!game) throw new Error('找不到本地游戏')
        const res = await publishGame({
            name: game.name, description: game.description,
            game_code: game.code, image_url: game.image_url || '',
            game_type: 'html', tags: game.tags, author: game.author,
        })
        return res?.data?.id ?? res?.id
    }

    async function uploadToServer(formData: FormData): Promise<number> {
        const res = await uploadGameFile(formData)
        return res?.data?.id ?? res?.id
    }

    // ── 存储占用查询 ───────────────────────────────────────────────
    async function getStorageEstimate() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const { usage = 0, quota = 0 } = await navigator.storage.estimate()
            return { used: usage, quota, usedMB: (usage / 1024 / 1024).toFixed(1), quotaMB: (quota / 1024 / 1024).toFixed(0) }
        }
        return { used: 0, quota: 0, usedMB: '0', quotaMB: '?' }
    }

    return {
        list, count, loading, error,
        init, loadList,
        save, getCode, getById, remove, exportGame,
        saveDraft, loadDraft, clearDraft,
        getSaves, writeSave, deleteSave,
        getProgress, updateProgress,
        publishToServer, uploadToServer,
        getStorageEstimate,
    }
})