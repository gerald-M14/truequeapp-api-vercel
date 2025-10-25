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

    const [urows] = await pool.query("SELECT id, email FROM users WHERE email = ? LIMIT 1", [email]);
    const userId = urows?.[0]?.id;
    if (!userId) return res.status(403).json({ error: "Usuario no encontrado" });

    const [rows] = await pool.query(
      `SELECT 
        c.id_conversacion,
        c.id_producto,
        p.titulo AS producto_titulo,
        p.imagen_url AS producto_imagen,
        u1.id AS id_usuario_1, u1.name AS nombre_usuario_1, u1.picture AS avatar_1, u1.email AS email_1,
        u2.id AS id_usuario_2, u2.name AS nombre_usuario_2, u2.picture AS avatar_2, u2.email AS email_2,
        (SELECT m.mensaje FROM mensajes m WHERE m.id_conversacion = c.id_conversacion ORDER BY m.fecha_envio DESC LIMIT 1) AS ultimo_mensaje,
        (SELECT m.fecha_envio FROM mensajes m WHERE m.id_conversacion = c.id_conversacion ORDER BY m.fecha_envio DESC LIMIT 1) AS ultima_fecha
      FROM conversaciones c
      LEFT JOIN productos p ON p.id_producto = c.id_producto
      LEFT JOIN users u1 ON u1.id = c.id_usuario_1
      LEFT JOIN users u2 ON u2.id = c.id_usuario_2
      WHERE c.id_usuario_1 = ? OR c.id_usuario_2 = ?
      ORDER BY ultima_fecha DESC`,
      [userId, userId]
    );

    res.status(200).json(rows);
  } catch (e) {
    console.error("chat/listar error:", e);
    res.status(500).json({ error: "db error", detail: e.message });
  }
}
