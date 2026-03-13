/**
 * backend/routes/assets.js
 * 资源管理器 API
 *
 * GET    /api/assets              列出资源（支持 game_id / type 筛选）
 * GET    /api/assets/:id          获取单个资源详情（含 data_uri）
 * GET    /api/assets/quota        全站用量 & 上限
 * POST   /api/assets              上传资源（需鉴权）
 * DELETE /api/assets/:id          删除资源（需鉴权）
 * GET    /api/assets/game/:gameId 获取某游戏关联的全部资源
 */

const express = require('express')
const multer = require('multer')
const router = express.Router()
const { adminAuth } = require('../middleware/auth')
const pool = require('../config/database')

// ── 配置 ─────────────────────────────────────────────────────
const QUOTA_BYTES = 100 * 1024 * 1024   // 全站资源总上限：100 MB
const MAX_FILE_BYTES = 2 * 1024 * 1024   // 单文件上限：2 MB
const ALLOWED_MIME = new Set([
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
    'application/json',
    'text/plain', 'text/csv',
])

// multer：内存模式（拿 Buffer 转 Base64 存库）
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES },
    fileFilter(_req, file, cb) {
        if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true)
        cb(new Error(`不支持的文件类型：${file.mimetype}`))
    },
})

// ── 工具 ─────────────────────────────────────────────────────
function mimeToType(mime) {
    if (mime.startsWith('image/')) return 'image'
    if (mime.startsWith('audio/')) return 'audio'
    if (mime === 'application/json') return 'json'
    if (mime.startsWith('text/')) return 'text'
    return 'other'
}

// ── GET /api/assets/quota ─────────────────────────────────────
// 注意：此路由必须在 /:id 之前注册
router.get('/quota', async (_req, res) => {
    try {
        const [[row]] = await pool.query(
            'SELECT COALESCE(SUM(size), 0) AS used FROM s_g_assets'
        )
        res.json({
            used: Number(row.used),
            limit: QUOTA_BYTES,
            pct: +(Number(row.used) / QUOTA_BYTES * 100).toFixed(1),
        })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// ── GET /api/assets/game/:gameId ──────────────────────────────
router.get('/game/:gameId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, type, mime, size, created_at
       FROM s_g_assets
       WHERE game_id = ? OR game_id IS NULL
       ORDER BY game_id IS NULL ASC, created_at DESC`,
            [req.params.gameId]
        )
        res.json({ list: rows })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// ── GET /api/assets ───────────────────────────────────────────
router.get('/', async (req, res) => {
    const { game_id, type, page = 1, limit = 50 } = req.query
    const conditions = []
    const values = []

    if (game_id !== undefined) {
        conditions.push('game_id = ?')
        values.push(game_id)
    }
    if (type) {
        conditions.push('type = ?')
        values.push(type)
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const offset = (Number(page) - 1) * Number(limit)

    try {
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM s_g_assets ${where}`, values
        )
        // 列表不返回 data 字段（太大），仅返回元信息
        const [rows] = await pool.query(
            `SELECT id, name, type, mime, size, game_id, created_at
       FROM s_g_assets ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
            [...values, Number(limit), offset]
        )
        res.json({ total, page: Number(page), list: rows })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// ── GET /api/assets/:id ───────────────────────────────────────
// 返回完整 data_uri，用于在游戏代码中直接嵌入
router.get('/:id', async (req, res) => {
    try {
        const [[row]] = await pool.query(
            `SELECT id, name, type, mime, size, game_id, created_at,
              CONCAT('data:', mime, ';base64,', data) AS data_uri
       FROM s_g_assets WHERE id = ?`,
            [req.params.id]
        )
        if (!row) return res.status(404).json({ message: '资源不存在' })
        res.json(row)
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// ── POST /api/assets ──────────────────────────────────────────
router.post('/', adminAuth, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: '未收到文件' })

    const { game_id } = req.body   // 可选，传 'null' 字符串时当公共资源

    try {
        // 1. 检查全站用量
        const [[{ used }]] = await pool.query(
            'SELECT COALESCE(SUM(size), 0) AS used FROM s_g_assets'
        )
        if (Number(used) + req.file.size > QUOTA_BYTES) {
            return res.status(413).json({
                message: `资源库已满（上限 ${Math.round(QUOTA_BYTES / 1024 / 1024)} MB），请先删除旧资源`,
            })
        }

        // 2. 转 Base64
        const base64 = req.file.buffer.toString('base64')
        const mime = req.file.mimetype
        const type = mimeToType(mime)
        const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
        const gid = game_id && game_id !== 'null' ? Number(game_id) : null

        // 3. 写库
        const [result] = await pool.query(
            `INSERT INTO s_g_assets (name, type, mime, size, data, game_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [name, type, mime, req.file.size, base64, gid]
        )

        res.status(201).json({
            id: result.insertId,
            name, type, mime,
            size: req.file.size,
            game_id: gid,
            // 直接返回 data_uri，前端可立即预览
            data_uri: `data:${mime};base64,${base64}`,
        })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// ── DELETE /api/assets/:id ────────────────────────────────────
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM s_g_assets WHERE id = ?', [req.params.id]
        )
        if (result.affectedRows === 0)
            return res.status(404).json({ message: '资源不存在' })
        res.json({ message: '删除成功' })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

module.exports = router