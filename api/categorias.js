import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
  ssl: { rejectUnauthorized: false }
});

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
