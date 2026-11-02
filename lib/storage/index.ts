import "server-only";

import { env } from "@/lib/env";

import { LocalDiskStorage } from "./local-disk";
import { deriveFileLinkKey } from "./signing";
import type { FileStorage } from "./types";

export type { FileStorage } from "./types";

const globalForStorage = globalThis as unknown as {
  residencia360Storage?: FileStorage;
  residencia360FileLinkKey?: Buffer;
};

/** Almacenamiento de archivos del entorno: disco local en el piloto (DC-08). */
export function getStorage(): FileStorage {
  globalForStorage.residencia360Storage ??= new LocalDiskStorage(env.STORAGE_DIR);
  return globalForStorage.residencia360Storage;
}

/** Clave de los enlaces temporales a archivos. */
export function getFileLinkKey(): Buffer {
  if (!globalForStorage.residencia360FileLinkKey) {
    if (!env.BETTER_AUTH_SECRET) throw new Error("Falta la variable BETTER_AUTH_SECRET.");
    globalForStorage.residencia360FileLinkKey = deriveFileLinkKey(env.BETTER_AUTH_SECRET);
  }
  return globalForStorage.residencia360FileLinkKey;
}
