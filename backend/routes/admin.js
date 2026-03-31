// routes/admin.js
const express = require('express')
const db = require('../config/database')
const { generateToken, verifyPassword, revokeToken, adminAuth } = require('../middleware/auth')
const router = express.Router()
const { body, param, query } = require('express-validator')
const { validate } = require('../middleware/validate')
const { adminLog } = require('../middleware/logger')

// 尝试加载 watchdog，不存在时降级
let watchdog
try {
    watchdog = require('../watchdog/engine')
} catch {
    watchdog = { recordAuthFailure: () => {}, recordTokenAbuse: () => {} }
}

// ── POST /api/admin/login ──────────────────────────────────────────
// 修复：原版第一套 handler 用明文比较密码（bypasses bcrypt），第二套含 bcrypt 的
// handler 是死代码（被第一套覆盖）。现合并为唯一正确版本。
router.post('/login', [
    body('password').notEmpty().withMessage('密码不能为空'),
    validate,
], async (req, res) => {
    const { password } = req.body
    const ok = await verifyPassword(password)
    if (!ok) {
        req.log?.warn('管理员登录失败', { ip: req.ip })
        watchdog.recordAuthFailure(req, '管理员密码错误')
        return res.status(401).json({ success: false, message: '密码错误' })
    }
    const token = generateToken()
    adminLog('管理员登录成功', { ip: req.ip })
    res.json({ success: true, data: { token }, message: '登录成功' })
})

// ── POST /api/admin/logout ────────────────────────────────────────
router.post('/logout', adminAuth, (req, res) => {
    revokeToken(req.adminToken)
    adminLog('管理员登出', { ip: req.ip })
    res.json({ success: true, message: '已登出' })
})

// ── GET /api/admin/settings  公开 ────────────────────────────────
router.get('/settings', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT `key`, `value` FROM s_g_settings')
        const settings = {}
        rows.forEach(r => { settings[r.key] = r.value === '1' })
        res.json({ success: true, data: settings })
    } catch (err) {
        req.log?.error('GET /admin/settings 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── PUT /api/admin/settings  需要 token ──────────────────────────
// 修复：合并两套 handler，保留完整的参数校验和审计日志
router.put('/settings', adminAuth, [
    body('editor_enabled').optional().isBoolean().withMessage('必须为布尔值'),
    body('upload_enabled').optional().isBoolean().withMessage('必须为布尔值'),
    validate,
], async (req, res) => {
    try {
        const allowed = ['editor_enabled', 'upload_enabled']
        const updates = []
        const changed = {}

        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                const val = req.body[key] ? '1' : '0'
                changed[key] = req.body[key]
                updates.push(db.execute(
                    'INSERT INTO s_g_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
                    [key, val, val]
                ))
            }
        }

        if (!updates.length) {
            return res.status(400).json({ success: false, message: '没有可更新的配置' })
        }

        await Promise.all(updates)
        adminLog('更新站点配置', { changed, ip: req.ip })
        res.json({ success: true, message: '配置已更新' })
    } catch (err) {
        req.log?.error('PUT /admin/settings 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── GET /api/admin/games  游戏管理列表（含下架）────────────────────
// 修复：合并两套 handler，加参数校验，支持 status/sort 筛选
router.get('/games', adminAuth, [
    query('page').optional().isInt({ min: 1 }).withMessage('page 必须为正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit 范围 1~100'),
    validate,
], async (req, res) => {
    try {
        const page   = parseInt(req.query.page)  || 1
        const limit  = parseInt(req.query.limit) || 15
        const offset = (page - 1) * limit
        const search = req.query.search?.trim() || ''
        const status = req.query.status   // 'active' | 'inactive' | undefined
        const sort   = req.query.sort     // 'newest' | 'hottest' | 'order'

        const SORT_MAP = {
            newest:  'created_at DESC',
            hottest: 'play_count DESC',
            order:   'sort_order DESC, created_at DESC',
        }
        const orderBy = SORT_MAP[sort] || SORT_MAP.newest

        let where = 'WHERE 1=1'
        const params = []

        if (search) {
            where += ' AND (name LIKE ? OR description LIKE ? OR tags LIKE ?)'
            params.push(`%${search}%`, `%${search}%`, `%${search}%`)
        }
        if (status === 'active')   { where += ' AND is_active = 1' }
        if (status === 'inactive') { where += ' AND is_active = 0' }

        const [[{ total }]] = await db.execute(
            `SELECT COUNT(*) AS total FROM s_g_games ${where}`, params
        )
        const [rows] = await db.execute(
            `SELECT id, name, description, image_url, tags, author, play_count,
              sort_order, is_active, game_type, created_at, updated_at
       FROM s_g_games ${where}
       ORDER BY ${orderBy}
       LIMIT ${limit} OFFSET ${offset}`,
            params
        )

        res.json({
            success: true,
            data: {
                list: rows,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            },
        })
    } catch (err) {
        req.log?.error('GET /admin/games 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── PUT /api/admin/games/:id  编辑游戏基本信息 ────────────────────
router.put('/games/:id', adminAuth, [
    param('id').isInt({ min: 1 }).withMessage('id 必须为正整数'),
    body('name').optional().trim().notEmpty().isLength({ max: 255 }),
    body('sort_order').optional().isInt({ min: 0 }),
    body('is_active').optional().isIn([0, 1]).withMessage('is_active 只能为 0 或 1'),
    validate,
], async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        // 允许更新的字段（包含 game_code 和 image_url）
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

        fields.push('updated_at = NOW()')
        values.push(id)

        const [result] = await db.execute(
            `UPDATE s_g_games SET ${fields.join(', ')} WHERE id = ?`, values
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '游戏不存在' })
        }

        adminLog('编辑游戏', { id, fields: Object.keys(req.body), ip: req.ip })
        res.json({ success: true, message: '更新成功' })
    } catch (err) {
        req.log?.error('PUT /admin/games/:id 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── DELETE /api/admin/games/:id  硬删除 ──────────────────────────
router.delete('/games/:id', adminAuth, [
    param('id').isInt({ min: 1 }).withMessage('id 必须为正整数'),
    validate,
], async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const [[game]] = await db.execute('SELECT name FROM s_g_games WHERE id = ?', [id])
        if (!game) {
            return res.status(404).json({ success: false, message: '游戏不存在' })
        }
        await db.execute('DELETE FROM s_g_games WHERE id = ?', [id])
        adminLog('永久删除游戏', { id, name: game.name, ip: req.ip })
        res.json({ success: true, message: '已永久删除' })
    } catch (err) {
        req.log?.error('DELETE /admin/games/:id 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── PUT /api/admin/games/:id/toggle  上下架切换 ───────────────────
router.put('/games/:id/toggle', adminAuth, [
    param('id').isInt({ min: 1 }).withMessage('id 必须为正整数'),
    validate,
], async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const [[game]] = await db.execute(
            'SELECT name, is_active FROM s_g_games WHERE id = ?', [id]
        )
        if (!game) {
            return res.status(404).json({ success: false, message: '游戏不存在' })
        }
        const newStatus = game.is_active ? 0 : 1
        await db.execute('UPDATE s_g_games SET is_active = ?, updated_at = NOW() WHERE id = ?', [newStatus, id])
        adminLog('切换游戏状态', { id, name: game.name, newStatus: newStatus ? '上架' : '下架', ip: req.ip })
        res.json({ success: true, data: { is_active: newStatus }, message: newStatus ? '已上架' : '已下架' })
    } catch (err) {
        req.log?.error('PUT /admin/games/:id/toggle 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── GET /api/admin/stats ──────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const [[{ total }]]      = await db.execute('SELECT COUNT(*) AS total FROM s_g_games')
        const [[{ active }]]     = await db.execute('SELECT COUNT(*) AS active FROM s_g_games WHERE is_active = 1')
        const [[{ totalPlays }]] = await db.execute('SELECT COALESCE(SUM(play_count), 0) AS totalPlays FROM s_g_games')
        const [topGames]         = await db.execute(
            'SELECT id, name, play_count, author FROM s_g_games WHERE is_active = 1 ORDER BY play_count DESC LIMIT 5'
        )
        const [recentGames]      = await db.execute(
            'SELECT id, name, created_at, author FROM s_g_games ORDER BY created_at DESC LIMIT 5'
        )
        res.json({
            success: true,
            data: { total, active, inactive: total - active, totalPlays, topGames, recentGames },
        })
    } catch (err) {
        req.log?.error('GET /admin/stats 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── GET /api/admin/api-list  接口文档 ────────────────────────────
router.get('/api-list', adminAuth, (_req, res) => {
    const routes = [
        {
            group: '游戏接口', base: '/api/games', auth: false,
            items: [
                { method: 'GET',    path: '/',          auth: false, desc: '游戏列表', params: 'page, limit, search, tags, sort' },
                { method: 'GET',    path: '/:id',       auth: false, desc: '游戏详情（含代码）', params: 'id' },
                { method: 'POST',   path: '/',          auth: true,  desc: '新增游戏', params: 'name*, game_code*, description, image_url, game_type, tags, author, sort_order' },
                { method: 'PUT',    path: '/:id',       auth: true,  desc: '更新游戏', params: 'id, name, description, image_url, game_code, tags, author, sort_order, is_active' },
                { method: 'DELETE', path: '/:id',       auth: true,  desc: '下架游戏（软删除）', params: 'id' },
                { method: 'POST',   path: '/:id/play',  auth: false, desc: '记录游玩次数', params: 'id' },
            ],
        },
        {
            group: '上传接口', base: '/api/upload', auth: true,
            items: [
                { method: 'POST', path: '/game', auth: true, desc: '上传游戏文件，自动解析入库', params: 'file*(multipart), name*, description, tags, author, sort_order' },
            ],
        },
        {
            group: '标签接口', base: '/api', auth: false,
            items: [
                { method: 'GET', path: '/tags', auth: false, desc: '聚合所有上架游戏标签（去重），末尾追加「其他」', params: '-' },
            ],
        },
        {
            group: '导出接口', base: '/api/export', auth: true,
            items: [
                { method: 'GET', path: '/games/json',   auth: true, desc: '导出游戏元数据 JSON（不含 game_code）', params: '-' },
                { method: 'GET', path: '/games/csv',    auth: true, desc: '导出游戏元数据 CSV（含 UTF-8 BOM）', params: '-' },
                { method: 'GET', path: '/games/backup', auth: true, desc: '完整备份 JSON（含 game_code）', params: '-' },
            ],
        },
        {
            group: '存档接口', base: '/api/saves', auth: false,
            items: [
                { method: 'GET',    path: '/:gameId',       auth: false, desc: '获取游戏所有存档槽', params: 'save_key' },
                { method: 'GET',    path: '/:gameId/:slot', auth: false, desc: '读取单个存档槽', params: 'save_key' },
                { method: 'POST',   path: '/:gameId/:slot', auth: false, desc: '写入存档', params: 'save_key*, save_data*, save_name, play_time' },
                { method: 'DELETE', path: '/:gameId/:slot', auth: false, desc: '删除存档', params: 'save_key' },
            ],
        },
        {
            group: '资源管理器', base: '/api/assets', auth: false,
            items: [
                { method: 'GET',    path: '/quota',         auth: false, desc: '全站资源用量', params: '-' },
                { method: 'GET',    path: '/game/:gameId',  auth: false, desc: '获取游戏可用资源', params: '-' },
                { method: 'GET',    path: '/',              auth: false, desc: '资源列表', params: 'type, game_id, page, limit' },
                { method: 'GET',    path: '/:id',           auth: false, desc: '资源详情（含 data_uri）', params: '-' },
                { method: 'POST',   path: '/',              auth: true,  desc: '上传资源文件（≤2MB）', params: 'file*, game_id' },
                { method: 'DELETE', path: '/:id',           auth: true,  desc: '删除资源', params: '-' },
            ],
        },
        {
            group: '管理员接口', base: '/api/admin', auth: true,
            items: [
                { method: 'POST', path: '/login',              auth: false, desc: '管理员登录，返回 JWT token', params: 'password*' },
                { method: 'POST', path: '/logout',             auth: true,  desc: '登出（Token 黑名单失效）', params: '-' },
                { method: 'GET',  path: '/settings',           auth: false, desc: '获取站点配置（公开）', params: '-' },
                { method: 'PUT',  path: '/settings',           auth: true,  desc: '更新站点配置', params: 'editor_enabled, upload_enabled' },
                { method: 'GET',  path: '/games',              auth: true,  desc: '管理员游戏列表（含下架，支持 status/sort）', params: 'page, limit, search, status, sort' },
                { method: 'PUT',  path: '/games/:id',          auth: true,  desc: '编辑游戏（含 game_code/image_url）', params: 'id, name, description, image_url, game_code, tags, author, sort_order, is_active' },
                { method: 'DELETE', path: '/games/:id',        auth: true,  desc: '永久删除游戏', params: 'id' },
                { method: 'PUT',  path: '/games/:id/toggle',   auth: true,  desc: '切换游戏上下架状态', params: 'id' },
                { method: 'GET',  path: '/stats',              auth: true,  desc: '数据统计', params: '-' },
                { method: 'GET',  path: '/api-list',           auth: true,  desc: '查看全部接口列表', params: '-' },
            ],
        },
        {
            group: '系统接口', base: '/api', auth: false,
            items: [
                { method: 'GET', path: '/health', auth: false, desc: '健康检查（含 DB 状态）', params: '-' },
            ],
        },
    ]

    res.json({
        success: true,
        data: {
            title: '桜游戏屋 API 文档',
            version: '2.0.0',
            baseUrl: `http://localhost:${process.env.PORT || 8802}`,
            authHeader: 'x-admin-token',
            note: '标注 auth:true 的接口需在请求头携带 x-admin-token（登录后获取，有效期 8 小时）',
            routes,
        },
    })
})

module.exports = router