// /api/_cors.js
export function applyCORS(req, res, {
  origins = ['http://localhost:5173', 'https://truequeapp.vercel.app', '*'],
  methods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  headers = 'Content-Type, Authorization, X-Requested-With, x-user-email',
  credentials = false, 
} = {}) {
  const origin = req.headers.origin;
  const allowOrigin = origins.includes('*')
    ? '*'
    : (origins.includes(origin) ? origin : origins[0]);

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin'); // para caches
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);
  if (credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // indica que ya respondimos el preflight
  }
  return false;
}
