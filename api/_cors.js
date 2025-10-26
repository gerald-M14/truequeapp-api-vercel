// /api/_cors.js
export function applyCORS(
  req,
  res,
  {
    origins = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://truequeapp.vercel.app"
    ],
    allowPreviews = true, // *.vercel.app
    methods = "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    headers = "Content-Type, Authorization, X-Requested-With, x-user-email, Accept, Origin",
    credentials = false,
  } = {}
) {
  const origin = req.headers.origin || "";
  const isAllowed = origins.includes(origin) || (allowPreviews && isVercelPreview(origin));

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", headers);
  res.setHeader("Access-Control-Max-Age", "86400");
  if (credentials) res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.statusCode = isAllowed ? 204 : 403;
    res.end();
    return true;
  }
  return false;
}

function isVercelPreview(origin) {
  try { return new URL(origin).hostname.endsWith(".vercel.app"); }
  catch { return false; }
}
