// middleware/auth.js
const SECRET = process.env.ADMIN_TOKEN_SECRET || 'sakura_secret_2026'

// 简单 token：base64(password + secret + timestamp)
function generateToken(password) {
    const raw = `${password}:${SECRET}:admin`
    return Buffer.from(raw).toString('base64')
}

function verifyToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8')
        return decoded.endsWith(`:${SECRET}:admin`)
    } catch {
        return false
    }
}

function adminAuth(req, res, next) {
    const token = req.headers['x-admin-token']
    if (!token || !verifyToken(token)) {
        return res.status(401).json({ success: false, message: '未授权，请先登录' })
    }
    next()
}

module.exports = { generateToken, verifyToken, adminAuth }