import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { checkFile, detectFileType, MAX_FILE_BYTES } from "@/lib/storage/file-types";
import { isValidStorageKey, newStorageKey } from "@/lib/storage/keys";
import { LocalDiskStorage } from "@/lib/storage/local-disk";
import { deriveFileLinkKey, signFileLink, verifyFileLink } from "@/lib/storage/signing";

const ORG = "0199f0a1-7c3e-7b2a-9d4f-1a2b3c4d5e6f";
const FILE = "0199f0a1-7c3e-7b2a-9d4f-aaaaaaaaaaaa";
const USER = "0199f0a1-7c3e-7b2a-9d4f-bbbbbbbbbbbb";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00);

describe("Tipo real de archivo", () => {
  it("reconoce fotos y PDF por sus primeros bytes", () => {
    expect(detectFileType(JPEG)).toBe("image/jpeg");
    expect(detectFileType(PNG)).toBe("image/png");
    expect(detectFileType(text("RIFF\x00\x00\x00\x00WEBPVP8 "))).toBe("image/webp");
    expect(detectFileType(text("%PDF-1.7\n"))).toBe("application/pdf");
  });

  it("rechaza HTML, SVG y ejecutables aunque digan ser una foto", () => {
    expect(detectFileType(text("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectFileType(text('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(detectFileType(text("MZ\x90\x00"))).toBeNull();
  });

  it("valida el tamaño y los tipos aceptados", () => {
    expect(checkFile(new Uint8Array(0), ["image/jpeg"])).toEqual({ ok: false, reason: "empty" });
    expect(checkFile(JPEG, ["image/jpeg"], 3)).toEqual({ ok: false, reason: "too_large" });
    expect(checkFile(text("%PDF-1.7"), ["image/jpeg"])).toEqual({
      ok: false,
      reason: "unsupported",
    });
    expect(checkFile(JPEG, ["image/jpeg", "application/pdf"])).toEqual({
      ok: true,
      mimeType: "image/jpeg",
    });
    expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe("Claves de archivo", () => {
  it("residencia, año, mes y una parte aleatoria; nada del contenido", () => {
    const key = newStorageKey(ORG, new Date("2026-11-01T12:00:00Z"));
    expect(key.startsWith(`${ORG}/2026/11/`)).toBe(true);
    expect(isValidStorageKey(key)).toBe(true);
    expect(newStorageKey(ORG)).not.toBe(newStorageKey(ORG));
  });

  it("rechaza claves que podrían salir de la carpeta", () => {
    expect(isValidStorageKey("../../etc/passwd")).toBe(false);
    expect(isValidStorageKey(`${ORG}/2026/11/../../x`)).toBe(false);
    expect(() => newStorageKey("no-es-un-uuid")).toThrow();
  });
});

describe("Disco local", () => {
  let root: string;
  let storage: LocalDiskStorage;

  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), "r360-archivos-"));
    storage = new LocalDiskStorage(root);
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("guarda y lee un archivo", async () => {
    const key = newStorageKey(ORG);
    await storage.put(key, JPEG);
    expect(Buffer.from((await storage.get(key))!)).toEqual(Buffer.from(JPEG));
    const info = await stat(path.join(root, ...key.split("/")));
    expect(info.size).toBe(JPEG.byteLength);
  });

  it("nunca pisa un archivo existente", async () => {
    const key = newStorageKey(ORG);
    await storage.put(key, JPEG);
    await expect(storage.put(key, PNG)).rejects.toMatchObject({ code: "EEXIST" });
    expect(Buffer.from((await storage.get(key))!)).toEqual(Buffer.from(JPEG));
  });

  it("devuelve null si el archivo no existe y rechaza claves inválidas", async () => {
    expect(await storage.get(newStorageKey(ORG))).toBeNull();
    await expect(storage.get("../secreto")).rejects.toThrow(/inválida/);
    await expect(storage.put("../secreto", JPEG)).rejects.toThrow(/inválida/);
  });

  it("check() pasa con la carpeta accesible", async () => {
    await expect(storage.check()).resolves.toBeUndefined();
  });
});

describe("Enlaces temporales a archivos", () => {
  const key = deriveFileLinkKey("s".repeat(32));
  const now = new Date("2026-11-01T12:00:00Z");

  it("valen para ese archivo, esa persona y dentro del plazo", () => {
    const token = signFileLink({ key, fileId: FILE, userId: USER, now });
    expect(verifyFileLink({ key, token, fileId: FILE, userId: USER, now })).toBe(true);
    const later = new Date(now.getTime() + 4 * 60_000);
    expect(verifyFileLink({ key, token, fileId: FILE, userId: USER, now: later })).toBe(true);
  });

  it("vencen a los 5 minutos", () => {
    const token = signFileLink({ key, fileId: FILE, userId: USER, now });
    const expired = new Date(now.getTime() + 5 * 60_000);
    expect(verifyFileLink({ key, token, fileId: FILE, userId: USER, now: expired })).toBe(false);
  });

  it("no sirven para otra persona, otro archivo ni con otra clave", () => {
    const token = signFileLink({ key, fileId: FILE, userId: USER, now });
    expect(verifyFileLink({ key, token, fileId: FILE, userId: ORG, now })).toBe(false);
    expect(verifyFileLink({ key, token, fileId: ORG, userId: USER, now })).toBe(false);
    const otherKey = deriveFileLinkKey("t".repeat(32));
    expect(verifyFileLink({ key: otherKey, token, fileId: FILE, userId: USER, now })).toBe(false);
  });

  it("rechazan tokens alterados o mal formados", () => {
    const token = signFileLink({ key, fileId: FILE, userId: USER, now });
    const [expiresAt, signature] = token.split(".");
    const extended = `${Number(expiresAt) + 3600}.${signature}`;
    expect(verifyFileLink({ key, token: extended, fileId: FILE, userId: USER, now })).toBe(false);
    expect(verifyFileLink({ key, token: "basura", fileId: FILE, userId: USER, now })).toBe(false);
  });
});
