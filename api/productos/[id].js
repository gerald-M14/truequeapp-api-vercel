// /api/productos/[id].js
import pool from "../_db.js";
import { applyCORS } from "../_cors.js";

export default async function handler(req, res) {
  if (applyCORS(req, res, { origins: ['http://localhost:5173','https://truequeapp.vercel.app'], methods: 'GET,OPTIONS' })) return;
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  try {
    const { id } = req.query; // /api/productos/123 -> id=123
    if (!id) return res.status(400).json({ error: "id requerido" });

    // Detalle del producto + dueño + categorías (agrupadas)
    const [rows] = await pool.query(
      `
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
        GROUP_CONCAT(DISTINCT c.nombre ORDER BY c.nombre SEPARATOR ', ') AS categorias
      FROM productos p
      LEFT JOIN producto_categoria pc ON pc.id_producto = p.id_producto
      LEFT JOIN categorias c ON c.id_categoria = pc.id_categoria
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.id_producto = ?
      GROUP BY p.id_producto
      `,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ error: "producto no encontrado" });

    // (Opcional) relacionados por categoría: mismos toques, excluyendo el actual
    const [relacionados] = await pool.query(
      `
      SELECT DISTINCT
        p2.id_producto,
        p2.titulo,
        p2.imagen_url AS imagen_principal
      FROM productos p2
      LEFT JOIN producto_categoria pc2 ON pc2.id_producto = p2.id_producto
      WHERE pc2.id_categoria IN (
        SELECT pc.id_categoria
        FROM producto_categoria pc
        WHERE pc.id_producto = ?
      ) AND p2.id_producto <> ?
      ORDER BY p2.fecha_publicacion DESC
      LIMIT 6
      `,
      [id, id]
    );

    res.status(200).json({ producto: rows[0], relacionados });
  } catch (e) {
    console.error("producto detalle error:", e);
    res.status(500).json({ error: "db error", detail: e.message });
  }
}
