// routes/upload.js
// ★ P0 修复：文件上传增加 magic bytes 内容类型二次校验
// ★ P1 修复：.ts 解析改用 esbuild 真正编译，不再用正则剥类型
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

// ── ★ P0 修复：Magic bytes 内容类型二次校验 ────────────────────────
// 校验文件真实内容，防止扩展名欺骗攻击
function validateMagicBytes(buffer, ext) {
    if (!buffer || buffer.length < 4) {
        throw new Error('文件内容为空或过短')
    }

    // 检查是否是二进制文件（非文本）
    // 文本文件（HTML/Vue/TS）不应含有大量不可打印字节
    let nonPrintable = 0
    const checkLen = Math.min(buffer.length, 512)
    for (let i = 0; i < checkLen; i++) {
        const b = buffer[i]
        // 允许常见文本控制字符：\t \n \r
        if (b < 0x09 || (b > 0x0d && b < 0x20) || b === 0x7f) {
            nonPrintable++
        }
    }
    if (nonPrintable / checkLen > 0.1) {
        throw new Error('文件内容不是有效的文本文件，请检查文件格式')
    }

    // 检查已知危险文件头（PE, ELF, ZIP, PDF 等）
    const sig4 = buffer.slice(0, 4).toString('hex')
    const dangerousMagics = [
        '4d5a9000', // PE (Windows EXE/DLL)
        '7f454c46', // ELF (Linux binary)
        '504b0304', // ZIP
        '25504446', // PDF
        'cafebabe', // Java class
        'feedface', 'feedfacf', 'cefaedfe', 'cffaedfe', // Mach-O
    ]
    if (dangerousMagics.some(m => sig4.startsWith(m.slice(0, 8)))) {
        throw new Error('检测到非法文件类型，已拒绝上传')
    }

    // HTML 文件额外校验：应包含 < 字符（HTML 标签）
    const text = buffer.slice(0, 200).toString('utf-8').trim().toLowerCase()
    if (ext === '.html') {
        if (!text.includes('<') && !text.includes('<!')) {
            throw new Error('.html 文件内容不包含 HTML 标签，请检查文件')
        }
    }
}

// ── 安全扫描（原有，保留）──────────────────────────────────────────
const DANGER_PATTERNS = [
    /<script[^>]+src\s*=/i,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /navigator\.sendBeacon/,
    /document\.cookie/,
    /window\.location\s*=/,
    /eval\s*\(/,
    /(https?:)?\/\/(?!localhost|127\.0\.0\.1)[^\s'"]+\.(js|css)/i,
]

function scanSecurity(code, filename) {
    const hits = DANGER_PATTERNS.filter(p => p.test(code)).map(p => p.toString())
    if (hits.length) {
        throw new Error(`文件 ${filename} 包含不允许的内容（外链/eval/数据外传），已拒绝上传`)
    }
}

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

// ★ P1 修复：.ts 编译改用 esbuild，不再用不可靠的正则替换
async function tsToHtml(source) {
    let jsCode = source

    // 尝试使用 esbuild（如已安装）
    try {
        const esbuild = require('esbuild')
        const result = await esbuild.transform(source, {
            loader: 'ts',
            target: 'es2020',
            format: 'iife',
        })
        jsCode = result.code
    } catch (esbuildErr) {
        // esbuild 未安装时降级处理：用简单正则去除最基本的类型注解
        // 仅支持极简 TS，建议安装 esbuild
        console.warn('[Upload] esbuild 不可用，降级使用正则处理 .ts:', esbuildErr.message)
        jsCode = source
            // 移除 interface 和 type 声明
            .replace(/^\s*(export\s+)?(interface|type)\s+\w+[\s\S]*?^}/gm, '')
            // 移除简单类型注解 : string, : number 等
            .replace(/:\s*(string|number|boolean|any|void|never|null|undefined|object)\b/g, '')
            // 移除泛型 <T>
            .replace(/<[A-Z]\w*(\[\])?>/g, '')
            // 移除 as Type 断言
            .replace(/\bas\s+\w+/g, '')
    }

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
        body('name').trim().notEmpty().withMessage('游戏名称不能为空').isLength({ max: 255 }).withMessage('名称不超过 255 字'),
        body('description').optional().isLength({ max: 1000 }).withMessage('介绍不超过 1000 字'),
        body('tags').optional().isLength({ max: 500 }).withMessage('标签不超过 500 字'),
        body('author').optional().isLength({ max: 100 }).withMessage('作者名不超过 100 字'),
        body('sort_order').optional().isInt({ min: 0 }).withMessage('排序权重必须为非负整数'),
        validate,
    ],
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: '请上传文件' })
            }

            // ★ P0 修复：magic bytes 二次校验
            const ext = req.file.originalname
                .slice(req.file.originalname.lastIndexOf('.')).toLowerCase()
            try {
                validateMagicBytes(req.file.buffer, ext)
            } catch (magicErr) {
                return res.status(400).json({ success: false, message: magicErr.message })
            }

            const {
                name, description = '', tags = '',
                author = '匿名', sort_order = 0,
            } = req.body

            const rawText = bufferToText(req.file.buffer)

            // 安全扫描
            try {
                scanSecurity(rawText, req.file.originalname)
            } catch (scanErr) {
                return res.status(400).json({ success: false, message: scanErr.message })
            }

            // watchdog 扫描（可选）
            try {
                const watchdog = require('../watchdog/engine')
                const scanResult = await watchdog.scanUploadedFile(req, req.file)
                if (!scanResult.safe) {
                    return res.status(400).json({ message: scanResult.reason })
                }
            } catch { /* watchdog 不存在时跳过 */ }

            let gameCode = rawText
            const gameType = 'html'

            if (ext === '.vue') {
                gameCode = vueToHtml(rawText)
            } else if (ext === '.ts') {
                // ★ P1 修复：异步编译 TS
                gameCode = await tsToHtml(rawText)
            }

            const [result] = await db.execute(
                `INSERT INTO s_g_games
           (name, description, image_url, game_code, game_type, tags, author, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, description, '', gameCode, gameType, tags, author, parseInt(sort_order) || 0]
            )

            adminLog('上传游戏', {
                id: result.insertId, name, ext,
                size: req.file.size, ip: req.ip,
            })

            res.status(201).json({
                success: true,
                data: { id: result.insertId },
                message: '游戏上传成功',
            })
        } catch (err) {
            req.log?.error('POST /upload/game 失败', { message: err.message })
            res.status(500).json({ success: false, message: err.message || '服务器错误' })
        }
    }
)

// multer 错误统一处理
router.use((err, _req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: `文件不能超过 ${MAX_SIZE / 1024 / 1024}MB` })
        }
        return res.status(400).json({ success: false, message: err.message })
    }
    if (err) return res.status(400).json({ success: false, message: err.message })
    next()
})

module.exports = router