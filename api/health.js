// /api/health.js
import mysql from "mysql2/promise";

export default async function handler(req, res) {
  try {
    // usa DB_PORT (20865) desde env; NO hardcodear 3306
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 8000
    });

    await conn.query("SELECT 1");
    await conn.end();

    return res.status(200).json({
      ok: true,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306)
    });
  } catch (e) {
    // No asumas propiedades; devuelve info útil
    return res.status(500).json({
      ok: false,
      name: e?.name || null,
      code: e?.code || null,
      message: e?.message || String(e)
    });
  }
}
