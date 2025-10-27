import pool from '../_db.js';
import { applyCORS } from '../_cors.js';

export default async function handler(req, res) {
  if (applyCORS(req, res, {
    origins: ['http://localhost:5173', 'https://truequeapp.vercel.app', 'https://truequeapp-frontend-fpu3n1zvr-gerald-m14s-projects.vercel.app', 'https://truequeapp-frontend.vercel.app'],
    methods: 'GET,OPTIONS'
  })) return;

  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  try {
    const [rows] = await pool.query(`
      SELECT id_provincia, nombre_provincia
      FROM provincias
      ORDER BY nombre_provincia ASC
    `);
    res.status(200).json(rows);
  } catch (e) {
    console.error('provincias error:', e);
    res.status(500).json({ error: 'db error', detail: e.message });
  }
}
