// /api/usuarios/[id]/perfil.js
import pool from '../../_db.js';
import { applyCORS } from '../../_cors.js';

export default async function handler(req, res) {
  // CORS (igual que categorías)
  if (applyCORS(req, res, {
    origins: ['http://localhost:5173', 'https://truequeapp.vercel.app', 'https://truequeapp-frontend-fpu3n1zvr-gerald-m14s-projects.vercel.app'],
    methods: 'GET,OPTIONS'
  })) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const { id } = req.query;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  try {
    // La vista v_user_profile debe existir en MySQL (ya te la dejé creada)
    const [rows] = await pool.query(`
      SELECT *
      FROM v_user_profile
      WHERE user_id = ?
      LIMIT 1
    `, [userId]);

    if (!rows.length) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json(rows[0]);
  } catch (e) {
    console.error('usuarios/[id]/perfil error:', {
      message: e.message, code: e.code, errno: e.errno, stack: e.stack
    });
    res.status(500).json({ error: 'db error', detail: e.message, code: e.code, errno: e.errno });
  }
}
