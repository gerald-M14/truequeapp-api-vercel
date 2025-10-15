import pool from "../db.js";   // usa el mismo pool global
import { applyCORS } from "../_cors.js";

export default async function handler(req, res) {
  if (applyCORS(req, res, { allow: ["*"], methods: "GET,OPTIONS" })) return;
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  try {
    const [rows] = await pool.query(
      "SELECT id_categoria, nombre FROM categorias ORDER BY nombre ASC"
    );
    res.status(200).json(rows);
  } catch (e) {
    console.error("categorias error:", e);
    res.status(500).json({ error: "db error", detail: e.message });
  }
}
