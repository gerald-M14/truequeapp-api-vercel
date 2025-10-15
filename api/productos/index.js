import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
  ssl: { rejectUnauthorized: false }
});

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // de momento abierto para test
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  try {
    const { categoria } = req.query;

    let sql = `
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
      /* OJO: sin filtro por estado, para verificar datos */
    `;

    const params = [];

    if (categoria && categoria !== "all") {
      sql += " WHERE pc.id_categoria = ?";   // usa pc.id_categoria (no c.id_categoria) para no forzar INNER JOIN
      params.push(categoria);
    }

    sql += " ORDER BY p.fecha_publicacion DESC";

    const [rows] = await pool.query(sql, params);
    return res.status(200).json(rows);
  } catch (e) {
    console.error("❌ productos error:", e);
    return res.status(500).json({ error: "db error", detail: e.message });
  }
}
