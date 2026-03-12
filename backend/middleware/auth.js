// middleware/auth.js
require('dotenv').config()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const SECRET = process.env.ADMIN_TOKEN_SECRET || 'sakura_secret_2026'
const EXPIRES = '8h'

// 内存黑名单（重启后清空，生产环境可改用 Redis）
const tokenBlacklist = new Set()

// 启动时预先哈希密码（避免每次登录都做哈希）
let hashedPassword = null
    ; (async () => {
        const raw = process.env.ADMIN_PASSWORD
        if (!raw) {
            console.error('❌  ADMIN_PASSWORD 未配置')
            process.exit(1)
        }
        hashedPassword = await bcrypt.hash(raw, 12)
    })()

function generateToken() {
    return jwt.sign({ role: 'admin' }, SECRET, { expiresIn: EXPIRES })
}

async function verifyPassword(input) {
    if (!hashedPassword) return false
    return bcrypt.compare(input, hashedPassword)
}

function verifyToken(token) {
    if (tokenBlacklist.has(token)) return false
    try {
        return jwt.verify(token, SECRET).role === 'admin'
    } catch {
        return false
    }
}

function revokeToken(token) {
    tokenBlacklist.add(token)
    // 8小时后自动清理，防止内存无限增长
    setTimeout(() => tokenBlacklist.delete(token), 8 * 60 * 60 * 1000)
}

function adminAuth(req, res, next) {
    const token = req.headers['x-admin-token']
    if (!token || !verifyToken(token)) {
        return res.status(401).json({ success: false, message: '未授权，请重新登录' })
    }
    req.adminToken = token
    next()
}

module.exports = { generateToken, verifyPassword, verifyToken, revokeToken, adminAuth }