// /api/chat/[id].js
import getPool from "../_db.js";
import { applyCORS } from "../_cors.js";

const pool = getPool();

export default async function handler(req, res) {
  if (
    applyCORS(req, res, {
      origins: ["http://localhost:5173", "https://truequeapp.vercel.app"],
      methods: "GET,POST,OPTIONS",
    })
  ) return;

  const { id } = req.query; // puede ser "listar", "proponer" o un número como "123"

  try {
    // ---------------------------------------------------
    // GET /api/chat/listar  (id === "listar")
    // ---------------------------------------------------
    if (req.method === "GET" && id === "listar") {
      const email = req.headers["x-user-email"]?.trim();
      if (!email) return json(res, 400, { error: "Falta header x-user-email" });

      // Listar por correo, sin depender de mi_id
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

      return json(res, 200, rows);
    }

    // ---------------------------------------------------
    // POST /api/chat/proponer  (id === "proponer")
    // ---------------------------------------------------
    if (req.method === "POST" && id === "proponer") {
      const email = req.headers["x-user-email"];
      const body = await readJson(req);
      const { productoId } = body || {};
      if (!email || !productoId) return json(res, 400, { error: "Faltan datos requeridos" });

      // solicitante
      const [solRows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
      const solicitanteId = solRows?.[0]?.id;
      if (!solicitanteId) return json(res, 404, { error: "Usuario no encontrado" });

      // dueño del producto
      const [prodRows] = await pool.query("SELECT user_id FROM productos WHERE id_producto = ?", [productoId]);
      const propietarioId = prodRows?.[0]?.user_id;
      if (!propietarioId) return json(res, 404, { error: "Producto no encontrado" });
      if (Number(propietarioId) === Number(solicitanteId)) {
        return json(res, 400, { error: "No puedes proponer trueque con tu propio producto" });
      }

      // ¿ya existe?
      const [exists] = await pool.query(
        `SELECT id_conversacion FROM conversaciones
         WHERE ((id_usuario_1=? AND id_usuario_2=?) OR (id_usuario_1=? AND id_usuario_2=?))
           AND id_producto=? LIMIT 1`,
        [solicitanteId, propietarioId, propietarioId, solicitanteId, productoId]
      );

      let idConversacion;
      if (exists.length > 0) {
        idConversacion = exists[0].id_conversacion;
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

      return json(res, 200, { ok: true, id_conversacion: idConversacion });
    }

    // ---------------------------------------------------
    // GET /api/chat/:id  (id numérico)  → mensajes
    // POST /api/chat/:id (id numérico)  → enviar mensaje
    // ---------------------------------------------------
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
        return json(res, 200, rows);
      }

      if (req.method === "POST") {
        const email = req.headers["x-user-email"];
        const { mensaje } = await readJson(req);
        if (!email || !mensaje) return json(res, 400, { error: "Falta mensaje o usuario" });

        const [urows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
        const remitenteId = urows?.[0]?.id;
        if (!remitenteId) return json(res, 403, { error: "Usuario no encontrado" });

        await pool.query(
          "INSERT INTO mensajes (id_conversacion, id_remitente, mensaje) VALUES (?,?,?)",
          [convId, remitenteId, mensaje]
        );
        return json(res, 201, { ok: true });
      }
    }

    // Ruta no soportada
    return json(res, 404, { error: "not found" });
  } catch (e) {
    console.error("chat/[id] error:", e);
    return json(res, 500, { error: "db error", detail: e.message });
  }
}

// helpers
function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}
async function readJson(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}
