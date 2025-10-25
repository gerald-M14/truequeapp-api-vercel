// /api/chat/listar.js
import pool from "../_db.js";
import { applyCORS } from "../_cors.js";

export default async function handler(req, res) {
  if (applyCORS(req, res, {
    origins: ["http://localhost:5173", "https://truequeapp.vercel.app"],
    methods: "GET,OPTIONS",
  })) return;

  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  try {
    const email = req.headers["x-user-email"];
    if (!email) return res.status(400).json({ error: "Falta header x-user-email" });

    // 1) Mi id
    const [urows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    const mi_id = urows?.[0]?.id;
    if (!mi_id) return res.status(403).json({ error: "Usuario no encontrado" });

    // 2) Conversaciones donde participo + datos del otro
    const [rows] = await pool.query(
      `
      SELECT 
        c.id_conversacion,
        c.id_producto,
        p.titulo            AS producto_titulo,
        p.imagen_url        AS producto_imagen,

        -- quién es el otro, calculado en SQL
        CASE WHEN c.id_usuario_1 = ? THEN u2.id      ELSE u1.id      END AS otro_id,
        CASE WHEN c.id_usuario_1 = ? THEN u2.name    ELSE u1.name    END AS otro_nombre,
        CASE WHEN c.id_usuario_1 = ? THEN u2.picture ELSE u1.picture END AS otro_avatar,

        -- último mensaje y fecha
        (SELECT m.mensaje 
           FROM mensajes m 
          WHERE m.id_conversacion = c.id_conversacion 
          ORDER BY m.fecha_envio DESC LIMIT 1) AS ultimo_mensaje,
        (SELECT m.fecha_envio 
           FROM mensajes m 
          WHERE m.id_conversacion = c.id_conversacion 
          ORDER BY m.fecha_envio DESC LIMIT 1) AS ultima_fecha,

        ? AS mi_id
      FROM conversaciones c
      LEFT JOIN productos p ON p.id_producto = c.id_producto
      LEFT JOIN users u1 ON u1.id = c.id_usuario_1
      LEFT JOIN users u2 ON u2.id = c.id_usuario_2
      WHERE c.id_usuario_1 = ? OR c.id_usuario_2 = ?
      ORDER BY ultima_fecha DESC
      `,
      [mi_id, mi_id, mi_id, mi_id, mi_id, mi_id]
    );

    res.status(200).json(rows);
  } catch (e) {
    console.error("chat/listar error:", e);
    res.status(500).json({ error: "db error", detail: e.message });
  }
}
