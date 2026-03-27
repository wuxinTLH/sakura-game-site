// src/api/export.ts
// 数据导出接口（均需管理员 token）
// 与 admin.ts 保持一致：动态读 localStorage 中的 admin_token

/**
 * 触发浏览器下载（fetch → Blob → <a> click）
 * 优先从响应头 Content-Disposition 提取文件名；失败则使用 fallback。
 */
async function downloadFile(url: string, fallbackName: string) {
    const token = localStorage.getItem('admin_token') || ''
    const resp  = await fetch(url, {
        headers: { 'x-admin-token': token },
    })

    if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: '导出失败' }))
        throw new Error(err.message || '导出失败')
    }

    const blob        = await resp.blob()
    const disposition = resp.headers.get('Content-Disposition') || ''
    const match       = disposition.match(/filename="?([^";\n]+)"?/)
    const filename    = match ? decodeURIComponent(match[1].trim()) : fallbackName

    const a = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
}

/** 导出游戏元数据 JSON（不含 game_code） */
export function exportGamesJson() {
    return downloadFile('/api/export/games/json', 'sakura_games.json')
}

/** 导出游戏元数据 CSV（Excel 可直接打开） */
export function exportGamesCsv() {
    return downloadFile('/api/export/games/csv', 'sakura_games.csv')
}

/** 完整备份 JSON（含 game_code，用于迁移/灾备） */
export function exportGamesBackup() {
    return downloadFile('/api/export/games/backup', 'sakura_backup.json')
}