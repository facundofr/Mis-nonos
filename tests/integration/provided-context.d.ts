import "vitest";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrls: {
      /** Rol dueño de las tablas: sin RLS, para preparar datos de prueba. */
      ownerUrl: string;
      /** Rol de la app: sin BYPASSRLS, el mismo que usa producción. */
      appUrl: string;
      /** Rol del worker: dueño del esquema pgboss; en la app, solo los eventos de dominio. */
      workerUrl: string;
    };
  }
}
