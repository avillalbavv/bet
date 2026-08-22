const allowedOrigin = Deno.env.get("NOIR_ALLOWED_ORIGIN") || "*";
const cors = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status:204, headers:cors });
  if (request.method !== "GET") return Response.json({ error:"Método no permitido" }, { status:405, headers:cors });

  const gamesUrl = Deno.env.get("ZERO_XPLAYSLOTS_GAMES_URL");
  const apiKey = Deno.env.get("ZERO_XPLAYSLOTS_API_KEY");
  const authHeader = Deno.env.get("ZERO_XPLAYSLOTS_AUTH_HEADER");
  if (!gamesUrl) return Response.json({ error:"Falta ZERO_XPLAYSLOTS_GAMES_URL" }, { status:503, headers:cors });

  const headers = new Headers({ Accept:"application/json" });
  // 0xPlaySlots debe confirmar el nombre/formato exacto del header. NOIR no lo
  // presupone: sólo se aplica cuando el operador configura ambos valores.
  if (apiKey && authHeader) headers.set(authHeader, apiKey);

  try {
    const upstream = await fetch(gamesUrl, { headers, signal:AbortSignal.timeout(8000) });
    const body = await upstream.text();
    return new Response(body, { status:upstream.status, headers:{ ...cors, "Content-Type":upstream.headers.get("content-type") || "application/json" } });
  } catch {
    return Response.json({ error:"No fue posible consultar el catálogo autorizado" }, { status:502, headers:cors });
  }
});

