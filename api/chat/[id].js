// /api/chat/[id].js
import pool from "../_db.js";
import { applyCORS } from "../_cors.js";

export default async function handler(req, res) {
  if (
    applyCORS(req, res, {
      origins: ["http://localhost:5173", "https://truequeapp.vercel.app"],
      methods: "GET,POST,OPTIONS",
    })
  )
    return;

  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const [rows] = await pool.query(
        `SELECT m.id_mensaje, m.id_remitente, u.name AS remitente_nombre, u.picture AS remitente_avatar,
                m.mensaje, m.fecha_envio
         FROM mensajes m
         LEFT JOIN users u ON u.id = m.id_remitente
         WHERE m.id_conversacion = ?
         ORDER BY m.fecha_envio ASC`,
        [id]
      );
      return res.status(200).json(rows);
    } catch (e) {
      console.error("chat GET error:", e);
      return res.status(500).json({ error: "db error", detail: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      const email = req.headers["x-user-email"];
      const { mensaje } = req.body;
      if (!email || !mensaje)
        return res.status(400).json({ error: "Falta mensaje o usuario" });

      const [userRows] = await pool.query("SELECT id FROM users WHERE email = ?", [
        email,
      ]);
      const remitenteId = userRows?.[0]?.id;
      if (!remitenteId)
        return res.status(403).json({ error: "Usuario no encontrado" });

      await pool.query(
        "INSERT INTO mensajes (id_conversacion, id_remitente, mensaje) VALUES (?,?,?)",
        [id, remitenteId, mensaje]
      );

      return res.status(201).json({ ok: true });
    } catch (e) {
      console.error("chat POST error:", e);
      return res.status(500).json({ error: "db error", detail: e.message });
    }
  }

  res.status(405).json({ error: "method not allowed" });
}
