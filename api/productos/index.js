// /api/productos/index.js
import pool from '../_db.js';
import { applyCORS } from '../_cors.js';

export default async function handler(req, res) {
  if (applyCORS(req, res, { origins: ['http://localhost:5173', 'https://truequeapp.vercel.app'], methods: 'GET,OPTIONS' })) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  try {
    const { categoria } = req.query;

    let sql = `
      SELECT 
        p.id_producto,
        p.user_id,
        p.titulo,
        p.descripcion,
        p.estado_producto,
        p.condicion,
        p.precio_estimado,
        p.imagen_url AS imagen_principal,
        p.estado_publicacion,
        p.fecha_publicacion,
        u.name    AS usuario_nombre,     
        u.picture AS avatar_usuario,     
        c.nombre  AS categoria_nombre
      FROM productos p
      LEFT JOIN producto_categoria pc ON p.id_producto = pc.id_producto
      LEFT JOIN categorias c ON pc.id_categoria = c.id_categoria
      LEFT JOIN users u ON u.id = p.user_id           
      WHERE LOWER(p.estado_publicacion) IN ('activa','activo')
    `;

    const params = [];
    if (categoria && categoria !== 'all') {
      sql += ' AND pc.id_categoria = ?';
      params.push(categoria);
    }
    sql += ' ORDER BY p.fecha_publicacion DESC';

    const [rows] = await pool.query(sql, params);
    res.status(200).json(rows);
  } catch (e) {
    console.error('productos error:', e);
    res.status(500).json({ error: 'db error', detail: e.message });
  }
}
