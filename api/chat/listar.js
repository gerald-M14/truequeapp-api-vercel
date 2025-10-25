// /api/chat/listar.js
import pool from "../_db.js";
import { applyCORS } from "../_cors.js";

export default async function handler(req, res) {
  if (
    applyCORS(req, res, {
      origins: ["http://localhost:5173", "https://truequeapp.vercel.app"],
      methods: "GET,OPTIONS",
    })
  ) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET,OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  try {
    const email = req.headers["x-user-email"]?.trim();
    if (!email) return res.status(400).json({ error: "Falta header x-user-email" });

    // 🔴 FILTRA POR CORREO: trae todas las conversaciones donde el usuario (por email) participa
    const [rows] = await pool.query(
      `
      SELECT 
        c.id_conversacion,
        c.id_producto,
        p.titulo     AS producto_titulo,
        p.imagen_url AS producto_imagen,

        -- calcula "el otro" por email, sin depender de ids
        CASE WHEN u1.email = ? THEN u2.id      ELSE u1.id      END AS otro_id,
        CASE WHEN u1.email = ? THEN u2.name    ELSE u1.name    END AS otro_nombre,
        CASE WHEN u1.email = ? THEN u2.picture ELSE u1.picture END AS otro_avatar,

        -- último mensaje y su fecha
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
  } catch (e) {
    console.error("chat/listar error:", e);
    return res.status(500).json({ error: "db error", detail: e.message });
  }
}
