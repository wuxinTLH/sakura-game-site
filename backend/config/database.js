// config/database.js
require('dotenv').config()
const mysql = require('mysql2/promise')
const { logger } = require('../middleware/logger')

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sakura_game_site',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000,
    charset: 'utf8mb4',
}

let pool = mysql.createPool(poolConfig)

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
        // 10秒后重试，最多3次
        scheduleReconnect(1)
    }
}

// 重连调度
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

// 连接池事件监听（底层连接错误）
pool.on?.('error', err => {
    logger.error('MySQL 连接池异常', { message: err.message, code: err.code })
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        scheduleReconnect(1)
    }
})

// 包装 execute，带超时和日志
const db = {
    async execute(sql, params = []) {
        const start = Date.now()
        try {
            const result = await pool.execute(sql, params)
            const ms = Date.now() - start
            if (ms > 1000) {
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
    },

    async query(sql, params = []) {
        return pool.query(sql, params)
    },

    async getConnection() {
        return pool.getConnection()
    },

    // 事务封装
    async transaction(callback) {
        const conn = await pool.getConnection()
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