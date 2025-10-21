// /api/productos/[id].js
import pool from "../_db.js";
import { applyCORS } from "../_cors.js";

async function getProductoDetallado(id) {
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
    LEFT JOIN categorias c         ON c.id_categoria = pc.id_categoria
    LEFT JOIN users u              ON u.id = p.user_id
    WHERE p.id_producto = ?
    GROUP BY p.id_producto
    `,
    [id]
  );
  return rows[0] || null;
}

async function getUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, email FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export default async function handler(req, res) {
  if (
    applyCORS(req, res, {
      origins: ["http://localhost:5173", "https://truequeapp.vercel.app"],
      methods: "GET,PUT,DELETE,OPTIONS",
    })
  )
    return;

  const { id } = req.query; // /api/productos/123 -> id=123
  if (!id) return res.status(400).json({ error: "id requerido" });

  try {
    // ------------------ GET (igual que antes) ------------------
    if (req.method === "GET") {
      const det = await getProductoDetallado(id);
      if (!det) return res.status(404).json({ error: "producto no encontrado" });

      // Relacionados por categoría (opcional, igual que tenías)
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

      return res.status(200).json({ producto: det, relacionados });
    }

    // ------------------ PUT / DELETE (validar dueño) ------------------
    // Fast-path sencillo: validación por email en header (luego se cambia a JWT)
    const requesterEmail = req.headers["x-user-email"];
    if (!requesterEmail)
      return res
        .status(401)
        .json({ error: "x-user-email requerido (reemplazar por JWT en prod)" });

    const requester = await getUserByEmail(requesterEmail);
    if (!requester) return res.status(401).json({ error: "usuario no encontrado" });

    const [prodRows] = await pool.query(
      `SELECT id_producto, user_id FROM productos WHERE id_producto = ? LIMIT 1`,
      [id]
    );
    const prod = prodRows[0];
    if (!prod) return res.status(404).json({ error: "producto no encontrado" });

    if (String(prod.user_id) !== String(requester.id)) {
      return res.status(403).json({ error: "no autorizado: no es dueño del producto" });
    }

    // ------------------ DELETE ------------------
    if (req.method === "DELETE") {
      // Borra categorías asociadas (si tienes FK ON DELETE CASCADE, esto es opcional)
      await pool.query(`DELETE FROM producto_categoria WHERE id_producto = ?`, [id]);

      const [del] = await pool.query(
        `DELETE FROM productos WHERE id_producto = ? LIMIT 1`,
        [id]
      );
      if (del.affectedRows === 0)
        return res.status(404).json({ error: "no encontrado" });

      return res.status(200).json({ ok: true });
    }

    // ------------------ PUT (actualización parcial) ------------------
    if (req.method === "PUT") {
      const {
        titulo,
        descripcion,
        estado_producto,   // 'nuevo' | 'usado'
        condicion,         // 'excelente' | 'muy bueno' | 'bueno' | 'regular'
        precio_estimado,
        imagen_url,
        estado_publicacion // 'activa' | 'inactiva' | 'borrador'
      } = req.body || {};

      const fields = [];
      const params = [];

      const add = (sql, val) => {
        fields.push(sql);
        params.push(val);
      };

      if (titulo != null) add("titulo = ?", titulo);
      if (descripcion != null) add("descripcion = ?", descripcion);
      if (estado_producto != null) add("estado_producto = ?", estado_producto);
      if (condicion != null) add("condicion = ?", condicion);
      if (precio_estimado != null) add("precio_estimado = ?", precio_estimado);
      if (imagen_url != null) add("imagen_url = ?", imagen_url);
      if (estado_publicacion != null) add("estado_publicacion = ?", estado_publicacion);

      if (fields.length === 0)
        return res.status(400).json({ error: "sin cambios" });

      params.push(id);

      const [upd] = await pool.query(
        `UPDATE productos SET ${fields.join(", ")} WHERE id_producto = ?`,
        params
      );
      if (upd.affectedRows === 0)
        return res.status(404).json({ error: "no encontrado" });

      const actualizado = await getProductoDetallado(id);
      return res.status(200).json({ ok: true, producto: actualizado });
    }

    // ------------------ Otros métodos ------------------
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    console.error("producto detalle error:", e);
    return res.status(500).json({ error: "db error", detail: e.message });
  }
}
