// src/stores/localGames.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { publishGame, uploadGameFile } from '@/api/admin'

// ── 类型 ──────────────────────────────────────────────────────
export interface LocalGame {
    id: string
    name: string
    description: string
    tags: string
    author: string
    code: string
    createdAt: string
    updatedAt: string
}

/** 游戏存档（多槽位） */
export interface GameSave {
    slot: number                      // 0-9
    label: string                     // 存档名，如"第3关·存档"
    data: Record<string, unknown>     // 游戏自定义数据
    screenshot?: string               // base64 截图（可选）
    savedAt: string                   // ISO 时间戳
    playtime?: number                 // 本档累计游玩秒数
}

/** 游戏进度（全局最优记录） */
export interface GameProgress {
    highScore: number
    level: number | string
    completed: boolean
    playCount: number
    totalPlaytime: number             // 秒
    lastPlayedAt: string
    extra?: Record<string, unknown>   // 游戏自定义扩展
}

// ── 存储键 ────────────────────────────────────────────────────
const GAMES_KEY = 'sakura_local_games'
const DRAFT_KEY = 'sakura_editor_draft'
const SAVE_PREFIX = 'sakura_save:'       // sakura_save:<gameId>
const PROG_PREFIX = 'sakura_prog:'       // sakura_prog:<gameId>
const MAX_SLOTS = 10

// ── 本地游戏列表的读写 ─────────────────────────────────────────
function loadFromStorage(): LocalGame[] {
    try {
        const raw = localStorage.getItem(GAMES_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function saveToStorage(list: LocalGame[]) {
    localStorage.setItem(GAMES_KEY, JSON.stringify(list))
}

// ── 存档 / 进度的读写（独立于游戏列表，按 gameId 隔离）─────────
function readJSON<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

function writeJSON<T>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
        console.error('[LocalGames] localStorage 写入失败（可能已满）:', e)
    }
}

// ── Store ─────────────────────────────────────────────────────
export const useLocalGamesStore = defineStore('localGames', () => {
    const list = ref<LocalGame[]>(loadFromStorage())

    const count = computed(() => list.value.length)

    // ── 游戏列表 CRUD ──────────────────────────────────────────

    function save(game: Omit<LocalGame, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
        const now = new Date().toISOString()
        if (game.id) {
            const idx = list.value.findIndex(g => g.id === game.id)
            if (idx !== -1) {
                list.value[idx] = { ...list.value[idx], ...game, updatedAt: now } as LocalGame
            }
        } else {
            const newGame: LocalGame = {
                ...game,
                id: `local_${Date.now()}`,
                createdAt: now,
                updatedAt: now,
            }
            list.value.unshift(newGame)
        }
        saveToStorage(list.value)
    }

    function remove(id: string) {
        list.value = list.value.filter(g => g.id !== id)
        saveToStorage(list.value)
    }

    function getById(id: string): LocalGame | undefined {
        return list.value.find(g => g.id === id)
    }

    // ── 导出 HTML ──────────────────────────────────────────────

    function exportGame(id: string) {
        const game = getById(id)
        if (!game) return
        const blob = new Blob([game.code], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${game.name}.html`
        a.click()
        URL.revokeObjectURL(url)
    }

    // ── 编辑器草稿 ─────────────────────────────────────────────

    function saveDraft(code: string) {
        localStorage.setItem(DRAFT_KEY, code)
    }

    function loadDraft(): string | null {
        return localStorage.getItem(DRAFT_KEY)
    }

    function clearDraft() {
        localStorage.removeItem(DRAFT_KEY)
    }

    // ── 游戏存档（多槽位）─────────────────────────────────────
    // 以游戏 id 为命名空间，与游戏列表数据独立存储

    function getSaves(gameId: string): GameSave[] {
        return readJSON<GameSave[]>(SAVE_PREFIX + gameId) ?? []
    }

    function writeSave(
        gameId: string,
        slot: number,
        data: Record<string, unknown>,
        options?: { label?: string; screenshot?: string; playtime?: number }
    ): boolean {
        if (slot < 0 || slot >= MAX_SLOTS) return false
        const saves = getSaves(gameId).filter(s => s.slot !== slot)
        saves.push({
            slot,
            label: options?.label ?? `存档 ${slot + 1}`,
            data,
            screenshot: options?.screenshot,
            savedAt: new Date().toISOString(),
            playtime: options?.playtime,
        })
        saves.sort((a, b) => a.slot - b.slot)
        writeJSON(SAVE_PREFIX + gameId, saves)
        return true
    }

    function deleteSave(gameId: string, slot: number) {
        const saves = getSaves(gameId).filter(s => s.slot !== slot)
        writeJSON(SAVE_PREFIX + gameId, saves)
    }

    // ── 游戏进度 ───────────────────────────────────────────────

    function getProgress(gameId: string): GameProgress {
        return readJSON<GameProgress>(PROG_PREFIX + gameId) ?? {
            highScore: 0,
            level: 1,
            completed: false,
            playCount: 0,
            totalPlaytime: 0,
            lastPlayedAt: new Date().toISOString(),
        }
    }

    function updateProgress(gameId: string, patch: Partial<GameProgress>) {
        const current = getProgress(gameId)
        writeJSON(PROG_PREFIX + gameId, {
            ...current,
            ...patch,
            // 高分只增不减
            highScore: Math.max(current.highScore, patch.highScore ?? 0),
            lastPlayedAt: new Date().toISOString(),
        })
    }

    // ── 发布到服务器 ───────────────────────────────────────────
    /**
     * 将本地游戏发布到后端数据库。
     *
     * 修复说明：改用 admin.ts 的 publishGame()，
     * 该函数走带 x-admin-token 拦截器的 gameHttp 实例，
     * 不再出现"未授权，请重新登录"的 401 错误。
     */
    async function publishToServer(id: string): Promise<number> {
        const game = getById(id)
        if (!game) throw new Error('找不到本地游戏')

        const res = await publishGame({
            name: game.name,
            description: game.description,
            game_code: game.code,
            game_type: 'html',
            tags: game.tags,
            author: game.author,
        })

        // 兼容后端返回 { data: { id } } 或 { id } 两种结构
        return res?.data?.id ?? res?.id
    }

    // ── 上传文件到服务器 ───────────────────────────────────────
    /**
     * 上传 .html/.vue/.ts 文件到后端。
     *
     * 修复说明：
     *   1. 使用 admin.ts 的 uploadGameFile()，携带 token。
     *   2. FormData 在调用方组装后直接传入，不在此处设置
     *      Content-Type（浏览器自动补全含 boundary 的头）。
     */
    async function uploadToServer(formData: FormData): Promise<number> {
        const res = await uploadGameFile(formData)
        return res?.data?.id ?? res?.id
    }

    return {
        list,
        count,
        // 游戏列表
        save,
        remove,
        getById,
        exportGame,
        // 草稿
        saveDraft,
        loadDraft,
        clearDraft,
        // 存档
        getSaves,
        writeSave,
        deleteSave,
        // 进度
        getProgress,
        updateProgress,
        // 发布 & 上传
        publishToServer,
        uploadToServer,
    }
})