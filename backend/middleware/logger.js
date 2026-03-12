// middleware/logger.js
const winston = require('winston')
const path = require('path')
const fs = require('fs')

// 确保 logs 目录存在
const logDir = path.join(__dirname, '../logs')
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir)

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        // 所有日志写入 combined.log
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5 * 1024 * 1024,  // 5MB 自动滚动
            maxFiles: 5,
        }),
        // 错误单独写入 error.log
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
        }),
    ],
})

// 开发环境同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
                return `${timestamp} [${level}] ${message}${extra}`
            })
        ),
    }))
}

// Express 请求日志中间件
function requestLogger(req, res, next) {
    const start = Date.now()
    res.on('finish', () => {
        const ms = Date.now() - start
        const level = res.statusCode >= 500 ? 'error'
            : res.statusCode >= 400 ? 'warn'
                : 'info'
        logger[level](`${req.method} ${req.originalUrl}`, {
            status: res.statusCode,
            ms,
            ip: req.ip,
            ua: req.get('user-agent')?.slice(0, 80),
        })
    })
    next()
}

// 管理员操作日志
function adminLog(action, detail = {}) {
    logger.info(`[ADMIN] ${action}`, detail)
}

module.exports = { logger, requestLogger, adminLog }