// /api/productos/index.js
import { db } from "../db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { categoria } = req.query;

    let query = `
      SELECT 
        p.id_producto,
        p.titulo,
        p.descripcion,
        p.estado_producto,
        p.condicion,
        p.precio_estimado,
        p.imagen_url,
        p.estado_publicacion,
        p.fecha_publicacion,
        u.nombre AS usuario_nombre,
        u.foto_perfil_url AS avatar_usuario,
        c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN producto_categoria pc ON p.id_producto = pc.id_producto
      LEFT JOIN categorias c ON pc.id_categoria = c.id_categoria
      LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE p.estado_publicacion = 'activo'
    `;

    const params = [];

    if (categoria && categoria !== "all") {
      query += " AND c.id_categoria = ?";
      params.push(categoria);
    }

    query += " ORDER BY p.fecha_publicacion DESC";

    const [rows] = await db.query(query, params);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
