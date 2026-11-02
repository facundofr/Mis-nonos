export interface AttemptLimiterOptions {
  /** Intentos fallidos permitidos dentro de la ventana. */
  maxFailures: number;
  windowSeconds: number;
  /** Tope de claves en memoria; al superarlo se descartan las más viejas. */
  maxKeys?: number;
}

interface Entry {
  failures: number;
  windowStart: number;
}

/**
 * Cuenta intentos fallidos por clave (cuenta o IP) en una ventana fija.
 *
 * Vive en la memoria del proceso: alcanza con una sola instancia de la app,
 * como en el piloto (F.8). Con varias instancias hay que pasarlo a un
 * almacenamiento compartido. Better Auth tiene su propio límite, pero solo
 * en sus rutas HTTP, que esta app no publica (docs/decisions/0003).
 */
export class AttemptLimiter {
  readonly #entries = new Map<string, Entry>();
  readonly #maxFailures: number;
  readonly #windowMs: number;
  readonly #maxKeys: number;

  constructor(options: AttemptLimiterOptions) {
    this.#maxFailures = options.maxFailures;
    this.#windowMs = options.windowSeconds * 1000;
    this.#maxKeys = options.maxKeys ?? 10_000;
  }

  /** ¿Se permite otro intento? Si no, cuántos segundos faltan para poder reintentar. */
  check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const entry = this.#current(key, now);
    if (!entry || entry.failures < this.#maxFailures) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    const retryAfterMs = entry.windowStart + this.#windowMs - now;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  recordFailure(key: string, now = Date.now()): void {
    const entry = this.#current(key, now);
    if (entry) {
      entry.failures += 1;
      return;
    }
    if (this.#entries.size >= this.#maxKeys) {
      // Map conserva el orden de inserción: la primera clave es la más vieja.
      const oldest = this.#entries.keys().next();
      if (!oldest.done) this.#entries.delete(oldest.value);
    }
    this.#entries.set(key, { failures: 1, windowStart: now });
  }

  /** Después de un ingreso correcto, la cuenta vuelve a cero. */
  reset(key: string): void {
    this.#entries.delete(key);
  }

  #current(key: string, now: number): Entry | undefined {
    const entry = this.#entries.get(key);
    if (entry && now - entry.windowStart >= this.#windowMs) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry;
  }
}
