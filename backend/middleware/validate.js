// middleware/validate.js
const { validationResult } = require('express-validator')

// 执行校验结果，有错误则直接返回 400
function validate(req, res, next) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '参数校验失败',
            errors: errors.array().map(e => ({ field: e.path, msg: e.msg })),
        })
    }
    next()
}

module.exports = { validate }