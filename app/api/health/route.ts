/**
 * La app responde (10.14). No toca la base: sirve para saber si el proceso
 * está vivo. Pública y sin datos.
 */
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
