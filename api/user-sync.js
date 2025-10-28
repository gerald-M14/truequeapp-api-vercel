// /api/user-sync.js
import { getPool } from "./_db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const secretHeader = req.headers["x-auth0-actions-secret"];
  if (secretHeader !== process.env.AUTH0_ACTIONS_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const u = req.body?.user;
  if (!u?.user_id || !u?.email) {
    return res.status(400).json({ error: "bad payload", got: req.body ?? null });
  }

  try {
    const pool = getPool();
    const sql = `
      INSERT INTO users (auth0_user_id, email, name, picture, email_verified, last_login)
      VALUES (?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        name=VALUES(name),
        picture=VALUES(picture),
        email_verified=VALUES(email_verified),
        last_login=NOW();
    `;
    await pool.query(sql, [
      u.user_id,
      u.email,
      u.name || u.nickname || null,
      u.picture || null,
      u.email_verified ? 1 : 0
    ]);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      error: "db error",
      code: e.code || null,
      message: e.message || String(e)
    });
  }
}
