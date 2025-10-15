// /api/_cors.js
export function applyCORS(req, res, { allow = ["*"], methods = "GET,POST,OPTIONS" } = {}) {
  const origin = req.headers.origin || "";
  const allowed = allow.includes("*") || allow.includes(origin) ? origin || "*" : allow[0] || "*";
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true; // handled preflight
  }
  return false;
}
