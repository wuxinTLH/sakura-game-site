// src/composables/useGameCache.ts
// 问题 12：离线游戏代码本地缓存
//
// 仅缓存 game_type === 'html' 的离线游戏 game_code。
// 版本号以 updated_at 为准；代码更新后缓存自动失效。
// 键名前缀 sakura_game_cache: 与 useGameStorage.ts 中 sakura_save: / sakura_prog: 命名空间一致。
//
// 缓存对象结构：
//   { code: string, updatedAt: string, cachedAt: number }

const CACHE_PREFIX = 'sakura_game_cache:'
const MAX_AGE_MS   = 30 * 24 * 60 * 60 * 1000   // 30 天自动过期

interface CacheEntry {
    code:      string
    updatedAt: string
    cachedAt:  number
}

// ── 对外接口 ─────────────────────────────────────────────────────

/**
 * 读取缓存。
 * @returns game_code 字符串，或 null（未命中 / 版本过期）
 */
export function getCachedGame(gameId: number, serverUpdatedAt: string): string | null {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + gameId)
        if (!raw) return null
        const entry: CacheEntry = JSON.parse(raw)
        // 版本不一致：缓存过期
        if (entry.updatedAt !== serverUpdatedAt) return null
        return entry.code
    } catch {
        return null
    }
}

/**
 * 写入缓存（仅限离线 HTML 游戏）。
 * 写入后自动清理 30 天以上的旧条目。
 */
export function setCachedGame(gameId: number, code: string, updatedAt: string): void {
    try {
        const entry: CacheEntry = { code, updatedAt, cachedAt: Date.now() }
        localStorage.setItem(CACHE_PREFIX + gameId, JSON.stringify(entry))
        _evictExpired()
    } catch (e) {
        // localStorage 已满时静默失败，不影响正常游玩
        console.warn('[GameCache] 写入缓存失败（可能存储已满）:', e)
    }
}

/** 删除单条游戏缓存 */
export function removeCachedGame(gameId: number): void {
    localStorage.removeItem(CACHE_PREFIX + gameId)
}

/** 清除所有游戏缓存（用于存储管理面板"一键清除"） */
export function clearAllGameCache(): void {
    _cacheKeys().forEach(k => localStorage.removeItem(k))
}

/**
 * 获取缓存统计（供存储管理面板展示）。
 */
export interface GameCacheStats {
    count:      number
    totalBytes: number
    items: Array<{
        gameId:   string
        sizeKB:   number
        cachedAt: number
    }>
}

export function getGameCacheStats(): GameCacheStats {
    const keys = _cacheKeys()
    let totalBytes = 0
    const items: GameCacheStats['items'] = []

    for (const key of keys) {
        try {
            const raw     = localStorage.getItem(key) || ''
            const bytes   = raw.length * 2              // UTF-16 字节估算（与 App.vue 中 keyBytes 一致）
            totalBytes   += bytes
            const entry: CacheEntry = JSON.parse(raw)
            items.push({
                gameId:   key.replace(CACHE_PREFIX, ''),
                sizeKB:   Math.round(bytes / 1024 * 10) / 10,
                cachedAt: entry.cachedAt,
            })
        } catch { /* ignore */ }
    }

    return { count: keys.length, totalBytes, items }
}

// ── 内部工具 ─────────────────────────────────────────────────────

function _cacheKeys(): string[] {
    return Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
}

function _evictExpired(): void {
    const now = Date.now()
    for (const key of _cacheKeys()) {
        try {
            const raw   = localStorage.getItem(key)
            if (!raw) continue
            const entry: CacheEntry = JSON.parse(raw)
            if (now - entry.cachedAt > MAX_AGE_MS) {
                localStorage.removeItem(key)
            }
        } catch {
            localStorage.removeItem(key)
        }
    }
}