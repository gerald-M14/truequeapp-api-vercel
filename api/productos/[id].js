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
      origins: ["http://localhost:5173", "https://truequeapp.vercel.app", "https://truequeapp-frontend-fpu3n1zvr-gerald-m14s-projects.vercel.app", 'https://truequeapp-frontend.vercel.app'],
      methods: "GET,PUT,DELETE,OPTIONS",
    })
  )
    return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "id requerido" });

  try {
    // ------------------ GET ------------------
    if (req.method === "GET") {
      const det = await getProductoDetallado(id);
      if (!det) return res.status(404).json({ error: "producto no encontrado" });

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
      try {
        await pool.query(`DELETE FROM producto_categoria WHERE id_producto = ?`, [id]);
        const [del] = await pool.query(
          `DELETE FROM productos WHERE id_producto = ? LIMIT 1`,
          [id]
        );
        if (del.affectedRows === 0) {
          return res.status(404).json({ error: "no encontrado" });
        }
        return res.status(200).json({ ok: true });
      } catch (e) {
        if (e?.code === "ER_ROW_IS_REFERENCED_2" || e?.errno === 1451) {
          try {
            const [upd] = await pool.query(
              `UPDATE productos SET estado_publicacion = 'eliminada' WHERE id_producto = ?`,
              [id]
            );
            if (upd.affectedRows === 0) {
              return res.status(404).json({ error: "no encontrado" });
            }
            return res.status(200).json({ ok: true, softDeleted: true });
          } catch (e2) {
            console.error("soft delete fallo:", e2);
            return res.status(500).json({ error: "db error", detail: e2.message });
          }
        }
        console.error("DELETE productos error:", e);
        return res.status(500).json({ error: "db error", detail: e.message });
      }
    }

    // ------------------ PUT (actualización parcial robusta) ------------------
    if (req.method === "PUT") {
      const body = req.body || {};

      // Helpers
      const toNullableNumber = (v) => {
        if (v === "" || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : NaN;
      };
      const trimOrNull = (v) => {
        if (v === null || v === undefined) return null;
        if (typeof v !== "string") return v;
        const t = v.trim();
        return t === "" ? null : t;
      };
      const inEnum = (v, allowed) => (v == null ? true : allowed.includes(v));

      // Normalizar / mapear
      const titulo             = trimOrNull(body.titulo);
      const descripcion        = trimOrNull(body.descripcion);
      const estado_producto    = body.estado_producto;
      const condicion          = body.condicion;
      const precioNorm         = toNullableNumber(body.precio_estimado);
      const imagen_url_input   = body.imagen_url ?? body.imagen_principal ?? null;
      const imagen_url         = trimOrNull(imagen_url_input);
      const estado_publicacion = body.estado_publicacion;

      // Validaciones
      if (!inEnum(estado_producto, ["nueva", "usado", "reparacion"])) {
        return res.status(400).json({ error: "estado_producto inválido" });
      }
      if (!inEnum(condicion, ["excelente", "bueno", "regular"])) {
        return res.status(400).json({ error: "condicion inválida" });
      }
      if (!inEnum(estado_publicacion, ["activa", "pausada", "eliminada", "intercambiada"])) {
        return res.status(400).json({ error: "estado_publicacion inválido" });
      }
      if (precioNorm !== null && Number.isNaN(precioNorm)) {
        return res.status(400).json({ error: "precio_estimado inválido" });
      }

      // Construir UPDATE dinámico
      const fields = [];
      const params = [];
      const add = (sql, val) => { fields.push(sql); params.push(val); };

      if (titulo             !== null && titulo             !== undefined) add("titulo = ?", titulo);
      if (descripcion        !== null && descripcion        !== undefined) add("descripcion = ?", descripcion);
      if (estado_producto    !== null && estado_producto    !== undefined) add("estado_producto = ?", estado_producto);
      if (condicion          !== null && condicion          !== undefined) add("condicion = ?", condicion);
      if (precioNorm         !== undefined)                                   add("precio_estimado = ?", precioNorm); // puede ser null
      if (imagen_url         !== null && imagen_url         !== undefined) add("imagen_url = ?", imagen_url);
      if (estado_publicacion !== null && estado_publicacion !== undefined) add("estado_publicacion = ?", estado_publicacion);

      if (fields.length === 0) {
        return res.status(400).json({ error: "sin cambios" });
      }

      params.push(id);

      try {
        const [upd] = await pool.query(
          `UPDATE productos SET ${fields.join(", ")} WHERE id_producto = ?`,
          params
        );

        // IMPORTANTE: affectedRows = 0 puede significar "sin cambios" (mismos valores)
        if (upd.affectedRows === 0) {
          const [exists] = await pool.query(
            `SELECT 1 FROM productos WHERE id_producto = ? LIMIT 1`,
            [id]
          );
          if (!exists.length) {
            return res.status(404).json({ error: "no encontrado" });
          }
          // Existe pero no hubo cambios reales: devolver OK igualmente
          const sinCambios = await getProductoDetallado(id);
          return res.status(200).json({ ok: true, noChange: true, producto: sinCambios });
        }

        const actualizado = await getProductoDetallado(id);
        return res.status(200).json({ ok: true, producto: actualizado });
      } catch (e) {
        console.error("PUT productos error:", {
          code: e.code, errno: e.errno, sqlState: e.sqlState, sqlMessage: e.sqlMessage
        });
        if (e.code === "ER_TRUNCATED_WRONG_VALUE" || e.code === "ER_WARN_DATA_OUT_OF_RANGE") {
          return res.status(400).json({ error: "datos inválidos", detail: e.sqlMessage });
        }
        return res.status(500).json({ error: "db error", detail: e.message });
      }
    }

    // ------------------ Otros métodos ------------------
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    console.error("producto detalle error:", e);
    return res.status(500).json({ error: "db error", detail: e.message });
  }
}
