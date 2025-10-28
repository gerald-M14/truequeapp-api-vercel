// /api/user-sync.js
import mysql from "mysql2/promise";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const secretHeader = req.headers["x-auth0-actions-secret"];
  if (secretHeader !== process.env.AUTH0_ACTIONS_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const u = req.body && req.body.user;
  if (!u || !u.user_id || !u.email) {
    return res.status(400).json({ error: "bad payload", got: req.body ?? null });
  }

  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: 3306,
      ssl: { rejectUnauthorized: false }
    });

    const sql = `
      INSERT INTO users (auth0_user_id, email, name, picture, email_verified, last_login)
      VALUES (?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        name=VALUES(name),
        picture=VALUES(picture),
        email_verified=VALUES(email_verified),
        last_login=NOW();
    `;

    await conn.query(sql, [
      u.user_id,
      u.email,
      u.name || u.nickname || null,
      u.picture || null,
      u.email_verified ? 1 : 0
    ]);

    return res.status(200).json({ ok: true });
  } catch (e) {
    // ---- NO asumas propiedades; toma solo las que existan ----
    const code = (e && e.code) || null;
    const errno = (e && e.errno) || null;
    const sqlState = (e && e.sqlState) || null;
    const sqlMessage = (e && e.sqlMessage) || (e && e.message) || String(e);

    console.error("user-sync DB error:", { code, errno, sqlState, sqlMessage });
    return res.status(500).json({
      error: "db error",
      code,
      errno,
      sqlState,
      sqlMessage
    });
  } finally {
    if (conn) await conn.end();
  }
}
