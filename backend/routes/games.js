// routes/games.js
const express = require('express')
const { body, param, query } = require('express-validator')
const { validate } = require('../middleware/validate')
const { adminAuth } = require('../middleware/auth')
const { adminLog } = require('../middleware/logger')
const db = require('../config/database')
const router = express.Router()

// ── GET /api/games ────────────────────────────────────────────────
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('page 必须为正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit 范围 1~100'),
    validate,
], async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 12
        const offset = (page - 1) * limit
        const search = req.query.search?.trim() || ''
        const tags = req.query.tags?.trim() || ''

        let where = 'WHERE is_active = 1'
        const params = []

        if (search) {
            where += ' AND MATCH(name, description, tags) AGAINST(? IN BOOLEAN MODE)'
            params.push(`${search}*`)
        }
        if (tags) {
            where += ' AND FIND_IN_SET(?, tags)'
            params.push(tags)
        }

        const [[{ total }]] = await db.execute(
            `SELECT COUNT(*) AS total FROM s_g_games ${where}`, params
        )
        const [rows] = await db.execute(
            `SELECT id, name, description, image_url, game_type, tags,
              author, play_count, sort_order, created_at
       FROM s_g_games ${where}
       ORDER BY sort_order DESC, created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
            params
        )
        res.json({
            success: true,
            data: { list: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
        })
    } catch (err) {
        req.log.error('GET /games failed', { err: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── GET /api/games/:id ────────────────────────────────────────────
router.get('/:id', [
    param('id').isInt({ min: 1 }).withMessage('id 必须为正整数'),
    validate,
], async (req, res) => {
    try {
        const [[game]] = await db.execute(
            'SELECT * FROM s_g_games WHERE id = ? AND is_active = 1', [req.params.id]
        )
        if (!game) return res.status(404).json({ success: false, message: '游戏不存在或已下架' })
        res.json({ success: true, data: game })
    } catch (err) {
        req.log.error('GET /games/:id failed', { err: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── POST /api/games  ⚠️ 需要管理员 token ─────────────────────────
router.post('/', adminAuth, [
    body('name').trim().notEmpty().withMessage('游戏名称不能为空').isLength({ max: 255 }).withMessage('名称不超过 255 字'),
    body('game_code').notEmpty().withMessage('游戏代码不能为空'),
    body('game_type').optional().isIn(['html', 'canvas']).withMessage('game_type 只能为 html 或 canvas'),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('sort_order 必须为非负整数'),
    validate,
], async (req, res) => {
    try {
        const { name, description = '', image_url = '', game_code, game_type = 'html',
            tags = '', author = '匿名', sort_order = 0 } = req.body

        const [result] = await db.execute(
            `INSERT INTO s_g_games (name, description, image_url, game_code, game_type, tags, author, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, description, image_url, game_code, game_type, tags, author, parseInt(sort_order)]
        )
        adminLog('新增游戏', { id: result.insertId, name })
        res.status(201).json({ success: true, data: { id: result.insertId }, message: '新增成功' })
    } catch (err) {
        req.log.error('POST /games failed', { err: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── PUT /api/games/:id  ⚠️ 需要管理员 token ──────────────────────
router.put('/:id', adminAuth, [
    param('id').isInt({ min: 1 }).withMessage('id 必须为正整数'),
    body('name').optional().trim().notEmpty().withMessage('游戏名称不能为空').isLength({ max: 255 }),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('sort_order 必须为非负整数'),
    validate,
], async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const allowed = ['name', 'description', 'image_url', 'game_code',
            'game_type', 'tags', 'author', 'sort_order', 'is_active']
        const fields = []
        const values = []
        allowed.forEach(f => {
            if (req.body[f] !== undefined) {
                fields.push(`${f} = ?`)
                values.push(req.body[f])
            }
        })
        if (!fields.length) {
            return res.status(400).json({ success: false, message: '没有可更新的字段' })
        }
        values.push(id)
        const [result] = await db.execute(
            `UPDATE s_g_games SET ${fields.join(', ')} WHERE id = ?`, values
        )
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '游戏不存在' })
        }
        adminLog('更新游戏', { id, fields: fields.map(f => f.split(' ')[0]) })
        res.json({ success: true, message: '更新成功' })
    } catch (err) {
        req.log.error('PUT /games/:id failed', { err: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── DELETE /api/games/:id  ⚠️ 需要管理员 token ───────────────────
router.delete('/:id', adminAuth, [
    param('id').isInt({ min: 1 }).withMessage('id 必须为正整数'),
    validate,
], async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        // 软删除：is_active = 0
        const [result] = await db.execute(
            'UPDATE s_g_games SET is_active = 0 WHERE id = ?', [id]
        )
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '游戏不存在' })
        }
        adminLog('下架游戏(软删除)', { id })
        res.json({ success: true, message: '已下架' })
    } catch (err) {
        req.log.error('DELETE /games/:id failed', { err: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── POST /api/games/:id/play ──────────────────────────────────────
router.post('/:id/play', [
    param('id').isInt({ min: 1 }).withMessage('id 必须为正整数'),
    validate,
], async (req, res) => {
    try {
        await db.execute(
            'UPDATE s_g_games SET play_count = play_count + 1 WHERE id = ? AND is_active = 1',
            [req.params.id]
        )
        res.json({ success: true })
    } catch (err) {
        req.log.error('POST /games/:id/play failed', { err: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

module.exports = router