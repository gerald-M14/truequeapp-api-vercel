// /api/usuarios/[id]/productos.js
import pool from '../../_db.js';
import { applyCORS } from '../../_cors.js';

export default async function handler(req, res) {
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

  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const { id } = req.query;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'id inválido' });

  // normaliza y admite alias
  const rawEstado = (req.query.estado ?? '').toString().trim().toLowerCase();
  const isAll =
    rawEstado === '' ||
    rawEstado === 'todas' ||
    rawEstado === 'todos' ||
    rawEstado === 'all' ||
    rawEstado === '*' ||
    rawEstado === 'any';

  // si no pidió “todos”, validamos estado; por defecto ‘activa’
  const estadoFiltro = isAll ? null : (rawEstado || 'activa');

  // mapea “activo” → “activa”
  const mapEstado = (s) => (s === 'activo' ? 'activa' : s);
  const estadoNorm = estadoFiltro ? mapEstado(estadoFiltro) : null;

  // lista blanca
  const allowed = new Set(['activa', 'pausada', 'intercambiada', 'eliminada']);
  if (estadoNorm && !allowed.has(estadoNorm)) {
    return res.status(400).json({ error: 'estado_publicacion inválido', value: estadoNorm });
  }

  try {
    const params = [userId];
    let whereEstado = '';

    if (estadoNorm) {
      whereEstado = ' AND TRIM(LOWER(p.estado_publicacion)) = ? ';
      params.push(estadoNorm);
    }

    const [rows] = await pool.query(
      `
      SELECT 
        p.id_producto,
        p.user_id,
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
      WHERE p.user_id = ?
        ${whereEstado}
      GROUP BY p.id_producto
      ORDER BY p.fecha_publicacion DESC
      LIMIT 200
      `,
      params
    );

    return res.status(200).json(rows);
  } catch (e) {
    console.error('usuarios/[id]/productos error:', e);
    return res.status(500).json({ error: 'db error', detail: e.message });
  }
}
