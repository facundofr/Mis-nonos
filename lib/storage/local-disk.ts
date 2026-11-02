import { constants } from "node:fs";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { isValidStorageKey } from "./keys";
import type { FileStorage } from "./types";

/**
 * Archivos en una carpeta privada del servidor (DC-08). La carpeta nunca
 * se sirve directo: los archivos salen solo por una ruta que verifica la
 * sesión, el permiso y un enlace temporal, y que registra cada apertura.
 *
 * Permisos: carpetas 700 y archivos 600 (solo el usuario del proceso).
 */
export class LocalDiskStorage implements FileStorage {
  readonly #root: string;

  constructor(rootDir: string) {
    this.#root = path.resolve(rootDir);
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const target = this.#pathFor(key);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    try {
      // "wx": falla si ya existe; un archivo nunca se pisa.
      await writeFile(target, data, { flag: "wx", mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        await rm(target, { force: true });
      }
      throw error;
    }
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.#pathFor(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async check(): Promise<void> {
    await mkdir(this.#root, { recursive: true, mode: 0o700 });
    await access(this.#root, constants.R_OK | constants.W_OK);
  }

  #pathFor(key: string): string {
    if (!isValidStorageKey(key)) throw new Error("Clave de archivo inválida.");
    const resolved = path.resolve(this.#root, ...key.split("/"));
    // Defensa extra: nunca fuera de la carpeta, aunque la clave ya se validó.
    if (!resolved.startsWith(this.#root + path.sep)) throw new Error("Clave de archivo inválida.");
    return resolved;
  }
}
