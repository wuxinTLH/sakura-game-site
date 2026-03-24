/**
 * backend/routes/watchdog.js
 * WatchDog 管理 API（全部需要管理员鉴权）
 *
 * GET    /api/watchdog/stats          总览统计
 * GET    /api/watchdog/events         事件列表（支持筛选）
 * GET    /api/watchdog/blocklist      封禁列表
 * POST   /api/watchdog/ban            手动封禁 IP
 * DELETE /api/watchdog/ban/:ip        解封 IP
 * POST   /api/watchdog/resolve/:id    标记事件已处置
 * GET    /api/watchdog/health         最近系统健康快照
 * GET    /api/watchdog/top-threats    威胁来源 TOP10
 */

'use strict'

const express = require('express')
const router  = express.Router()
const { adminAuth }  = require('../middleware/auth')
const watchdog = require('../watchdog/engine')
const pool     = require('../config/database')

// 所有 WatchDog 管理接口均需管理员鉴权
router.use(adminAuth)

// ── GET /api/watchdog/stats ───────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const stats = await watchdog.getStats()
        res.json({ success: true, data: stats })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// ── GET /api/watchdog/events ──────────────────────────────────
// 查询参数: severity(1-4), event_type, ip, limit(默认50), page(默认1)
router.get('/events', async (req, res) => {
    try {
        const { severity, event_type, ip, limit = 50, page = 1 } = req.query
        const offset = (Number(page) - 1) * Number(limit)

        const conditions = []
        const values     = []

        if (severity)    { conditions.push('severity >= ?');    values.push(Number(severity)) }
        if (event_type)  { conditions.push('event_type = ?');   values.push(event_type) }
        if (ip)          { conditions.push('ip LIKE ?');        values.push(`%${ip}%`) }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM wd_events ${where}`, values
        )
        const [rows] = await pool.query(
            `SELECT * FROM wd_events ${where}
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...values, Number(limit), offset]
        )

        res.json({
            success: true,
            total,
            page:  Number(page),
            pages: Math.ceil(total / Number(limit)),
            data:  rows,
        })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// ── GET /api/watchdog/blocklist ───────────────────────────────
router.get('/blocklist', async (req, res) => {
    try {
        const list = await watchdog.getBlocklist()
        res.json({ success: true, data: list })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// ── POST /api/watchdog/ban ────────────────────────────────────
// body: { ip, reason, duration_hours }（duration_hours 为 null = 永久）
router.post('/ban', async (req, res) => {
    const { ip, reason, duration_hours } = req.body
    if (!ip || !reason) {
        return res.status(400).json({ message: 'ip 和 reason 为必填项' })
    }
    // 基本 IP 格式校验
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
    const ipv6 = /^[0-9a-fA-F:]+$/
    if (!ipv4.test(ip) && !ipv6.test(ip)) {
        return res.status(400).json({ message: 'IP 格式无效' })
    }
    try {
        await watchdog.banIP(ip, reason, duration_hours ?? null, 'manual')
        res.json({ success: true, message: `已封禁 ${ip}` })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// ── DELETE /api/watchdog/ban/:ip ──────────────────────────────
router.delete('/ban/:ip', async (req, res) => {
    try {
        const ip = decodeURIComponent(req.params.ip)
        await watchdog.unbanIP(ip)
        res.json({ success: true, message: `已解封 ${ip}` })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// ── POST /api/watchdog/resolve/:id ────────────────────────────
router.post('/resolve/:id', async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE wd_events SET resolved = 1 WHERE id = ?',
            [req.params.id]
        )
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '事件不存在' })
        }
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// ── GET /api/watchdog/health ──────────────────────────────────
router.get('/health', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM wd_health_snapshots ORDER BY created_at DESC LIMIT 24`
        )
        res.json({ success: true, data: rows })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// ── GET /api/watchdog/top-threats ────────────────────────────
router.get('/top-threats', async (req, res) => {
    try {
        const [byIP] = await pool.query(
            `SELECT ip, COUNT(*) AS event_count, MAX(severity) AS max_severity
             FROM wd_events
             WHERE created_at > NOW() - INTERVAL 24 HOUR
             GROUP BY ip ORDER BY event_count DESC LIMIT 10`
        )
        const [byType] = await pool.query(
            `SELECT event_type, COUNT(*) AS count
             FROM wd_events
             WHERE created_at > NOW() - INTERVAL 24 HOUR
             GROUP BY event_type ORDER BY count DESC`
        )
        res.json({ success: true, data: { by_ip: byIP, by_type: byType } })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

module.exports = router