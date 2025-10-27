// /api/productos/index.js
import pool from '../_db.js';
import { applyCORS } from '../_cors.js';

export default async function handler(req, res) {
  // 1️⃣ Habilitar también POST y OPTIONS en CORS
  if (applyCORS(req, res, {
    origins: ['http://localhost:5173', 'https://truequeapp.vercel.app', 'https://truequeapp-frontend-fpu3n1zvr-gerald-m14s-projects.vercel.app', 'https://truequeapp-frontend.vercel.app/'],
    methods: 'GET,POST,OPTIONS',
  })) return;

  const { method } = req;

  // 2️⃣ GET → listar productos
  if (method === 'GET') {
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
          u.email   AS usuario_email,   
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
      return res.status(200).json(rows);
    } catch (e) {
      console.error('productos GET error:', e);
      return res.status(500).json({ error: 'db error', detail: e.message });
    }
  }

  // 3️⃣ POST → crear producto
  if (method === 'POST') {
    try {
      const userEmail = req.headers['x-user-email'];
      if (!userEmail) {
        return res.status(400).json({ error: 'Falta header x-user-email' });
      }

      // Buscar id del usuario según email
      const [userRows] = await pool.query(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [userEmail]
      );
      const userId = userRows?.[0]?.id;
      if (!userId) {
        return res.status(403).json({ error: 'Usuario no encontrado en BD' });
      }

      const {
        titulo,
        descripcion,
        estado_producto = 'usado',
        condicion = 'bueno',
        precio_estimado = null,
        imagen_url = '',
        estado_publicacion = 'activa',
      } = req.body || {};

      if (!titulo || !descripcion) {
        return res.status(400).json({ error: 'Título y descripción son obligatorios' });
      }

      const [result] = await pool.query(
        `INSERT INTO productos 
          (user_id, titulo, descripcion, estado_producto, condicion, 
           precio_estimado, imagen_url, estado_publicacion, fecha_publicacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          titulo,
          descripcion,
          estado_producto,
          condicion,
          precio_estimado,
          imagen_url,
          estado_publicacion,
        ]
      );

      const id_producto = result.insertId;

      const [rows] = await pool.query(
        `SELECT 
           id_producto, user_id, titulo, descripcion, estado_producto, condicion,
           precio_estimado, estado_publicacion, imagen_url, fecha_publicacion
         FROM productos WHERE id_producto = ?`,
        [id_producto]
      );

      return res.status(201).json({ ok: true, producto: rows[0] });
    } catch (e) {
      console.error('productos POST error:', e);
      return res.status(500).json({ error: 'db error', detail: e.message });
    }
  }

  // 4️⃣ Si llega otro método → 405
  res.setHeader('Allow', 'GET,POST,OPTIONS');
  return res.status(405).json({ error: 'method not allowed' });
}
