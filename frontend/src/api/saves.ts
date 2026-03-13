// src/api/saves.ts
// 游戏存档接口封装
// save_key：用浏览器指纹（简化版：userAgent + language + timezone 的哈希）作为客户端唯一标识
import axios from 'axios'

const http = axios.create({ baseURL: '/api/saves', timeout: 8000 })

// ── 生成客户端标识（简单稳定指纹，不依赖第三方库） ──────────────
function generateSaveKey(): string {
    const raw = [
        navigator.userAgent,
        navigator.language,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen.width,
        screen.height,
    ].join('|')

    // djb2 哈希
    let hash = 5381
    for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) + hash) ^ raw.charCodeAt(i)
        hash = hash >>> 0  // 保持无符号 32 位
    }
    return 'sk_' + hash.toString(36)
}

export const SAVE_KEY = generateSaveKey()

// ── 存档数据类型 ──────────────────────────────────────────────────
export interface SaveSlot {
    id: number
    game_id: number
    slot: number
    save_key: string
    save_data?: string   // 读取单条时才有
    save_name: string
    play_time: number
    created_at: string
    updated_at: string
}

// ── 接口封装 ──────────────────────────────────────────────────────

/** 获取某游戏所有存档槽（不含 save_data，轻量） */
export const getSaveSlots = (gameId: number) =>
    http.get<{ success: boolean; data: SaveSlot[] }>(`/${gameId}`, {
        params: { save_key: SAVE_KEY },
    }).then(r => r.data)

/** 读取单个存档槽（含 save_data） */
export const loadSave = (gameId: number, slot: number) =>
    http.get<{ success: boolean; data: SaveSlot }>(`/${gameId}/${slot}`, {
        params: { save_key: SAVE_KEY },
    }).then(r => r.data)

/** 写入/覆盖存档 */
export const writeSave = (
    gameId: number,
    slot: number,
    payload: { save_data: string; save_name?: string; play_time?: number }
) =>
    http.post<{ success: boolean; message: string }>(`/${gameId}/${slot}`, {
        save_key: SAVE_KEY,
        ...payload,
    }).then(r => r.data)

/** 删除存档 */
export const deleteSave = (gameId: number, slot: number) =>
    http.delete<{ success: boolean; message: string }>(`/${gameId}/${slot}`, {
        data: { save_key: SAVE_KEY },
    }).then(r => r.data)