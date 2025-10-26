// /api/_cors.js
export function applyCORS(
  req,
  res,
  {
    // lista exacta de orígenes permitidos
    origins = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://truequeapp.vercel.app"
    ],
    // si también quieres permitir tus URLs de preview:
    allowVercelPreviews = true, // *.vercel.app
    methods = "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    headers = "Content-Type, Authorization, X-Requested-With, x-user-email, Accept, Origin",
    credentials = true, // si usas Auth0 / interceptores que ponen credentials:'include'
  } = {}
) {
  const origin = req.headers.origin || "";

  // ¿está permitido este origin?
  const allowed =
    origins.includes(origin) ||
    (allowVercelPreviews && isVercelPreview(origin));

  // refleja SIEMPRE el origin real (nunca '*')
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", headers);
  res.setHeader("Access-Control-Max-Age", "86400"); // cache del preflight
  if (credentials) res.setHeader("Access-Control-Allow-Credentials", "true");

  // Responder el preflight
  if (req.method === "OPTIONS") {
    res.statusCode = allowed ? 204 : 403;
    res.end();
    return true; // ya respondimos
  }

  // si no es preflight, continuamos
  return false;
}

function isVercelPreview(origin) {
  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
