// middleware/auth.js
const jwt = require('jsonwebtoken')

const SECRET = process.env.ADMIN_TOKEN_SECRET || 'sakura_secret_2026'
const EXPIRES = '8h'   // token 8小时过期

function generateToken() {
    return jwt.sign({ role: 'admin' }, SECRET, { expiresIn: EXPIRES })
}

function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET)
        return decoded.role === 'admin'
    } catch {
        return false
    }
}

function adminAuth(req, res, next) {
    const token = req.headers['x-admin-token']
    if (!token || !verifyToken(token)) {
        return res.status(401).json({ success: false, message: '未授权，请重新登录' })
    }
    next()
}

module.exports = { generateToken, verifyToken, adminAuth }