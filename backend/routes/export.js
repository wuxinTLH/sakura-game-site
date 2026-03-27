// backend/routes/export.js
// 数据导出接口（均需管理员鉴权）
//
// GET /api/export/games/json    — 游戏元数据 JSON（不含 game_code）
// GET /api/export/games/csv     — 游戏元数据 CSV（Excel 可直接打开，含 UTF-8 BOM）
// GET /api/export/games/backup  — 完整备份 JSON（含 game_code，用于迁移/灾备）
//
// 风格与 games.js / admin.js 保持一致（db / adminAuth / req.log）

const express   = require('express')
const router    = express.Router()
const db        = require('../config/database')
const { adminAuth } = require('../middleware/auth')

// 所有导出接口均需管理员鉴权
router.use(adminAuth)

// ── 工具 ─────────────────────────────────────────────────────────
/** 生成 YYYYMMDD_HHmmss 格式时间字符串，用于文件名 */
function dateStr() {
    const d   = new Date()
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

/** 将单元格值转义为安全 CSV 格式 */
function csvCell(val) {
    const s = val === null || val === undefined ? '' : String(val)
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
}

// ─────────────────────────────────────────────────────────────────
// GET /api/export/games/json — 元数据 JSON（不含 game_code）
// ─────────────────────────────────────────────────────────────────
router.get('/games/json', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, name, description, image_url, game_type, tags, author,
                    play_count, is_active, sort_order, created_at, updated_at
             FROM s_g_games
             ORDER BY sort_order DESC, id ASC`
        )

        const filename = `sakura_games_${dateStr()}.json`
        req.log?.info('导出游戏元数据 JSON', { count: rows.length })

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.json({
            exported_at: new Date().toISOString(),
            total: rows.length,
            games: rows,
        })
    } catch (err) {
        req.log?.error('GET /export/games/json 失败', { message: err.message })
        res.status(500).json({ success: false, message: '导出失败' })
    }
})

// ─────────────────────────────────────────────────────────────────
// GET /api/export/games/csv — 元数据 CSV（含 UTF-8 BOM 供 Excel 使用）
// ─────────────────────────────────────────────────────────────────
router.get('/games/csv', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, name, description, game_type, tags, author,
                    play_count, is_active, sort_order, created_at, updated_at
             FROM s_g_games
             ORDER BY sort_order DESC, id ASC`
        )

        const headers = [
            'id', 'name', 'description', 'game_type', 'tags', 'author',
            'play_count', 'is_active', 'sort_order', 'created_at', 'updated_at',
        ]

        // UTF-8 BOM + 列头 + 数据行
        const lines = [
            '\uFEFF' + headers.join(','),
            ...rows.map(row => headers.map(h => csvCell(row[h])).join(',')),
        ]

        const filename = `sakura_games_${dateStr()}.csv`
        req.log?.info('导出游戏元数据 CSV', { count: rows.length })

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.send(lines.join('\r\n'))
    } catch (err) {
        req.log?.error('GET /export/games/csv 失败', { message: err.message })
        res.status(500).json({ success: false, message: '导出失败' })
    }
})

// ─────────────────────────────────────────────────────────────────
// GET /api/export/games/backup — 完整备份 JSON（含 game_code）
// ─────────────────────────────────────────────────────────────────
router.get('/games/backup', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, name, description, image_url, game_code, game_type,
                    tags, author, play_count, is_active, sort_order, created_at, updated_at
             FROM s_g_games
             ORDER BY id ASC`
        )

        const filename = `sakura_backup_${dateStr()}.json`
        req.log?.info('导出完整备份', { count: rows.length })

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.json({
            exported_at: new Date().toISOString(),
            version: '1.0',
            total: rows.length,
            games: rows,
        })
    } catch (err) {
        req.log?.error('GET /export/games/backup 失败', { message: err.message })
        res.status(500).json({ success: false, message: '备份导出失败' })
    }
})

module.exports = router