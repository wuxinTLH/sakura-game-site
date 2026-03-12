// backend/routes/games.js
const express = require('express')
const { body, query, param, validationResult } = require('express-validator')
const router = express.Router()
const db = require('../config/database')
const { adminAuth } = require('../middleware/auth')

// ── 参数校验失败统一处理 ─────────────────────────────────────────
function validate(req, res, next) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() })
    }
    next()
}

// ── 允许的排序字段白名单（防 SQL 注入） ──────────────────────────
const SORT_MAP = {
    newest: 'g.created_at DESC',
    hottest: 'g.play_count DESC',
    order: 'g.sort_order DESC, g.created_at DESC',
}

// ─────────────────────────────────────────────────────────────────
// GET /api/games — 游戏列表（分页 + 全文搜索 + 标签 + 排序）
// ─────────────────────────────────────────────────────────────────
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('page 必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit 范围 1~50'),
    query('sort').optional().isIn(Object.keys(SORT_MAP)).withMessage('sort 值不合法'),
    validate,
], async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1', 10)
        const limit = parseInt(req.query.limit || '12', 10)
        const offset = (page - 1) * limit
        const search = (req.query.search || '').trim()
        const tags = (req.query.tags || '').trim()
        const sort = SORT_MAP[req.query.sort] || SORT_MAP.order

        const conditions = ['g.is_active = 1']
        const params = []

        if (search) {
            conditions.push('MATCH(g.name, g.description, g.tags) AGAINST(? IN BOOLEAN MODE)')
            params.push(`*${search}*`)
        }
        if (tags) {
            conditions.push('FIND_IN_SET(?, g.tags)')
            params.push(tags)
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

        const [rows] = await db.execute(
            `SELECT g.id, g.name, g.description, g.image_url, g.game_type,
              g.tags, g.author, g.play_count, g.sort_order, g.created_at
       FROM s_g_games g
       ${where}
       ORDER BY ${sort}
       LIMIT ${limit} OFFSET ${offset}`,
            params
        )

        const [[{ total }]] = await db.execute(
            `SELECT COUNT(*) AS total FROM s_g_games g ${where}`,
            params
        )

        res.json({
            success: true,
            data: {
                list: rows,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        })
    } catch (err) {
        req.log.error('GET /games 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ─────────────────────────────────────────────────────────────────
// GET /api/games/:id — 游戏详情（含 game_code）
// ─────────────────────────────────────────────────────────────────
router.get('/:id', [
    param('id').isInt({ min: 1 }).withMessage('id 必须是正整数'),
    validate,
], async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM s_g_games WHERE id = ? AND is_active = 1',
            [req.params.id]
        )
        if (!rows.length) {
            return res.status(404).json({ success: false, message: '游戏不存在' })
        }
        res.json({ success: true, data: rows[0] })
    } catch (err) {
        req.log.error('GET /games/:id 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ─────────────────────────────────────────────────────────────────
// POST /api/games — 新增游戏（需鉴权）
// ─────────────────────────────────────────────────────────────────
router.post('/', adminAuth, [
    body('name').trim().notEmpty().withMessage('游戏名称不能为空')
        .isLength({ max: 255 }).withMessage('名称最长 255 字符'),
    body('game_code').notEmpty().withMessage('游戏代码不能为空'),
    body('game_type').optional().isIn(['html', 'canvas']).withMessage('game_type 值不合法'),
    body('description').optional().isLength({ max: 2000 }).withMessage('介绍最长 2000 字符'),
    body('tags').optional().isLength({ max: 500 }).withMessage('标签最长 500 字符'),
    body('author').optional().isLength({ max: 100 }).withMessage('作者最长 100 字符'),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('sort_order 必须是非负整数'),
    validate,
], async (req, res) => {
    try {
        const {
            name, description = '', image_url = '',
            game_code, game_type = 'html',
            tags = '', author = '', sort_order = 0,
        } = req.body

        const [result] = await db.execute(
            `INSERT INTO s_g_games
         (name, description, image_url, game_code, game_type,
          tags, author, sort_order, is_active, play_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW(), NOW())`,
            [name, description, image_url, game_code, game_type, tags, author, sort_order]
        )

        req.log.info('新增游戏', { id: result.insertId, name })
        res.status(201).json({
            success: true,
            data: { id: result.insertId },
            message: '游戏创建成功',
        })
    } catch (err) {
        req.log.error('POST /games 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ─────────────────────────────────────────────────────────────────
// PUT /api/games/:id — 更新游戏（需鉴权）
// ─────────────────────────────────────────────────────────────────
router.put('/:id', adminAuth, [
    param('id').isInt({ min: 1 }).withMessage('id 必须是正整数'),
    body('name').optional().trim().notEmpty().withMessage('名称不能为空')
        .isLength({ max: 255 }).withMessage('名称最长 255 字符'),
    body('game_type').optional().isIn(['html', 'canvas']).withMessage('game_type 值不合法'),
    body('description').optional().isLength({ max: 2000 }).withMessage('介绍最长 2000 字符'),
    body('tags').optional().isLength({ max: 500 }).withMessage('标签最长 500 字符'),
    body('author').optional().isLength({ max: 100 }).withMessage('作者最长 100 字符'),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('sort_order 必须是非负整数'),
    validate,
], async (req, res) => {
    try {
        const allowed = ['name', 'description', 'image_url', 'game_code',
            'game_type', 'tags', 'author', 'sort_order', 'is_active']
        const fields = []
        const values = []

        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                fields.push(`${key} = ?`)
                values.push(req.body[key])
            }
        }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: '没有可更新的字段' })
        }

        fields.push('updated_at = NOW()')
        values.push(req.params.id)

        const [result] = await db.execute(
            `UPDATE s_g_games SET ${fields.join(', ')} WHERE id = ?`,
            values
        )

        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: '游戏不存在' })
        }

        res.json({ success: true, message: '更新成功' })
    } catch (err) {
        req.log.error('PUT /games/:id 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /api/games/:id — 下架游戏（软删除，需鉴权）
// ─────────────────────────────────────────────────────────────────
router.delete('/:id', adminAuth, [
    param('id').isInt({ min: 1 }).withMessage('id 必须是正整数'),
    validate,
], async (req, res) => {
    try {
        const [result] = await db.execute(
            'UPDATE s_g_games SET is_active = 0, updated_at = NOW() WHERE id = ?',
            [req.params.id]
        )
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: '游戏不存在' })
        }
        req.log.info('游戏已下架', { id: req.params.id })
        res.json({ success: true, message: '游戏已下架' })
    } catch (err) {
        req.log.error('DELETE /games/:id 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ─────────────────────────────────────────────────────────────────
// POST /api/games/:id/play — 记录游玩次数（公开）
// ─────────────────────────────────────────────────────────────────
router.post('/:id/play', [
    param('id').isInt({ min: 1 }).withMessage('id 必须是正整数'),
    validate,
], async (req, res) => {
    try {
        await db.execute(
            'UPDATE s_g_games SET play_count = play_count + 1 WHERE id = ? AND is_active = 1',
            [req.params.id]
        )
        res.json({ success: true })
    } catch (err) {
        req.log.error('POST /games/:id/play 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

module.exports = router