import mysql from "mysql2/promise";

export default async function handler(req, res) {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: 3306,
      ssl: { rejectUnauthorized: false } // necesario con Clever Cloud
    });
    await conn.query("SELECT 1");
    await conn.end();
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
