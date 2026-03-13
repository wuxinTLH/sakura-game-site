// backend/routes/saves.js
// 游戏存档接口（公开读写，以 save_key 作为客户端身份标识）
const express = require('express')
const { body, param, query, validationResult } = require('express-validator')
const router = express.Router()
const db = require('../config/database')

function validate(req, res, next) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() })
    }
    next()
}

// ─────────────────────────────────────────────────────────────────
// GET /api/saves/:gameId — 获取某游戏的所有存档槽
// Query: save_key（必传，客户端标识）
// ─────────────────────────────────────────────────────────────────
router.get('/:gameId', [
    param('gameId').isInt({ min: 1 }).withMessage('gameId 必须是正整数'),
    query('save_key').trim().notEmpty().withMessage('save_key 不能为空')
        .isLength({ max: 64 }).withMessage('save_key 最长 64 字符'),
    validate,
], async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, slot, save_name, play_time, created_at, updated_at
       FROM s_g_saves
       WHERE game_id = ? AND save_key = ?
       ORDER BY slot ASC`,
            [req.params.gameId, req.query.save_key]
        )
        res.json({ success: true, data: rows })
    } catch (err) {
        req.log.error('GET /saves/:gameId 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ─────────────────────────────────────────────────────────────────
// GET /api/saves/:gameId/:slot — 读取单个存档（含存档数据）
// Query: save_key（必传）
// ─────────────────────────────────────────────────────────────────
router.get('/:gameId/:slot', [
    param('gameId').isInt({ min: 1 }).withMessage('gameId 必须是正整数'),
    param('slot').isInt({ min: 1, max: 5 }).withMessage('slot 范围 1~5'),
    query('save_key').trim().notEmpty().withMessage('save_key 不能为空'),
    validate,
], async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT * FROM s_g_saves
       WHERE game_id = ? AND slot = ? AND save_key = ?`,
            [req.params.gameId, req.params.slot, req.query.save_key]
        )
        if (!rows.length) {
            return res.status(404).json({ success: false, message: '存档不存在' })
        }
        res.json({ success: true, data: rows[0] })
    } catch (err) {
        req.log.error('GET /saves/:gameId/:slot 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ─────────────────────────────────────────────────────────────────
// POST /api/saves/:gameId/:slot — 写入/覆盖存档
// Body: save_key, save_data, save_name?, play_time?
// ─────────────────────────────────────────────────────────────────
router.post('/:gameId/:slot', [
    param('gameId').isInt({ min: 1 }).withMessage('gameId 必须是正整数'),
    param('slot').isInt({ min: 1, max: 5 }).withMessage('slot 范围 1~5'),
    body('save_key').trim().notEmpty().withMessage('save_key 不能为空')
        .isLength({ max: 64 }).withMessage('save_key 最长 64 字符'),
    body('save_data').notEmpty().withMessage('save_data 不能为空')
        .isLength({ max: 500000 }).withMessage('存档数据不能超过 500KB'),
    body('save_name').optional().isLength({ max: 100 }).withMessage('存档名最长 100 字符'),
    body('play_time').optional().isInt({ min: 0 }).withMessage('play_time 必须是非负整数'),
    validate,
], async (req, res) => {
    const { save_key, save_data, save_name = '', play_time = 0 } = req.body
    const { gameId, slot } = req.params

    try {
        // 检查游戏是否存在
        const [[game]] = await db.execute(
            'SELECT id FROM s_g_games WHERE id = ? AND is_active = 1',
            [gameId]
        )
        if (!game) {
            return res.status(404).json({ success: false, message: '游戏不存在' })
        }

        // UPSERT
        await db.execute(
            `INSERT INTO s_g_saves (game_id, slot, save_key, save_data, save_name, play_time)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         save_data  = VALUES(save_data),
         save_name  = VALUES(save_name),
         play_time  = VALUES(play_time),
         updated_at = NOW()`,
            [gameId, slot, save_key, save_data, save_name, play_time]
        )

        res.json({ success: true, message: '存档保存成功' })
    } catch (err) {
        req.log.error('POST /saves/:gameId/:slot 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /api/saves/:gameId/:slot — 删除存档
// Body: save_key（必传）
// ─────────────────────────────────────────────────────────────────
router.delete('/:gameId/:slot', [
    param('gameId').isInt({ min: 1 }).withMessage('gameId 必须是正整数'),
    param('slot').isInt({ min: 1, max: 5 }).withMessage('slot 范围 1~5'),
    body('save_key').trim().notEmpty().withMessage('save_key 不能为空'),
    validate,
], async (req, res) => {
    try {
        const [result] = await db.execute(
            'DELETE FROM s_g_saves WHERE game_id = ? AND slot = ? AND save_key = ?',
            [req.params.gameId, req.params.slot, req.body.save_key]
        )
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: '存档不存在' })
        }
        res.json({ success: true, message: '存档已删除' })
    } catch (err) {
        req.log.error('DELETE /saves/:gameId/:slot 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

module.exports = router