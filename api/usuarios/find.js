import pool from '../_db.js';
import { applyCORS } from '../_cors.js';

export default async function handler(req, res) {
  if (applyCORS(req, res, { origins: ['http://localhost:5173','https://truequeapp.vercel.app'], methods: 'GET,OPTIONS' })) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email requerido' });

  try {
    const [rows] = await pool.query(`
      SELECT id, email, name, picture, fecha_nacimiento, descripcion, provincia_id
      FROM users
      WHERE email = ?
      LIMIT 1
    `, [email]);
    if (!rows.length) return res.status(404).json({ error: 'usuario no encontrado' });
    res.status(200).json(rows[0]);
  } catch (e) {
    console.error('usuarios/find error:', e);
    res.status(500).json({ error: 'db error', detail: e.message });
  }
}
