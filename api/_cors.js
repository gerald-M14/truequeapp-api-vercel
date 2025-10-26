// /api/_cors.js
export function applyCORS(req, res) {
  // Permitir todo (mientras no uses cookies/credenciales en esta ruta)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, x-user-email, Accept, Origin"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true; // preflight respondido
  }
  return false;
}
