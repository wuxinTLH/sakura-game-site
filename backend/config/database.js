// config/database.js
// ★ P1 修复：连接池增加 acquireTimeout，防止高并发下连接耗尽无限等待
require('dotenv').config()
const mysql = require('mysql2/promise')
const { logger } = require('../middleware/logger')

const poolConfig = {
    host:             process.env.DB_HOST || 'localhost',
    port:             parseInt(process.env.DB_PORT) || 3306,
    user:             process.env.DB_USER || 'root',
    password:         process.env.DB_PASSWORD || '',
    database:         process.env.DB_NAME || 'sakura_game_site',
    connectionLimit:  parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    waitForConnections: true,
    queueLimit:       50,           // ★ 最多排队 50 个请求，超出直接报错（原来 0=无限）
    enableKeepAlive:  true,
    keepAliveInitialDelay: 10000,
    connectTimeout:   10000,        // 单次连接超时 10s
    // ★ P1 新增：从队列获取连接的超时时间，防止请求无限挂起
    // mysql2 使用 waitForConnections+queueLimit 组合实现，
    // 额外通过包装层加 Promise.race 超时保护
    charset: 'utf8mb4',
}

let pool = mysql.createPool(poolConfig)

// 获取连接的超时时间（毫秒）
const ACQUIRE_TIMEOUT_MS = parseInt(process.env.DB_ACQUIRE_TIMEOUT_MS) || 8000

// 启动时验证连接
async function testConnection() {
    try {
        const conn = await pool.getConnection()
        await conn.ping()
        conn.release()
        logger.info('MySQL 连接成功', {
            host: poolConfig.host,
            port: poolConfig.port,
            database: poolConfig.database,
        })
        console.log('✅  MySQL 连接成功')
    } catch (err) {
        logger.error('MySQL 连接失败', { message: err.message })
        console.error('❌  MySQL 连接失败:', err.message)
        scheduleReconnect(1)
    }
}

function scheduleReconnect(attempt) {
    if (attempt > 3) {
        logger.error('MySQL 重连失败次数过多，进程退出')
        process.exit(1)
    }
    const delay = attempt * 10000
    logger.warn(`MySQL 将在 ${delay / 1000}s 后进行第 ${attempt} 次重连`)
    setTimeout(async () => {
        logger.info(`MySQL 重连尝试 #${attempt}`)
        pool = mysql.createPool(poolConfig)
        try {
            const conn = await pool.getConnection()
            await conn.ping()
            conn.release()
            logger.info('MySQL 重连成功')
            console.log('✅  MySQL 重连成功')
        } catch (err) {
            logger.error(`MySQL 重连 #${attempt} 失败`, { message: err.message })
            scheduleReconnect(attempt + 1)
        }
    }, delay)
}

pool.on?.('error', err => {
    logger.error('MySQL 连接池异常', { message: err.message, code: err.code })
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        scheduleReconnect(1)
    }
})

// ★ P1 修复：包装 execute，加 acquireTimeout 保护
// 若在 ACQUIRE_TIMEOUT_MS 内未能从连接池获取连接，直接抛出 503 错误
async function executeWithTimeout(fn) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(Object.assign(new Error('数据库连接池繁忙，请稍后重试'), { statusCode: 503 }))
        }, ACQUIRE_TIMEOUT_MS)

        fn().then(result => {
            clearTimeout(timer)
            resolve(result)
        }).catch(err => {
            clearTimeout(timer)
            reject(err)
        })
    })
}

const db = {
    async execute(sql, params = []) {
        const start = Date.now()
        return executeWithTimeout(async () => {
            try {
                const result = await pool.execute(sql, params)
                const ms = Date.now() - start
                if (ms > 500) {   // ★ 慢查询阈值从 1000ms 降至 500ms
                    logger.warn('慢查询', { sql: sql.slice(0, 120), ms })
                }
                return result
            } catch (err) {
                logger.error('SQL 执行失败', {
                    sql: sql.slice(0, 120),
                    message: err.message,
                    code: err.code,
                })
                throw err
            }
        })
    },

    async query(sql, params = []) {
        return executeWithTimeout(() => pool.query(sql, params))
    },

    async getConnection() {
        return executeWithTimeout(() => pool.getConnection())
    },

    async transaction(callback) {
        const conn = await this.getConnection()
        await conn.beginTransaction()
        try {
            const result = await callback(conn)
            await conn.commit()
            return result
        } catch (err) {
            await conn.rollback()
            throw err
        } finally {
            conn.release()
        }
    },
}

testConnection()

module.exports = db