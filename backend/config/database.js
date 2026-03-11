const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '192.168.22.12',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'sakura_game_site_admin',
    password: process.env.DB_PASSWORD || 'SakuraMikku@2001',
    database: process.env.DB_NAME || 'sakura_game_site',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    charset: 'utf8mb4',
    timezone: '+08:00',
    waitForConnections: true,
    queueLimit: 0,
});

(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅  MySQL 连接成功');
        conn.release();
    } catch (err) {
        console.error('❌  MySQL 连接失败:', err.message);
        process.exit(1);
    }
})();

module.exports = pool;