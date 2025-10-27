// /api/categorias/index.js
import pool from '../_db.js';
import { applyCORS } from '../_cors.js';

export default async function handler(req, res) {
  // CORS igual que en productos
  if (applyCORS(req, res, {
    origins: ['http://localhost:5173', 'https://truequeapp.vercel.app', , 'https://truequeapp-frontend-fpu3n1zvr-gerald-m14s-projects.vercel.app'],
    methods: 'GET,OPTIONS'
  })) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  try {
    const [rows] = await pool.query(`
      SELECT id_categoria, nombre
      FROM categorias
      ORDER BY nombre ASC
    `);
    res.status(200).json(rows);
  } catch (e) {
    // LOG detallado para ver en Vercel
    console.error('categorias error:', {
      message: e.message,
      code: e.code,
      errno: e.errno,
      stack: e.stack
    });
    // Responder SIEMPRE con JSON (y con CORS porque ya se setearon headers arriba)
    res.status(500).json({ error: 'db error', detail: e.message, code: e.code, errno: e.errno });
  }
}
