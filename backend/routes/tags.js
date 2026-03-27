const express = require('express')
const router  = express.Router()
const db      = require('../config/database')
 
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT tags FROM s_g_games WHERE is_active = 1 AND tags IS NOT NULL AND tags != ''`
        )
 
        const tagSet = new Set()
        for (const { tags } of rows) {
            tags.split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0)
                .forEach(t => tagSet.add(t))
        }
 
        // 按中文字典序排序，末尾强制追加「其他」
        const sorted = Array.from(tagSet).sort((a, b) =>
            a.localeCompare(b, 'zh-Hans-CN')
        )
        sorted.push('其他')
 
        res.json({ success: true, data: sorted })
    } catch (err) {
        req.log?.error('GET /tags 失败', { message: err.message })
        res.status(500).json({ success: false, message: '服务器错误' })
    }
})
 
module.exports = router
 