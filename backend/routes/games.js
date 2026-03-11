const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const router = express.Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

// 列表 + 搜索 + 分页
router.get('/',
    [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('search').optional().trim(),
        query('tags').optional().trim(),
    ],
    validate,
    async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';
            const tags = req.query.tags || '';

            let where = 'WHERE g.is_active = 1';
            const params = [];

            if (search) {
                where += ` AND (
          MATCH(g.name, g.description, g.tags) AGAINST(? IN BOOLEAN MODE)
          OR g.name        LIKE ?
          OR g.description LIKE ?
        )`;
                params.push(`${search}*`, `%${search}%`, `%${search}%`);
            }

            if (tags) {
                where += ' AND FIND_IN_SET(?, g.tags)';
                params.push(tags);
            }

            const [[{ total }]] = await db.execute(
                `SELECT COUNT(*) AS total FROM s_g_games g ${where}`,
                params
            );

            const [rows] = await db.execute(
                `SELECT g.id, g.name, g.description, g.image_url,
          g.tags, g.author, g.play_count, g.sort_order,
          g.created_at, g.updated_at
   FROM s_g_games g
   ${where}
   ORDER BY g.sort_order DESC, g.created_at DESC
   LIMIT ${limit} OFFSET ${offset}`,
                params
            );

            res.json({
                success: true,
                data: {
                    list: rows,
                    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
                },
            });
        } catch (err) {
            console.error('[GET /games]', err);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }
);

// 游戏详情
router.get('/:id',
    [param('id').isInt({ min: 1 }).toInt()],
    validate,
    async (req, res) => {
        try {
            const [rows] = await db.execute(
                `SELECT * FROM s_g_games WHERE id = ? AND is_active = 1`,
                [req.params.id]
            );
            if (!rows.length) {
                return res.status(404).json({ success: false, message: '游戏不存在' });
            }
            res.json({ success: true, data: rows[0] });
        } catch (err) {
            console.error('[GET /games/:id]', err);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }
);

// 记录游玩次数
router.post('/:id/play',
    [param('id').isInt({ min: 1 }).toInt()],
    validate,
    async (req, res) => {
        try {
            await db.execute(
                `UPDATE s_g_games SET play_count = play_count + 1 WHERE id = ?`,
                [req.params.id]
            );
            res.json({ success: true });
        } catch (err) {
            console.error('[POST /games/:id/play]', err);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }
);

// 新增游戏
router.post('/',
    [
        body('name').notEmpty().trim().isLength({ max: 255 }),
        body('description').optional().trim(),
        body('image_url').optional().trim(),
        body('game_code').notEmpty(),
        body('game_type').optional().isIn(['html', 'canvas']),
        body('tags').optional().trim(),
        body('author').optional().trim(),
        body('sort_order').optional().isInt().toInt(),
    ],
    validate,
    async (req, res) => {
        try {
            const {
                name, description = '', image_url = '', game_code,
                game_type = 'html', tags = '', author = '匿名', sort_order = 0,
            } = req.body;

            const [result] = await db.execute(
                `INSERT INTO s_g_games
           (name, description, image_url, game_code, game_type, tags, author, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, description, image_url, game_code, game_type, tags, author, sort_order]
            );

            res.status(201).json({ success: true, data: { id: result.insertId }, message: '添加成功' });
        } catch (err) {
            console.error('[POST /games]', err);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }
);

// 更新游戏
router.put('/:id',
    [
        param('id').isInt({ min: 1 }).toInt(),
        body('name').optional().trim().isLength({ max: 255 }),
        body('description').optional().trim(),
        body('image_url').optional().trim(),
        body('game_code').optional(),
        body('game_type').optional().isIn(['html', 'canvas']),
        body('tags').optional().trim(),
        body('author').optional().trim(),
        body('sort_order').optional().isInt().toInt(),
        body('is_active').optional().isBoolean().toBoolean(),
    ],
    validate,
    async (req, res) => {
        try {
            const allowed = ['name', 'description', 'image_url', 'game_code',
                'game_type', 'tags', 'author', 'sort_order', 'is_active'];
            const fields = [];
            const values = [];

            allowed.forEach(f => {
                if (req.body[f] !== undefined) {
                    fields.push(`${f} = ?`);
                    values.push(req.body[f]);
                }
            });

            if (!fields.length) {
                return res.status(400).json({ success: false, message: '没有可更新的字段' });
            }

            values.push(req.params.id);
            const [result] = await db.execute(
                `UPDATE s_g_games SET ${fields.join(', ')} WHERE id = ?`,
                values
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: '游戏不存在' });
            }

            res.json({ success: true, message: '更新成功' });
        } catch (err) {
            console.error('[PUT /games/:id]', err);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }
);

// 下架游戏（软删除）
router.delete('/:id',
    [param('id').isInt({ min: 1 }).toInt()],
    validate,
    async (req, res) => {
        try {
            const [result] = await db.execute(
                `UPDATE s_g_games SET is_active = 0 WHERE id = ?`,
                [req.params.id]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: '游戏不存在' });
            }
            res.json({ success: true, message: '已下架' });
        } catch (err) {
            console.error('[DELETE /games/:id]', err);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }
);

module.exports = router;