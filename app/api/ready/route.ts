import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger/server";
import { getStorage } from "@/lib/storage";

/**
 * La app puede atender pedidos: base y almacenamiento accesibles (10.14).
 * Lo consultan el proxy y el monitoreo externo. Pública: responde solo
 * "ok" o "error" por componente, sin detalles.
 */
export async function GET() {
  const [database, storage] = await Promise.all([
    check("database", async () => {
      await getDb().execute(sql`select 1`);
    }),
    check("storage", () => getStorage().check()),
  ]);
  const ready = database && storage;
  return Response.json(
    {
      status: ready ? "ok" : "error",
      database: database ? "ok" : "error",
      storage: storage ? "ok" : "error",
    },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

async function check(component: string, probe: () => Promise<void>): Promise<boolean> {
  try {
    await probe();
    return true;
  } catch (error) {
    logger.warn({ err: error, component }, "Chequeo de disponibilidad fallido");
    return false;
  }
}
