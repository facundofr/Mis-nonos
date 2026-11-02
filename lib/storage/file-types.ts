/*
 * Tipo real de un archivo por sus primeros bytes, no por la extensión ni
 * por lo que dice el navegador (F.5). Solo se aceptan fotos y PDF: nada
 * ejecutable ni contenedores que el navegador pueda interpretar como HTML.
 */

export type AllowedMimeType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

/** Tamaño máximo de una foto o PDF del legajo. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(text: string): number[] {
  return [...text].map((character) => character.charCodeAt(0));
}

/** Tipo detectado, o `null` si no es uno de los aceptados. */
export function detectFileType(bytes: Uint8Array): AllowedMimeType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return "image/webp";
  if (startsWith(bytes, ascii("%PDF-"))) return "application/pdf";
  return null;
}

export type FileCheck =
  | { ok: true; mimeType: AllowedMimeType }
  | { ok: false; reason: "empty" | "too_large" | "unsupported" };

/** Valida tamaño y tipo real contra una lista de tipos aceptados. */
export function checkFile(
  bytes: Uint8Array,
  accepted: readonly AllowedMimeType[],
  maxBytes = MAX_FILE_BYTES,
): FileCheck {
  if (bytes.byteLength === 0) return { ok: false, reason: "empty" };
  if (bytes.byteLength > maxBytes) return { ok: false, reason: "too_large" };
  const mimeType = detectFileType(bytes);
  if (!mimeType || !accepted.includes(mimeType)) return { ok: false, reason: "unsupported" };
  return { ok: true, mimeType };
}

/** Mensaje para la persona que sube el archivo. */
export function fileCheckMessage(reason: Exclude<FileCheck, { ok: true }>["reason"]): string {
  switch (reason) {
    case "empty":
      return "El archivo está vacío.";
    case "too_large":
      return `El archivo supera los ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB.`;
    case "unsupported":
      return "Solo se aceptan fotos (JPG, PNG o WebP) y PDF.";
  }
}
