// routes/upload.js
const express = require('express')
const multer = require('multer')
const { body } = require('express-validator')
const { validate } = require('../middleware/validate')
const { adminAuth } = require('../middleware/auth')
const { adminLog } = require('../middleware/logger')
const db = require('../config/database')
const router = express.Router()

const ALLOWED_EXT = ['.html', '.vue', '.ts']
const MAX_SIZE = 10 * 1024 * 1024  // 10MB

const storage = multer.memoryStorage()
const upload = multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter(_req, file, cb) {
        const ext = file.originalname
            .slice(file.originalname.lastIndexOf('.')).toLowerCase()
        if (ALLOWED_EXT.includes(ext)) {
            cb(null, true)
        } else {
            cb(new Error(`不支持的文件类型 ${ext}，仅支持 ${ALLOWED_EXT.join(' / ')}`))
        }
    },
})

// ── 文件解析工具 ──────────────────────────────────────────────────
function bufferToText(buffer) {
    return buffer.toString('utf-8')
}

function vueToHtml(source) {
    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/)
    const scriptMatch = source.match(/<script(?:[^>]*)>([\s\S]*?)<\/script>/)
    const styleMatch = source.match(/<style(?:[^>]*)>([\s\S]*?)<\/style>/)

    const template = templateMatch ? templateMatch[1].trim() : '<div>无模板内容</div>'
    const script = scriptMatch ? scriptMatch[1].trim() : ''
    const style = styleMatch ? styleMatch[1].trim() : ''

    return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>游戏</title>
<style>
${style}
</style>
</head>
<body>
${template}
<script>
${script}
<\/script>
</body>
</html>`
}

function tsToHtml(source) {
    const jsCode = source
        .replace(/:\s*(string|number|boolean|any|void|never|null|undefined|object)\b/g, '')
        .replace(/:\s*\w+(\[\])?(\s*\|[^=,;)]+)*/g, '')
        .replace(/<[A-Z]\w*>/g, '')
        .replace(/interface\s+\w+\s*\{[^}]*\}/gs, '')
        .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')

    return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>游戏</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1a1a2e; color: #fff;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; font-family: sans-serif;
  }
</style>
</head>
<body>
<canvas id="c" width="480" height="480" style="display:none"></canvas>
<div id="app"></div>
<script>
${jsCode}
<\/script>
</body>
</html>`
}

// ── POST /api/upload/game ─────────────────────────────────────────
router.post('/game',
    adminAuth,
    upload.single('file'),
    [
        body('name')
            .trim()
            .notEmpty().withMessage('游戏名称不能为空')
            .isLength({ max: 255 }).withMessage('名称不超过 255 字'),
        body('description')
            .optional()
            .isLength({ max: 1000 }).withMessage('介绍不超过 1000 字'),
        body('tags')
            .optional()
            .isLength({ max: 500 }).withMessage('标签不超过 500 字'),
        body('author')
            .optional()
            .isLength({ max: 100 }).withMessage('作者名不超过 100 字'),
        body('sort_order')
            .optional()
            .isInt({ min: 0 }).withMessage('排序权重必须为非负整数'),
        validate,
    ],
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: '请上传文件' })
            }

            const {
                name,
                description = '',
                tags = '',
                author = '匿名',
                sort_order = 0,
            } = req.body

            // 二进制 Buffer 解构为文本
            const rawText = bufferToText(req.file.buffer)
            const ext = req.file.originalname
                .slice(req.file.originalname.lastIndexOf('.')).toLowerCase()

            let gameCode = rawText
            let gameType = 'html'

            if (ext === '.vue') {
                gameCode = vueToHtml(rawText)
            } else if (ext === '.ts') {
                gameCode = tsToHtml(rawText)
            }

            const [result] = await db.execute(
                `INSERT INTO s_g_games
           (name, description, image_url, game_code, game_type, tags, author, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, description, '', gameCode, gameType, tags, author, parseInt(sort_order) || 0]
            )

            adminLog('上传游戏', {
                id: result.insertId,
                name,
                ext,
                size: req.file.size,
                ip: req.ip,
            })

            res.status(201).json({
                success: true,
                data: { id: result.insertId },
                message: '游戏上传成功',
            })
        } catch (err) {
            req.log.error('POST /upload/game 失败', { message: err.message })
            res.status(500).json({ success: false, message: err.message || '服务器错误' })
        }
    }
)

// multer 文件类型/大小错误统一处理
router.use((err, _req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: `文件不能超过 ${MAX_SIZE / 1024 / 1024}MB` })
        }
        return res.status(400).json({ success: false, message: err.message })
    }
    if (err) {
        return res.status(400).json({ success: false, message: err.message })
    }
    next()
})

module.exports = router