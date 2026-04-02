/**
 * frontend/src/composables/useGameStorage.ts
 * ★ P0 修复：游戏存档/进度/配置全部迁移到 IndexedDB
 *   原来用 localStorage（5MB 上限），现在用 IndexedDB（数百 MB）
 *
 * 游戏 iframe 通过 postMessage 与宿主页面通信来读写数据（保持不变）。
 */

import { ref, computed } from 'vue'
import { openDB, type IDBPDatabase } from 'idb'

// ─────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────

export interface GameSave {
    slot: number
    name: string
    data: Record<string, unknown>
    screenshot?: string
    createdAt: string
    updatedAt: string
    playtime?: number
}

export interface GameProgress {
    gameId: number
    level?: number | string
    highScore?: number
    completed?: boolean
    lastPlayedAt: string
    playCount: number
    totalPlaytime: number
    extra?: Record<string, unknown>
}

export interface GameSettings {
    volume?: number
    bgmEnabled?: boolean
    sfxEnabled?: boolean
    difficulty?: string
    language?: string
    [key: string]: unknown
}

// ─────────────────────────────────────────────
// IndexedDB 数据库（游戏运行时存储）
// ─────────────────────────────────────────────

interface GameStorageDB {
    saves: {
        key: string           // `${gameId}:${slot}`
        value: { key: string; gameId: number; slot: number } & GameSave
        indexes: { 'by-gameId': number }
    }
    progress: {
        key: number           // gameId
        value: GameProgress
    }
    settings: {
        key: number           // gameId
        value: { gameId: number } & GameSettings
    }
}

const GAME_STORAGE_DB = 'sakura-game-storage'
const GAME_STORAGE_VERSION = 1

let _gameStorageDB: IDBPDatabase<GameStorageDB> | null = null

async function getGameStorageDB(): Promise<IDBPDatabase<GameStorageDB>> {
    if (_gameStorageDB) return _gameStorageDB
    _gameStorageDB = await openDB<GameStorageDB>(GAME_STORAGE_DB, GAME_STORAGE_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('saves')) {
                const ss = db.createObjectStore('saves', { keyPath: 'key' })
                ss.createIndex('by-gameId', 'gameId')
            }
            if (!db.objectStoreNames.contains('progress')) {
                db.createObjectStore('progress', { keyPath: 'gameId' })
            }
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'gameId' })
            }
        },
    })
    return _gameStorageDB
}

// ─────────────────────────────────────────────
// 存档管理（最多 10 个槽位）
// ─────────────────────────────────────────────

const MAX_SLOTS = 10

export async function getSaves(gameId: number): Promise<GameSave[]> {
    try {
        const db = await getGameStorageDB()
        const rows = await db.getAllFromIndex('saves', 'by-gameId', gameId)
        return rows.sort((a, b) => a.slot - b.slot)
    } catch { return [] }
}

export async function getSave(gameId: number, slot: number): Promise<GameSave | null> {
    try {
        const db = await getGameStorageDB()
        return await db.get('saves', `${gameId}:${slot}`) ?? null
    } catch { return null }
}

export async function writeSave(
    gameId: number,
    slot: number,
    data: Record<string, unknown>,
    options?: { name?: string; screenshot?: string; playtime?: number }
): Promise<boolean> {
    if (slot < 0 || slot >= MAX_SLOTS) return false
    try {
        const db = await getGameStorageDB()
        const existing = await db.get('saves', `${gameId}:${slot}`)
        const now = new Date().toISOString()
        await db.put('saves', {
            key: `${gameId}:${slot}`,
            gameId,
            slot,
            name: options?.name ?? `存档 ${slot + 1}`,
            data,
            screenshot: options?.screenshot,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            playtime: options?.playtime,
        })
        return true
    } catch (e) {
        console.error('[GameStorage] writeSave 失败:', e)
        return false
    }
}

export async function deleteSave(gameId: number, slot: number): Promise<boolean> {
    try {
        const db = await getGameStorageDB()
        await db.delete('saves', `${gameId}:${slot}`)
        return true
    } catch { return false }
}

export async function clearAllSaves(gameId: number): Promise<boolean> {
    try {
        const db = await getGameStorageDB()
        const rows = await db.getAllFromIndex('saves', 'by-gameId', gameId)
        const tx = db.transaction('saves', 'readwrite')
        for (const r of rows) tx.store.delete(r.key)
        await tx.done
        return true
    } catch { return false }
}

// ─────────────────────────────────────────────
// 进度管理
// ─────────────────────────────────────────────

export async function getProgress(gameId: number): Promise<GameProgress> {
    const def: GameProgress = { gameId, lastPlayedAt: new Date().toISOString(), playCount: 0, totalPlaytime: 0 }
    try {
        const db = await getGameStorageDB()
        return await db.get('progress', gameId) ?? def
    } catch { return def }
}

export async function updateProgress(
    gameId: number,
    patch: Partial<Omit<GameProgress, 'gameId'>>
): Promise<boolean> {
    try {
        const current = await getProgress(gameId)
        const db = await getGameStorageDB()
        await db.put('progress', {
            ...current, ...patch,
            gameId,
            lastPlayedAt: new Date().toISOString(),
        })
        return true
    } catch { return false }
}

export async function recordSession(
    gameId: number,
    sessionData: { score?: number; level?: number | string; playtime?: number; completed?: boolean }
): Promise<boolean> {
    const current = await getProgress(gameId)
    return updateProgress(gameId, {
        highScore: Math.max(current.highScore ?? 0, sessionData.score ?? 0),
        level: sessionData.level ?? current.level,
        completed: sessionData.completed || current.completed,
        playCount: current.playCount + 1,
        totalPlaytime: current.totalPlaytime + (sessionData.playtime ?? 0),
    })
}

// ─────────────────────────────────────────────
// 设置管理
// ─────────────────────────────────────────────

export async function getSettings(gameId: number): Promise<GameSettings> {
    const def: GameSettings = { volume: 0.8, bgmEnabled: true, sfxEnabled: true }
    try {
        const db = await getGameStorageDB()
        const s = await db.get('settings', gameId)
        return s ? { ...def, ...s } : def
    } catch { return def }
}

export async function saveSettings(gameId: number, settings: GameSettings): Promise<boolean> {
    try {
        const db = await getGameStorageDB()
        await db.put('settings', { ...settings, gameId })
        return true
    } catch { return false }
}

export async function patchSettings(gameId: number, patch: Partial<GameSettings>): Promise<boolean> {
    const current = await getSettings(gameId)
    return saveSettings(gameId, { ...current, ...patch })
}

// ─────────────────────────────────────────────
// 存储使用情况（IndexedDB）
// ─────────────────────────────────────────────

export async function getStorageInfo(): Promise<{ used: number; quota: number; usedKB: string }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { usage = 0, quota = 0 } = await navigator.storage.estimate()
        return { used: usage, quota, usedKB: (usage / 1024).toFixed(1) }
    }
    return { used: 0, quota: 0, usedKB: '0' }
}

export async function clearGameData(gameId: number): Promise<void> {
    await clearAllSaves(gameId)
    try {
        const db = await getGameStorageDB()
        const tx = db.transaction(['progress', 'settings'], 'readwrite')
        tx.objectStore('progress').delete(gameId)
        tx.objectStore('settings').delete(gameId)
        await tx.done
    } catch { /* ignore */ }
}

// ─────────────────────────────────────────────
// Vue Composable 封装
// ─────────────────────────────────────────────

export function useGameStorage(gameId: number) {
    const saves = ref<GameSave[]>([])
    const progress = ref<GameProgress>({ gameId, lastPlayedAt: '', playCount: 0, totalPlaytime: 0 })
    const settings = ref<GameSettings>({ volume: 0.8, bgmEnabled: true, sfxEnabled: true })
    const hasSave = computed(() => saves.value.length > 0)

    async function refreshSaves() { saves.value = await getSaves(gameId) }
    async function refreshProgress() { progress.value = await getProgress(gameId) }
    async function refreshSettings() { settings.value = await getSettings(gameId) }

    async function init() {
        await Promise.all([refreshSaves(), refreshProgress(), refreshSettings()])
    }

    async function save(
        slot: number,
        data: Record<string, unknown>,
        opts?: { name?: string; screenshot?: string; playtime?: number }
    ) {
        const ok = await writeSave(gameId, slot, data, opts)
        if (ok) await refreshSaves()
        return ok
    }

    async function load(slot: number) {
        return getSave(gameId, slot)
    }

    async function removeSave(slot: number) {
        const ok = await deleteSave(gameId, slot)
        if (ok) await refreshSaves()
        return ok
    }

    async function saveProgress(patch: Partial<Omit<GameProgress, 'gameId'>>) {
        const ok = await updateProgress(gameId, patch)
        if (ok) await refreshProgress()
        return ok
    }

    async function updateSettings(patch: Partial<GameSettings>) {
        const ok = await patchSettings(gameId, patch)
        if (ok) await refreshSettings()
        return ok
    }

    async function clearAll() {
        await clearGameData(gameId)
        await init()
    }

    return {
        saves, progress, settings, hasSave,
        init, save, load, removeSave,
        clearAllSaves: async () => { await clearAllSaves(gameId); await refreshSaves() },
        saveProgress,
        recordSession: async (data: Parameters<typeof recordSession>[1]) => {
            const ok = await recordSession(gameId, data)
            if (ok) await refreshProgress()
            return ok
        },
        updateSettings,
        clearAll,
    }
}