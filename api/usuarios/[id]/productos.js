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

  const rawEstado = (req.query.estado ?? '').toString().trim().toLowerCase();
  const isAll = rawEstado === '' || ['todas','todos','all','*','any'].includes(rawEstado);
  // Mapear 'activo' → 'activa'
  const estadoNorm = isAll ? null : (rawEstado || 'activa').replace(/^activo$/, 'activa');

  // Lista blanca
  const allowed = new Set(['activa','pausada','intercambiada','eliminada']);
  if (estadoNorm && !allowed.has(estadoNorm)) {
    return res.status(400).json({ error: 'estado_publicacion inválido', value: estadoNorm });
  }

  try {
    const params = [userId];
    let whereEstado = '';

    if (estadoNorm) {
      // 🔒 filtra solo si se pidió un estado específico
      whereEstado = ' AND TRIM(LOWER(p.estado_publicacion)) = ? ';
      params.push(estadoNorm);
    }
    // Si pidieron "todas", NO añadir filtro (devuelve todos los estados)

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
      ORDER BY 
        -- Primero activas, luego pausadas, luego intercambiadas, luego eliminadas
        FIELD(TRIM(LOWER(p.estado_publicacion)), 'activa','pausada','intercambiada','eliminada'),
        p.fecha_publicacion DESC
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
