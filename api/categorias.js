import pool from '../_db.js';
import { withCORS } from '../_cors.js';

async function categoriasHandler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const [rows] = await pool.query(`
    SELECT id_categoria, nombre
    FROM categorias
    ORDER BY nombre ASC
  `);
  res.status(200).json(rows);
}

export default withCORS(categoriasHandler, {
  origins: ['http://localhost:5173', 'https://truequeapp.vercel.app'],
  methods: 'GET,OPTIONS',
  // credentials: true, // solo si usas cookies
});
