import pool from "../db.js";   // usa el mismo pool global


// CORS para tu frontend local
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173"); //cambiar por dominio publico luego
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  try {
    // básico: solo categorías
    const [rows] = await pool.query(
      "SELECT id_categoria, nombre FROM categorias ORDER BY nombre ASC"
    );
    return res.status(200).json(rows);
  } catch (e) {
    console.error("categorias error:", e);
    return res.status(500).json({ error: "db error" });
  }
}
