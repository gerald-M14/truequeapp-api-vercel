// /api/_db.js
import mysql from "mysql2/promise";

let _pool;
export function getPool() {
  if (!_pool) {
    _pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 8000,
      ssl: { rejectUnauthorized: false },
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return _pool;
}

// 👉 default export = el pool ya creado
const pool = getPool();
export default pool;
