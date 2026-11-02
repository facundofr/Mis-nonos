/**
 * Interfaz de almacenamiento de archivos (E12). En el piloto, disco local
 * del VPS con copia cifrada fuera del servidor (DC-08); en la etapa B, un
 * servicio compatible con S3, sin cambiar la app.
 *
 * Los archivos no se pisan ni se borran desde la app: una foto nueva es un
 * archivo nuevo y la anterior queda marcada como reemplazada (11.2).
 */
export interface FileStorage {
  /** Guarda un archivo nuevo. Falla si la clave ya existe. */
  put(key: string, data: Uint8Array): Promise<void>;
  /** Lee un archivo; `null` si no existe. */
  get(key: string): Promise<Uint8Array | null>;
  /** Verifica que se pueda leer y escribir (para /api/ready). */
  check(): Promise<void>;
}
