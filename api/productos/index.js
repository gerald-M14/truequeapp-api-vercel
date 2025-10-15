import pool from "../db.js";   // usa el mismo pool global

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  try {
    const [rows] = await pool.query("SELECT id_producto, titulo FROM productos");
    res.status(200).json(rows);
  } catch (e) {
    console.error("❌ productos error:", e);
    res.status(500).json({ error: "db error", detail: e.message });
  }
}
