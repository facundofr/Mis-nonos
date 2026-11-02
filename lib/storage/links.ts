import "server-only";

import { getFileLinkKey } from "./index";
import { signFileLink } from "./signing";

/**
 * Enlace temporal a un archivo privado (5 minutos, para esta persona). La
 * ruta /api/archivos/[id] vuelve a verificar la sesión y el permiso, y
 * registra la apertura.
 */
export function privateFileUrl(fileId: string, userId: string): string {
  const token = signFileLink({ key: getFileLinkKey(), fileId, userId });
  return `/api/archivos/${fileId}?t=${encodeURIComponent(token)}`;
}
