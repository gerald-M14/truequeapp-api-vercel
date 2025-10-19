// /api/_cors.js
export function withCORS(handler, {
  origins = ['http://localhost:5173', 'https://truequeapp.vercel.app'],
  methods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  headers = 'Content-Type, Authorization, X-Requested-With',
  credentials = false,
} = {}) {
  return async (req, res) => {
    try {
      // Resuelve el origin permitido
      const reqOrigin = req.headers.origin;
      const allowOrigin = origins.includes('*')
        ? '*'
        : (origins.includes(reqOrigin) ? reqOrigin : origins[0]);

      res.setHeader('Access-Control-Allow-Origin', allowOrigin);
      res.setHeader('Vary', 'Origin'); // para caches/CDN
      res.setHeader('Access-Control-Allow-Methods', methods);
      res.setHeader('Access-Control-Allow-Headers', headers);
      if (credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Preflight
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }

      // Ejecuta el handler real
      await handler(req, res);
    } catch (e) {
      // AÚN EN ERRORES devolvemos headers CORS + 500 con detalle
      console.error('withCORS error:', e);
      if (!res.headersSent) {
        res.status(500).json({ error: 'internal', detail: e.message ?? String(e) });
      }
    }
  };
}
