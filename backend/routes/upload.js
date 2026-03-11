// routes/upload.js
const express = require('express')
const multer = require('multer')
const db = require('../config/database')
const router = express.Router()

// 内存存储，不落盘
const storage = multer.memoryStorage()
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter(_req, file, cb) {
        const allowed = ['.html', '.vue', '.ts']
        const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase()
        if (allowed.includes(ext)) {
            cb(null, true)
        } else {
            cb(new Error('仅支持 .html / .vue / .ts 文件'))
        }
    },
})

// ── 二进制 Buffer → UTF-8 文本 ────────────────────────────────────
function bufferToText(buffer) {
    return buffer.toString('utf-8')
}

// ── .vue 文件提取并转换为可运行 HTML ──────────────────────────────
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

// ── .ts 文件包装为可运行 HTML ─────────────────────────────────────
function tsToHtml(source) {
    // 移除 TypeScript 类型注解，保留可运行的 JS 逻辑
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
    background: #1a1a2e;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    font-family: sans-serif;
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

// ── POST /api/upload/game  上传并保存游戏 ─────────────────────────
router.post('/game', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '请上传文件' })
        }

        const { name, description = '', tags = '', author = '匿名', sort_order = 0 } = req.body
        if (!name) {
            return res.status(400).json({ success: false, message: '游戏名称不能为空' })
        }

        // 二进制 Buffer 解构为文本
        const rawText = bufferToText(req.file.buffer)
        const ext = req.file.originalname.slice(req.file.originalname.lastIndexOf('.')).toLowerCase()

        let gameCode = rawText
        let gameType = 'html'

        if (ext === '.vue') {
            gameCode = vueToHtml(rawText)
            gameType = 'html'
        } else if (ext === '.ts') {
            gameCode = tsToHtml(rawText)
            gameType = 'html'
        }
        // .html 直接存原文

        const [result] = await db.execute(
            `INSERT INTO s_g_games
         (name, description, image_url, game_code, game_type, tags, author, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, description, '', gameCode, gameType, tags, author, parseInt(sort_order) || 0]
        )

        res.status(201).json({
            success: true,
            data: { id: result.insertId },
            message: '游戏上传成功',
        })
    } catch (err) {
        console.error('[POST /upload/game]', err)
        res.status(500).json({ success: false, message: err.message || '服务器错误' })
    }
})

module.exports = router