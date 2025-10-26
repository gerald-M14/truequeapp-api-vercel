// /api/chat/[id].js
import getPool from "../_db.js";
import { applyCORS } from "../_cors.js";

const pool = getPool();

export default async function handler(req, res) {
  // CORS SIEMPRE primero (maneja OPTIONS)
  if (applyCORS(req, res)) return;

  const { id } = req.query; // "listar" | "proponer" | "123"

  try {
    // -------------------------------
    // GET /api/chat/listar
    // -------------------------------
    if (req.method === "GET" && id === "listar") {
      const email = (req.headers["x-user-email"] || "").trim();
      if (!email) return res.status(400).json({ error: "Falta header x-user-email" });

      const [rows] = await pool.query(
        `
        SELECT 
          c.id_conversacion,
          c.id_producto,
          p.titulo     AS producto_titulo,
          p.imagen_url AS producto_imagen,

          CASE WHEN u1.email = ? THEN u2.id      ELSE u1.id      END AS otro_id,
          CASE WHEN u1.email = ? THEN u2.name    ELSE u1.name    END AS otro_nombre,
          CASE WHEN u1.email = ? THEN u2.picture ELSE u1.picture END AS otro_avatar,

          (SELECT m.mensaje 
             FROM mensajes m 
            WHERE m.id_conversacion = c.id_conversacion 
            ORDER BY m.fecha_envio DESC LIMIT 1) AS ultimo_mensaje,
          (SELECT m.fecha_envio 
             FROM mensajes m 
            WHERE m.id_conversacion = c.id_conversacion 
            ORDER BY m.fecha_envio DESC LIMIT 1) AS ultima_fecha
        FROM conversaciones c
        JOIN users u1 ON u1.id = c.id_usuario_1
        JOIN users u2 ON u2.id = c.id_usuario_2
        LEFT JOIN productos p ON p.id_producto = c.id_producto
        WHERE u1.email = ? OR u2.email = ?
        ORDER BY ultima_fecha DESC
        `,
        [email, email, email, email, email]
      );

      return res.status(200).json(rows);
    }

    // -------------------------------
    // POST /api/chat/proponer
    // -------------------------------
    if (req.method === "POST" && id === "proponer") {
      const email = req.headers["x-user-email"];
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const { productoId } = body || {};
      if (!email || !productoId) return res.status(400).json({ error: "Faltan datos requeridos" });

      const [[usr]] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
      if (!usr) return res.status(404).json({ error: "Usuario no encontrado" });
      const solicitanteId = usr.id;

      const [[prod]] = await pool.query("SELECT user_id FROM productos WHERE id_producto = ?", [productoId]);
      if (!prod) return res.status(404).json({ error: "Producto no encontrado" });
      const propietarioId = prod.user_id;

      if (Number(propietarioId) === Number(solicitanteId)) {
        return res.status(400).json({ error: "No puedes proponer trueque con tu propio producto" });
      }

      const [[exists]] = await pool.query(
        `SELECT id_conversacion FROM conversaciones
         WHERE ((id_usuario_1=? AND id_usuario_2=?) OR (id_usuario_1=? AND id_usuario_2=?))
           AND id_producto=? LIMIT 1`,
        [solicitanteId, propietarioId, propietarioId, solicitanteId, productoId]
      );

      let idConversacion;
      if (exists) {
        idConversacion = exists.id_conversacion;
      } else {
        const [ins] = await pool.query(
          "INSERT INTO conversaciones (id_usuario_1,id_usuario_2,id_producto) VALUES (?,?,?)",
          [solicitanteId, propietarioId, productoId]
        );
        idConversacion = ins.insertId;

        await pool.query(
          "INSERT INTO mensajes (id_conversacion,id_remitente,mensaje) VALUES (?,?,?)",
          [idConversacion, solicitanteId, "¡Hola! Me interesa hacer un trueque por tu producto."]
        );
      }

      return res.status(200).json({ ok: true, id_conversacion: idConversacion });
    }

    // -------------------------------
    // GET /api/chat/:id  (numérico)
    // POST /api/chat/:id (numérico)
    // -------------------------------
    if (/^\d+$/.test(String(id))) {
      const convId = Number(id);

      if (req.method === "GET") {
        const [rows] = await pool.query(
          `SELECT m.id_mensaje, m.id_remitente, u.name AS remitente_nombre, u.picture AS remitente_avatar,
                  m.mensaje, m.fecha_envio
           FROM mensajes m
           LEFT JOIN users u ON u.id = m.id_remitente
           WHERE m.id_conversacion = ?
           ORDER BY m.fecha_envio ASC`,
          [convId]
        );
        return res.status(200).json(rows);
      }

      if (req.method === "POST") {
        const email = req.headers["x-user-email"];
        const chunks = [];
        for await (const ch of req) chunks.push(ch);
        const { mensaje } = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        if (!email || !mensaje) return res.status(400).json({ error: "Falta mensaje o usuario" });

        const [[usr]] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
        if (!usr) return res.status(403).json({ error: "Usuario no encontrado" });

        await pool.query(
          "INSERT INTO mensajes (id_conversacion, id_remitente, mensaje) VALUES (?,?,?)",
          [convId, usr.id, mensaje]
        );
        return res.status(201).json({ ok: true });
      }
    }

    return res.status(404).json({ error: "not found" });
  } catch (e) {
    console.error("chat/[id] error:", e);
    return res.status(500).json({ error: "db error", detail: e.message });
  }
}
