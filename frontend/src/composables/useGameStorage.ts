/**
 * 🌸 桜游戏屋 - 本地游戏数据存储方案
 * 文件: frontend/src/composables/useGameStorage.ts
 *
 * 提供三层存储能力：
 *   1. 游戏存档 (saves)    —— 多槽位存档，含截图/时间戳
 *   2. 游戏进度 (progress) —— 通用 KV 进度数据（关卡/分数等）
 *   3. 游戏配置 (settings) —— 每款游戏独立的用户偏好设置
 *
 * 所有数据存储在 localStorage，按 gameId 命名空间隔离。
 * 游戏 iframe 通过 postMessage 与宿主页面通信来读写数据。
 */

// ─────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────

export interface GameSave {
    slot: number          // 存档槽位 (0-9)
    name: string          // 存档名称（可自定义）
    data: Record<string, unknown>  // 游戏自定义存档数据
    screenshot?: string   // base64 截图（可选）
    createdAt: string     // ISO 时间戳
    updatedAt: string
    playtime?: number     // 累计游玩秒数
}

export interface GameProgress {
    gameId: number
    /** 关卡 / 章节 */
    level?: number | string
    /** 最高分 */
    highScore?: number
    /** 通关状态 */
    completed?: boolean
    /** 最后游玩时间 */
    lastPlayedAt: string
    /** 累计游玩次数 */
    playCount: number
    /** 累计游玩秒数 */
    totalPlaytime: number
    /** 游戏自定义扩展字段 */
    extra?: Record<string, unknown>
}

export interface GameSettings {
    volume?: number       // 0-1
    bgmEnabled?: boolean
    sfxEnabled?: boolean
    difficulty?: string
    language?: string
    [key: string]: unknown
}

// ─────────────────────────────────────────────
// 存储键生成
// ─────────────────────────────────────────────

const STORAGE_PREFIX = 'sakura_game'

function saveKey(gameId: number) { return `${STORAGE_PREFIX}:${gameId}:saves` }
function progressKey(gameId: number) { return `${STORAGE_PREFIX}:${gameId}:progress` }
function settingsKey(gameId: number) { return `${STORAGE_PREFIX}:${gameId}:settings` }

// ─────────────────────────────────────────────
// 通用读写工具
// ─────────────────────────────────────────────

function readJSON<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key)
        return raw ? (JSON.parse(raw) as T) : null
    } catch {
        return null
    }
}

function writeJSON<T>(key: string, value: T): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value))
        return true
    } catch (e) {
        // localStorage 可能已满
        console.error('[GameStorage] 写入失败:', e)
        return false
    }
}

// ─────────────────────────────────────────────
// 存档管理（最多 10 个槽位）
// ─────────────────────────────────────────────

const MAX_SLOTS = 10

export function getSaves(gameId: number): GameSave[] {
    return readJSON<GameSave[]>(saveKey(gameId)) ?? []
}

export function getSave(gameId: number, slot: number): GameSave | null {
    return getSaves(gameId).find(s => s.slot === slot) ?? null
}

export function writeSave(
    gameId: number,
    slot: number,
    data: Record<string, unknown>,
    options?: { name?: string; screenshot?: string; playtime?: number }
): boolean {
    if (slot < 0 || slot >= MAX_SLOTS) return false

    const saves = getSaves(gameId).filter(s => s.slot !== slot)
    const now = new Date().toISOString()
    const existing = getSave(gameId, slot)

    const newSave: GameSave = {
        slot,
        name: options?.name ?? `存档 ${slot + 1}`,
        data,
        screenshot: options?.screenshot,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        playtime: options?.playtime,
    }

    saves.push(newSave)
    saves.sort((a, b) => a.slot - b.slot)
    return writeJSON(saveKey(gameId), saves)
}

export function deleteSave(gameId: number, slot: number): boolean {
    const saves = getSaves(gameId).filter(s => s.slot !== slot)
    return writeJSON(saveKey(gameId), saves)
}

export function clearAllSaves(gameId: number): boolean {
    localStorage.removeItem(saveKey(gameId))
    return true
}

// ─────────────────────────────────────────────
// 进度管理
// ─────────────────────────────────────────────

export function getProgress(gameId: number): GameProgress {
    return readJSON<GameProgress>(progressKey(gameId)) ?? {
        gameId,
        lastPlayedAt: new Date().toISOString(),
        playCount: 0,
        totalPlaytime: 0,
    }
}

export function updateProgress(
    gameId: number,
    patch: Partial<Omit<GameProgress, 'gameId'>>
): boolean {
    const current = getProgress(gameId)
    const updated: GameProgress = {
        ...current,
        ...patch,
        gameId,
        lastPlayedAt: new Date().toISOString(),
    }
    return writeJSON(progressKey(gameId), updated)
}

/** 游戏结束时调用，记录本局数据 */
export function recordSession(
    gameId: number,
    sessionData: { score?: number; level?: number | string; playtime?: number; completed?: boolean }
): boolean {
    const current = getProgress(gameId)
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

export function getSettings(gameId: number): GameSettings {
    return readJSON<GameSettings>(settingsKey(gameId)) ?? {
        volume: 0.8,
        bgmEnabled: true,
        sfxEnabled: true,
    }
}

export function saveSettings(gameId: number, settings: GameSettings): boolean {
    return writeJSON(settingsKey(gameId), settings)
}

export function patchSettings(gameId: number, patch: Partial<GameSettings>): boolean {
    const current = getSettings(gameId)
    return saveSettings(gameId, { ...current, ...patch })
}

// ─────────────────────────────────────────────
// 存储使用情况
// ─────────────────────────────────────────────

export function getStorageInfo(): { used: number; total: number; usedKB: string } {
    let used = 0
    for (const key in localStorage) {
        if (!Object.prototype.hasOwnProperty.call(localStorage, key)) continue
        used += (localStorage.getItem(key)?.length ?? 0) * 2 // UTF-16
    }
    return {
        used,
        total: 5 * 1024 * 1024, // 5MB 估算
        usedKB: (used / 1024).toFixed(1),
    }
}

export function getGameStorageSize(gameId: number): number {
    const keys = [saveKey(gameId), progressKey(gameId), settingsKey(gameId)]
    return keys.reduce((total, k) => {
        return total + (localStorage.getItem(k)?.length ?? 0) * 2
    }, 0)
}

/** 清除某游戏的所有本地数据 */
export function clearGameData(gameId: number): void {
    localStorage.removeItem(saveKey(gameId))
    localStorage.removeItem(progressKey(gameId))
    localStorage.removeItem(settingsKey(gameId))
}

/** 导出某游戏所有数据为 JSON 字符串（用于备份/分享） */
export function exportGameData(gameId: number): string {
    return JSON.stringify({
        gameId,
        saves: getSaves(gameId),
        progress: getProgress(gameId),
        settings: getSettings(gameId),
        exportedAt: new Date().toISOString(),
    }, null, 2)
}

/** 从 JSON 字符串导入游戏数据（覆盖） */
export function importGameData(json: string): boolean {
    try {
        const data = JSON.parse(json)
        const { gameId, saves, progress, settings } = data
        if (!gameId) return false
        if (saves) writeJSON(saveKey(gameId), saves)
        if (progress) writeJSON(progressKey(gameId), progress)
        if (settings) writeJSON(settingsKey(gameId), settings)
        return true
    } catch {
        return false
    }
}

// ─────────────────────────────────────────────
// Vue Composable 封装
// ─────────────────────────────────────────────

import { ref, computed } from 'vue'

export function useGameStorage(gameId: number) {
    const saves = ref<GameSave[]>(getSaves(gameId))
    const progress = ref<GameProgress>(getProgress(gameId))
    const settings = ref<GameSettings>(getSettings(gameId))

    const hasSave = computed(() => saves.value.length > 0)
    const storageSize = computed(() => getGameStorageSize(gameId))

    function refreshSaves() { saves.value = getSaves(gameId) }
    function refreshProgress() { progress.value = getProgress(gameId) }
    function refreshSettings() { settings.value = getSettings(gameId) }

    function save(
        slot: number,
        data: Record<string, unknown>,
        opts?: { name?: string; screenshot?: string; playtime?: number }
    ) {
        const ok = writeSave(gameId, slot, data, opts)
        if (ok) refreshSaves()
        return ok
    }

    function load(slot: number) {
        return getSave(gameId, slot)
    }

    function removeSave(slot: number) {
        const ok = deleteSave(gameId, slot)
        if (ok) refreshSaves()
        return ok
    }

    function saveProgress(patch: Partial<Omit<GameProgress, 'gameId'>>) {
        const ok = updateProgress(gameId, patch)
        if (ok) refreshProgress()
        return ok
    }

    function updateSettings(patch: Partial<GameSettings>) {
        const ok = patchSettings(gameId, patch)
        if (ok) refreshSettings()
        return ok
    }

    function clearAll() {
        clearGameData(gameId)
        refreshSaves()
        refreshProgress()
        refreshSettings()
    }

    return {
        // 状态
        saves,
        progress,
        settings,
        hasSave,
        storageSize,
        // 存档操作
        save,
        load,
        removeSave,
        clearAllSaves: () => { clearAllSaves(gameId); refreshSaves() },
        // 进度操作
        saveProgress,
        recordSession: (data: Parameters<typeof recordSession>[1]) => {
            const ok = recordSession(gameId, data)
            if (ok) refreshProgress()
            return ok
        },
        // 设置操作
        updateSettings,
        // 工具
        clearAll,
        exportData: () => exportGameData(gameId),
        importData: (json: string) => {
            const ok = importGameData(json)
            if (ok) { refreshSaves(); refreshProgress(); refreshSettings() }
            return ok
        },
    }
}