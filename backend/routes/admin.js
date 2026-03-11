// routes/admin.js
const express = require('express')
const db = require('../config/database')
const { generateToken, adminAuth } = require('../middleware/auth')
const router = express.Router()

// ── POST /api/admin/login  管理员登录 ─────────────────────────────
router.post('/login', (req, res) => {
    const { password } = req.body || {}
    if (!password) {
        return res.status(400).json({ success: false, message: '请输入密码' })
    }
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: '密码错误' })
    }
    const token = generateToken(password)
    res.json({ success: true, data: { token }, message: '登录成功' })
})

// ── GET /api/admin/settings  获取所有配置（公开，前端权限判断用）
router.get('/settings', async (_req, res) => {
    try {
        const [rows] = await db.execute('SELECT `key`, `value` FROM s_g_settings')
        const settings = {}
        rows.forEach(r => { settings[r.key] = r.value === '1' })
        res.json({ success: true, data: settings })
    } catch (err) {
        console.error('[GET /admin/settings]', err)
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── PUT /api/admin/settings  更新配置（需要 token）────────────────
router.put('/settings', adminAuth, async (req, res) => {
    try {
        const allowed = ['editor_enabled', 'upload_enabled']
        const updates = []

        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                const val = req.body[key] ? '1' : '0'
                updates.push(
                    db.execute(
                        'INSERT INTO s_g_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
                        [key, val, val]
                    )
                )
            }
        }

        if (!updates.length) {
            return res.status(400).json({ success: false, message: '没有可更新的配置' })
        }

        await Promise.all(updates)
        res.json({ success: true, message: '配置已更新' })
    } catch (err) {
        console.error('[PUT /admin/settings]', err)
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})

// ── POST /api/admin/logout  登出（前端清除 token 即可）────────────
router.post('/logout', adminAuth, (_req, res) => {
    res.json({ success: true, message: '已登出' })
})

module.exports = router