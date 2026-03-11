require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const gamesRouter = require('./routes/games');

const app = express();
const PORT = process.env.PORT || 8802;

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8801')
    .split(',').map(s => s.trim());

app.use(cors({
    origin(origin, cb) {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS blocked: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

app.use('/api/games', gamesRouter);

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Not Found' });
});

app.use((err, _req, res, _next) => {
    console.error('[GLOBAL ERROR]', err);
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
    console.log(`🌸  桜游戏屋 API 运行在 http://localhost:${PORT}`);
});