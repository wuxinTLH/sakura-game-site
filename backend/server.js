// server.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const { requestLogger, logger } = require('./middleware/logger')
const savesRouter = require('./routes/saves')
const assetsRouter = require('./routes/assets')

const gamesRouter = require('./routes/games')
const uploadRouter = require('./routes/upload')
const adminRouter = require('./routes/admin')

const app = express()
const PORT = process.env.PORT || 8802

// 登录限流
const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, message: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
})

// 全局限流
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: { success: false, message: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
})

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8801')
    .split(',').map(s => s.trim())

app.use(cors({
    origin(origin, cb) {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
        cb(new Error(`CORS blocked: ${origin}`))
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token'],
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(globalLimiter)
app.use(requestLogger)    // Winston 请求日志

// 把 logger 挂到 req 上，方便路由内使用 req.log
app.use((req, _res, next) => {
    req.log = logger
    next()
})

app.use('/api/games', gamesRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/admin/login', loginLimiter)
app.use('/api/admin', adminRouter)
app.use('/api/saves', savesRouter)
app.use('/api/assets', assetsRouter)

app.get('/api/health', async (_req, res) => {
    let dbOk = false
    try {
        await db.execute('SELECT 1')
        dbOk = true
    } catch { /* ignore */ }

    const status = dbOk ? 200 : 503
    res.status(status).json({
        success: dbOk,
        status: dbOk ? 'ok' : 'degraded',
        db: dbOk ? 'connected' : 'disconnected',
        uptime: Math.floor(process.uptime()),
        ts: new Date().toISOString(),
    })
})

// 404
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Not Found' })
})

// 全局错误处理
app.use((err, req, res, _next) => {
    logger.error('Unhandled error', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
    })
    res.status(500).json({ success: false, message: '服务器内部错误' })
})

// 未捕获异常兜底
process.on('uncaughtException', err => {
    logger.error('uncaughtException', { message: err.message, stack: err.stack })
    process.exit(1)
})
process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection', { reason: String(reason) })
})

app.listen(PORT, () => {
    logger.info(`桜游戏屋 API 运行在 http://localhost:${PORT}`)
    console.log(`🌸  桜游戏屋 API 运行在 http://localhost:${PORT}`)
})