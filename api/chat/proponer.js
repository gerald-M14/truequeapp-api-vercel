// /api/chat/proponer.js
import pool from "../_db.js";
import { applyCORS } from "../_cors.js";

export default async function handler(req, res) {
  if (
    applyCORS(req, res, {
      origins: ["http://localhost:5173", "https://truequeapp.vercel.app"],
      methods: "POST,OPTIONS",
    })
  )
    return;

  if (req.method !== "POST")
    return res.status(405).json({ error: "method not allowed" });

  try {
    const { productoId } = req.body;
    const email = req.headers["x-user-email"];
    if (!email || !productoId)
      return res.status(400).json({ error: "Faltan datos requeridos" });

    // buscar usuario solicitante
    const [solRows] = await pool.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    const solicitanteId = solRows?.[0]?.id;
    if (!solicitanteId)
      return res.status(404).json({ error: "Usuario no encontrado" });

    // buscar dueño del producto
    const [prodRows] = await pool.query(
      "SELECT user_id FROM productos WHERE id_producto = ?",
      [productoId]
    );
    const propietarioId = prodRows?.[0]?.user_id;
    if (!propietarioId)
      return res.status(404).json({ error: "Producto no encontrado" });

    // verificar si ya existe conversación
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
      const [insert] = await pool.query(
        `INSERT INTO conversaciones (id_usuario_1,id_usuario_2,id_producto)
         VALUES (?,?,?)`,
        [solicitanteId, propietarioId, productoId]
      );
      idConversacion = insert.insertId;
    }

    // mensaje inicial automático
    await pool.query(
      `INSERT INTO mensajes (id_conversacion,id_remitente,mensaje)
       VALUES (?,?,?)`,
      [
        idConversacion,
        solicitanteId,
        "¡Hola! Me interesa hacer un trueque por tu producto.",
      ]
    );

    res.status(200).json({ ok: true, id_conversacion: idConversacion });
  } catch (e) {
    console.error("chat/proponer error:", e);
    res.status(500).json({ error: "db error", detail: e.message });
  }
}
