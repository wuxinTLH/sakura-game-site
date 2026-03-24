/**
 * backend/watchdog/engine.js
 * WatchDog 核心检测引擎
 *
 * 职责：
 *  1. 威胁检测（SQL注入 / XSS / 路径穿越 / 命令注入）
 *  2. IP 威胁评分 + 自动封禁
 *  3. 行为异常检测（爆破 / 扫描 / 高频请求）
 *  4. 上传文件安全扫描
 *  5. 事件持久化写库
 */

'use strict'

const pool = require('../config/database')

// ── 威胁分阈值 ────────────────────────────────────────────────
const SCORE_AUTO_BAN     = 100   // 达到此分自动封禁
const SCORE_DECAY_PER_H  = 20    // 每小时衰减分值
const BAN_DURATION_AUTO  = 24    // 自动封禁时长（小时），null=永久
const WINDOW_MS          = 60_000 // 评分窗口 1分钟

// ── 严重程度常量 ──────────────────────────────────────────────
const SEV = { INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4 }

// ── 检测规则库 ────────────────────────────────────────────────
const RULES = {
    // SQL 注入：覆盖常见 Union / Blind / Error-based / Stacked
    SQL_INJECT: [
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|xp_|sp_)\b)/i,
        /(--|\/\*|\*\/|;--|';\s*(drop|delete|insert|update))/i,
        /(\bor\b\s+\d+\s*=\s*\d+|\band\b\s+\d+\s*=\s*\d+)/i,
        /(sleep\(\d+\)|benchmark\(\d+,|waitfor\s+delay)/i,
        /(\bconvert\s*\(|extractvalue\s*\(|updatexml\s*\()/i,
        /(0x[0-9a-f]{4,})/i,   // Hex 编码载荷
    ],

    // XSS：覆盖反射型、DOM型、事件处理器注入
    XSS: [
        /<script[\s\S]*?>[\s\S]*?<\/script>/i,
        /(on\w+\s*=\s*["']?[^"'>\s]+)/i,          // onclick= onerror= 等
        /<(iframe|object|embed|form|base|meta|link)\b/i,
        /(javascript:|vbscript:|data:text\/html)/i,
        /(%3cscript|%3c%2fscript|&#x3c;script)/i,  // URL 编码变体
        /(expression\s*\(|@import\s)/i,             // CSS 注入
    ],

    // 路径穿越
    PATH_TRAVERSAL: [
        /(\.\.[\/\\]){2,}/,
        /(\/etc\/passwd|\/etc\/shadow|\/proc\/self|\/windows\/system32)/i,
        /(%2e%2e[%2f%5c])/i,   // URL 编码 ../
        /(\.\.%2f|\.\.%5c)/i,
    ],

    // 命令注入
    CMD_INJECT: [
        /[;&|`$]\s*(ls|cat|whoami|id|uname|curl|wget|bash|sh|powershell|cmd)\b/i,
        /(\$\(|`[^`]+`|\|\s*sh\b|\|\s*bash\b)/,
        /(nc\s+-\w*e|\/bin\/(sh|bash|zsh))/i,
    ],

    // 上传威胁：危险文件扩展名
    UPLOAD_THREAT: [
        /\.(php[3-9]?|phtml|asp|aspx|jsp|jspx|cfm|cgi|pl|py|rb|sh|bash|exe|bat|cmd|ps1|vbs)$/i,
    ],

    // 敏感路径探测（扫描器特征）
    PATH_SCAN: [
        /\/(\.git|\.env|\.htaccess|\.htpasswd|config\.php|wp-admin|phpinfo|adminer|phpmyadmin)/i,
        /\/(backup|bak|dump|sql|db)\.(zip|tar|gz|sql|bak|old)/i,
        /\/api\/(v\d\/)?debug/i,
    ],
}

// ── 内存缓存（避免每次检测都查库）────────────────────────────
// blocklist: Map<ip, expiresAt|null>
// scores:    Map<ip, {score, windowStart, failCount}>
const _blockCache  = new Map()
const _scoreCache  = new Map()
let   _cacheSyncAt = 0
const CACHE_TTL    = 30_000   // 30秒同步一次

// ── 初始化：从库加载封禁列表 ──────────────────────────────────
async function init() {
    await _syncBlockCache()
    // 每30秒同步封禁列表
    setInterval(_syncBlockCache, CACHE_TTL)
    // 每5分钟写入系统健康快照
    setInterval(_writeHealthSnapshot, 5 * 60_000)
}

async function _syncBlockCache() {
    try {
        const [rows] = await pool.query(
            `SELECT ip, expires_at FROM wd_blocklist
             WHERE expires_at IS NULL OR expires_at > NOW()`
        )
        _blockCache.clear()
        for (const r of rows) _blockCache.set(r.ip, r.expires_at)
        _cacheSyncAt = Date.now()
    } catch (e) {
        console.error('[WatchDog] 封禁列表同步失败:', e.message)
    }
}

// ── 主检测入口：Express 中间件 ────────────────────────────────
function middleware() {
    return async function watchdogMiddleware(req, res, next) {
        const ip = _getClientIP(req)

        // 1. IP 封禁检查（最先执行，成本最低）
        if (_isBlocked(ip)) {
            await _logEvent({
                event_type: 'BLOCKED_ACCESS',
                severity:   SEV.WARN,
                ip,
                method: req.method,
                path:   req.path,
                detail: '封禁 IP 尝试访问',
                user_agent: req.get('user-agent'),
            })
            return res.status(403).json({
                error:   'Forbidden',
                message: '您的 IP 已被安全系统封禁，如有疑问请联系管理员',
                code:    'WD_BLOCKED',
            })
        }

        // 2. 请求频率统计
        _trackRequest(ip)

        // 3. 检测请求内容（异步，不阻塞响应）
        _inspectRequest(req, ip).catch(e => {
            console.error('[WatchDog] 检测异常:', e.message)
        })

        // 4. 注入响应拦截钩子（检测响应体异常）
        _hookResponse(res, ip)

        next()
    }
}

// ── 请求内容检测 ──────────────────────────────────────────────
async function _inspectRequest(req, ip) {
    const targets = _buildInspectTargets(req)
    const path    = req.path
    const ua      = req.get('user-agent') || ''

    // 3a. 敏感路径探测检测
    if (_matchAny(path, RULES.PATH_SCAN)) {
        await _addScore(ip, 30, {
            event_type: 'PATH_SCAN',
            severity:   SEV.WARN,
            method:     req.method,
            path,
            payload:    _sanitize(path),
            user_agent: ua,
            detail:     '敏感路径探测',
        })
        return
    }

    // 3b. 遍历所有检测目标（query/body/headers）
    for (const { value, source } of targets) {
        if (!value || typeof value !== 'string' || value.length < 3) continue
        const v = value

        if (_matchAny(v, RULES.SQL_INJECT)) {
            await _addScore(ip, 50, {
                event_type: 'SQL_INJECT',
                severity:   SEV.CRITICAL,
                method:     req.method,
                path,
                payload:    _sanitize(v),
                user_agent: ua,
                detail:     `SQL注入尝试 [来源: ${source}]`,
            })
        } else if (_matchAny(v, RULES.XSS)) {
            await _addScore(ip, 40, {
                event_type: 'XSS',
                severity:   SEV.ERROR,
                method:     req.method,
                path,
                payload:    _sanitize(v),
                user_agent: ua,
                detail:     `XSS攻击尝试 [来源: ${source}]`,
            })
        } else if (_matchAny(v, RULES.PATH_TRAVERSAL)) {
            await _addScore(ip, 45, {
                event_type: 'PATH_TRAVERSAL',
                severity:   SEV.ERROR,
                method:     req.method,
                path,
                payload:    _sanitize(v),
                user_agent: ua,
                detail:     `路径穿越尝试 [来源: ${source}]`,
            })
        } else if (_matchAny(v, RULES.CMD_INJECT)) {
            await _addScore(ip, 60, {
                event_type: 'CMD_INJECT',
                severity:   SEV.CRITICAL,
                method:     req.method,
                path,
                payload:    _sanitize(v),
                user_agent: ua,
                detail:     `命令注入尝试 [来源: ${source}]`,
            })
        }
    }
}

// ── 文件上传安全扫描（由路由主动调用）────────────────────────
async function scanUploadedFile(req, file) {
    const ip   = _getClientIP(req)
    const name = file.originalname || ''
    const mime = file.mimetype || ''

    if (_matchAny(name, RULES.UPLOAD_THREAT)) {
        await _addScore(ip, 80, {
            event_type: 'UPLOAD_THREAT',
            severity:   SEV.CRITICAL,
            method:     'POST',
            path:       req.path,
            payload:    _sanitize(name),
            user_agent: req.get('user-agent'),
            detail:     `危险文件上传尝试: ${_sanitize(name)} (${mime})`,
        })
        return { safe: false, reason: `不允许上传该类型文件: ${name}` }
    }

    // MIME 与扩展名一致性检查（防止 MIME 伪造）
    const ext = name.split('.').pop()?.toLowerCase() || ''
    const mimeMap = {
        'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
        'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
        'mp3': 'audio/mpeg', 'ogg': 'audio/ogg', 'wav': 'audio/wav',
        'json': 'application/json', 'txt': 'text/plain', 'csv': 'text/csv',
        'html': 'text/html',
    }
    const expectedMime = mimeMap[ext]
    if (expectedMime && mime !== expectedMime && !mime.startsWith(expectedMime.split('/')[0])) {
        await _addScore(ip, 30, {
            event_type: 'UPLOAD_THREAT',
            severity:   SEV.WARN,
            method:     'POST',
            path:       req.path,
            payload:    `ext=${ext} mime=${mime}`,
            user_agent: req.get('user-agent'),
            detail:     `MIME 伪造嫌疑: 声称 ${mime}，扩展名为 .${ext}`,
        })
        return { safe: false, reason: `文件类型不符（扩展名与 MIME 不匹配）` }
    }

    return { safe: true }
}

// ── 记录认证失败（由 auth 路由主动调用）──────────────────────
async function recordAuthFailure(req, detail = '认证失败') {
    const ip = _getClientIP(req)
    await _addScore(ip, 20, {
        event_type: 'AUTH_FAIL',
        severity:   SEV.WARN,
        method:     req.method,
        path:       req.path,
        user_agent: req.get('user-agent'),
        detail,
    })
}

// ── 记录 Token 滥用（由 adminAuth 主动调用）──────────────────
async function recordTokenAbuse(req, detail = 'Token 无效') {
    const ip = _getClientIP(req)
    await _addScore(ip, 15, {
        event_type: 'TOKEN_ABUSE',
        severity:   SEV.WARN,
        method:     req.method,
        path:       req.path,
        user_agent: req.get('user-agent'),
        detail,
    })
}

// ── 手动封禁/解封（由管理接口调用）──────────────────────────
async function banIP(ip, reason, durationHours = null, source = 'manual') {
    const expiresAt = durationHours
        ? new Date(Date.now() + durationHours * 3600_000)
        : null

    await pool.query(
        `INSERT INTO wd_blocklist (ip, reason, source, ban_score, expires_at)
         VALUES (?, ?, ?, 0, ?)
         ON DUPLICATE KEY UPDATE
           reason = VALUES(reason), source = VALUES(source),
           expires_at = VALUES(expires_at)`,
        [ip, reason, source, expiresAt]
    )
    _blockCache.set(ip, expiresAt)
    await _logEvent({
        event_type: 'MANUAL_BAN',
        severity:   SEV.ERROR,
        ip,
        detail:     `手动封禁 | 原因: ${reason} | 时长: ${durationHours ? durationHours + 'h' : '永久'}`,
    })
}

async function unbanIP(ip) {
    await pool.query('DELETE FROM wd_blocklist WHERE ip = ?', [ip])
    _blockCache.delete(ip)
    await _logEvent({
        event_type: 'MANUAL_UNBAN',
        severity:   SEV.INFO,
        ip,
        detail:     '手动解封',
    })
}

// ── 威胁评分与自动封禁 ────────────────────────────────────────
async function _addScore(ip, delta, eventData) {
    const now = Date.now()

    // 内存更新
    const cached = _scoreCache.get(ip) || { score: 0, windowStart: now, failCount: 0 }

    // 窗口衰减：超过1小时则重置评分
    if (now - cached.windowStart > 3600_000) {
        cached.score       = 0
        cached.windowStart = now
    }

    cached.score = Math.min(cached.score + delta, 500)
    if (eventData.event_type === 'AUTH_FAIL') cached.failCount++
    _scoreCache.set(ip, cached)

    // 持久化事件
    await _logEvent({ ...eventData, ip })

    // 检查是否触发自动封禁
    if (cached.score >= SCORE_AUTO_BAN && !_isBlocked(ip)) {
        const reason = `自动封禁：威胁评分达 ${cached.score} 分（触发规则：${eventData.event_type}）`
        await banIP(ip, reason, BAN_DURATION_AUTO, 'auto')

        // 更新库中的 ban_score
        await pool.query(
            'UPDATE wd_blocklist SET ban_score = ? WHERE ip = ?',
            [cached.score, ip]
        ).catch(() => {})
    } else {
        // 仅更新评分（upsert）
        await pool.query(
            `INSERT INTO wd_ip_scores (ip, score, fail_count, window_start)
             VALUES (?, ?, ?, FROM_UNIXTIME(?))
             ON DUPLICATE KEY UPDATE
               score = VALUES(score),
               fail_count = VALUES(fail_count),
               window_start = IF(window_start < NOW() - INTERVAL 1 HOUR, NOW(), window_start),
               last_seen = NOW()`,
            [ip, cached.score, cached.failCount, Math.floor(cached.windowStart / 1000)]
        ).catch(() => {})
    }
}

// ── 请求频率追踪（纯内存，1分钟窗口）────────────────────────
const _reqWindows = new Map()
function _trackRequest(ip) {
    const now = Date.now()
    const win = _reqWindows.get(ip) || { count: 0, start: now }
    if (now - win.start > WINDOW_MS) { win.count = 0; win.start = now }
    win.count++
    _reqWindows.set(ip, win)

    // 1分钟内超过300次请求（远超正常浏览行为）
    if (win.count === 301) {
        _addScore(ip, 25, {
            event_type: 'RATE_LIMIT',
            severity:   SEV.WARN,
            detail:     `请求频率异常：${win.count} req/min`,
        }).catch(() => {})
    }

    // 定期清理过期窗口（防内存泄漏）
    if (_reqWindows.size > 10_000) {
        for (const [k, v] of _reqWindows) {
            if (now - v.start > WINDOW_MS * 5) _reqWindows.delete(k)
        }
    }
}

// ── 响应钩子（检测异常响应特征）─────────────────────────────
function _hookResponse(res, ip) {
    const originalJson = res.json.bind(res)
    res.json = function(body) {
        // 检测响应中是否意外泄露敏感字段
        if (body && typeof body === 'object') {
            const bodyStr = JSON.stringify(body)
            if (/password|token|secret|private_key/i.test(bodyStr)) {
                // 仅记录告警，不阻断（避免误伤正常鉴权响应）
                _logEvent({
                    event_type: 'ANOMALY',
                    severity:   SEV.WARN,
                    ip,
                    detail:     '响应体可能包含敏感字段，请检查接口设计',
                    payload:    null,
                }).catch(() => {})
            }
        }
        return originalJson(body)
    }
}

// ── 系统健康快照 ─────────────────────────────────────────────
let _reqCounter = 0
let _errCounter = 0

function incrementReq() { _reqCounter++ }
function incrementErr() { _errCounter++ }

async function _writeHealthSnapshot() {
    try {
        const [blockedRows] = await pool.query(
            `SELECT COUNT(*) AS c FROM wd_blocklist WHERE expires_at IS NULL OR expires_at > NOW()`
        )
        const [eventsRows] = await pool.query(
            `SELECT COUNT(*) AS c FROM wd_events WHERE created_at > NOW() - INTERVAL 1 HOUR`
        )
        const dbStart = Date.now()
        await pool.query('SELECT 1')
        const dbLatency = Date.now() - dbStart

        const memMB = Math.round(process.memoryUsage().rss / 1024 / 1024)
        const errRate = _reqCounter > 0 ? _errCounter / _reqCounter : 0

        await pool.query(
            `INSERT INTO wd_health_snapshots
             (req_per_min, error_rate, blocked_ips, events_1h, db_latency_ms, memory_mb)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                Math.round(_reqCounter / 5),  // 5分钟窗口平均
                parseFloat(errRate.toFixed(4)),
                blockedRows[0].c,
                eventsRows[0].c,
                dbLatency,
                memMB,
            ]
        )

        _reqCounter = 0
        _errCounter = 0

        // 自动清理30天前的快照和事件
        await pool.query(`DELETE FROM wd_health_snapshots WHERE created_at < NOW() - INTERVAL 30 DAY`)
        await pool.query(`DELETE FROM wd_events WHERE created_at < NOW() - INTERVAL 30 DAY AND severity <= 2`)
    } catch (e) {
        console.error('[WatchDog] 健康快照写入失败:', e.message)
    }
}

// ── 工具函数 ──────────────────────────────────────────────────
function _getClientIP(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        '0.0.0.0'
    )
}

function _isBlocked(ip) {
    if (!_blockCache.has(ip)) return false
    const exp = _blockCache.get(ip)
    if (exp === null) return true          // 永久封禁
    if (new Date(exp) > new Date()) return true
    _blockCache.delete(ip)                 // 过期自动清除
    return false
}

function _matchAny(str, patterns) {
    return patterns.some(p => p.test(str))
}

/** 脱敏：截断并移除高危内容，仅保留前120字符用于日志 */
function _sanitize(str) {
    if (!str) return null
    return String(str)
        .replace(/<script[\s\S]*?>/gi, '<script[removed]>')
        .replace(/(password|token|secret)=[^&\s]*/gi, '$1=[hidden]')
        .substring(0, 120)
}

function _buildInspectTargets(req) {
    const targets = []
    const flatObj = (obj, source) => {
        if (!obj) return
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'string')  targets.push({ value: v, source: `${source}.${k}` })
            if (typeof v === 'object')  flatObj(v, source)
        }
    }
    flatObj(req.query,  'query')
    flatObj(req.body,   'body')
    // 检查部分请求头（User-Agent / Referer 常被用于注入）
    const dangerHeaders = ['user-agent', 'referer', 'x-forwarded-for', 'x-original-url']
    for (const h of dangerHeaders) {
        const v = req.headers[h]
        if (v) targets.push({ value: v, source: `header.${h}` })
    }
    return targets
}

async function _logEvent(data) {
    try {
        await pool.query(
            `INSERT INTO wd_events
             (event_type, severity, ip, method, path, payload, user_agent, detail)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.event_type || 'UNKNOWN',
                data.severity   || SEV.INFO,
                data.ip         || '0.0.0.0',
                data.method     || null,
                data.path       || null,
                data.payload    || null,
                data.user_agent || null,
                data.detail     || null,
            ]
        )
    } catch (e) {
        // 日志写失败不能影响主流程
        console.error('[WatchDog] 事件写入失败:', e.message)
    }
}

// ── 查询接口（供管理路由使用）────────────────────────────────
async function getRecentEvents(limit = 50, severity = null) {
    const cond  = severity ? 'WHERE severity >= ?' : ''
    const args  = severity ? [severity, limit]     : [limit]
    const [rows] = await pool.query(
        `SELECT * FROM wd_events ${cond} ORDER BY created_at DESC LIMIT ?`, args
    )
    return rows
}

async function getBlocklist() {
    const [rows] = await pool.query(
        `SELECT * FROM wd_blocklist ORDER BY created_at DESC`
    )
    return rows
}

async function getStats() {
    const [[e]] = await pool.query(
        `SELECT
           COUNT(*) AS total_events,
           SUM(severity >= 3) AS high_severity,
           SUM(severity = 4) AS critical
         FROM wd_events WHERE created_at > NOW() - INTERVAL 24 HOUR`
    )
    const [[b]] = await pool.query(
        `SELECT COUNT(*) AS total FROM wd_blocklist WHERE expires_at IS NULL OR expires_at > NOW()`
    )
    const [snap] = await pool.query(
        `SELECT * FROM wd_health_snapshots ORDER BY created_at DESC LIMIT 12`
    )
    return { events_24h: e, blocklist: b, recent_snapshots: snap }
}

module.exports = {
    init,
    middleware,
    scanUploadedFile,
    recordAuthFailure,
    recordTokenAbuse,
    banIP,
    unbanIP,
    getRecentEvents,
    getBlocklist,
    getStats,
    incrementReq,
    incrementErr,
    SEV,
}