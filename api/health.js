// /api/health.js
import { getPool } from "./_db";

export default async function handler(req, res) {
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
