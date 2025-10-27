// /api/usuarios/[id]/productos.js
import pool from '../../_db.js';
import { applyCORS } from '../../_cors.js';

export default async function handler(req, res) {
  // --- CORS ---
  if (applyCORS(req, res, {
    origins: [
      'http://localhost:5173',
      'https://truequeapp.vercel.app',
      'https://truequeapp-frontend-fpu3n1zvr-gerald-m14s-projects.vercel.app',
      'https://truequeapp-frontend.vercel.app'
    ],
    methods: 'GET,OPTIONS',
    headers: 'Content-Type, Authorization, X-Requested-With'
  })) return;

  // --- Solo GET permitido ---
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const { id, estado } = req.query;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'id inválido' });

  try {
    // 👇 Estado configurable: por defecto 'activa'
    const estadoFiltro = (estado || 'activa').toLowerCase();
    const params = [userId];
    let whereEstado = '';

    // Si no es 'todas', se filtra por ese estado
    if (estadoFiltro !== 'todas') {
      const allowed = ['activa', 'pausada', 'intercambiada', 'eliminada', 'activo'];
      if (!allowed.includes(estadoFiltro)) {
        return res.status(400).json({ error: 'estado_publicacion inválido' });
      }
      whereEstado = 'AND LOWER(p.estado_publicacion) = ?';
      params.push(estadoFiltro);
    }

    // --- Consulta ---
    const [rows] = await pool.query(
      `
      SELECT 
        p.id_producto,
        p.titulo,
        p.descripcion,
        p.imagen_url,
        p.estado_producto,
        p.condicion,
        p.precio_estimado,
        p.estado_publicacion,
        p.fecha_publicacion,
        GROUP_CONCAT(c.nombre ORDER BY c.nombre SEPARATOR ', ') AS categorias
      FROM productos p
      LEFT JOIN producto_categoria pc ON pc.id_producto = p.id_producto
      LEFT JOIN categorias c         ON c.id_categoria = pc.id_categoria
      WHERE p.user_id = ? ${whereEstado}
      GROUP BY p.id_producto
      ORDER BY p.fecha_publicacion DESC
      LIMIT 100
      `,
      params
    );

    res.status(200).json(rows);
  } catch (e) {
    console.error('usuarios/[id]/productos error:', e);
    res.status(500).json({ error: 'db error', detail: e.message });
  }
}
