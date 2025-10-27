import pool from '../../_db.js';
import { applyCORS } from '../../_cors.js';

export default async function handler(req, res) {
  if (applyCORS(req, res, { origins: ['http://localhost:5173','https://truequeapp.vercel.app', 'https://truequeapp-frontend-fpu3n1zvr-gerald-m14s-projects.vercel.app', 'https://truequeapp-frontend.vercel.app'], 
    methods: 'GET,PUT,OPTIONS' })) return;

  const { id } = req.query;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'id inválido' });

  try {
    if (req.method === 'GET') {
      const [rows] = await pool.query(`
        SELECT u.id, u.email, u.name, u.picture,
               u.fecha_nacimiento, u.descripcion, u.provincia_id,
               p.nombre_provincia
        FROM users u
        LEFT JOIN provincias p ON p.id_provincia = u.provincia_id
        WHERE u.id = ?
        LIMIT 1
      `, [userId]);
      if (!rows.length) return res.status(404).json({ error: 'usuario no encontrado' });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'PUT') {
      const { fecha_nacimiento, descripcion, provincia_id } = req.body ?? {};
      // Validaciones básicas
      const prov = provincia_id == null ? null : Number(provincia_id);
      if (prov !== null && !Number.isInteger(prov)) return res.status(400).json({ error: 'provincia_id inválido' });

      // Si mandan provincia, validar que exista
      if (prov !== null) {
        const [provRows] = await pool.query(`SELECT 1 FROM provincias WHERE id_provincia = ?`, [prov]);
        if (!provRows.length) return res.status(400).json({ error: 'provincia inexistente' });
      }

      await pool.query(`
        UPDATE users
        SET fecha_nacimiento = ?, 
            descripcion = ?,
            provincia_id = ?
        WHERE id = ?
      `, [
        fecha_nacimiento ?? null,
        descripcion ?? null,
        prov,
        userId
      ]);

      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error('usuarios/[id]/detalles error:', e);
    res.status(500).json({ error: 'db error', detail: e.message });
  }
}
