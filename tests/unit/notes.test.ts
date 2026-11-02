import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "@/features/notes/queries";
import {
  canStillEdit,
  noteSchema,
  noteSubjectSchema,
  resolveSchema,
} from "@/features/notes/schemas";
import { formatWhen } from "@/lib/time/format";

const categoryId = "0190f0c2-6a7b-7c3d-8e9f-0a1b2c3d4e5f";

describe("Novedades: validación", () => {
  it("pide categoría y texto; el seguimiento es una casilla", () => {
    expect(noteSchema.parse({ categoryId, content: "  Durmió bien.  ", followUp: "on" })).toEqual({
      categoryId,
      content: "Durmió bien.",
      followUp: true,
    });
    const result = noteSchema.safeParse({ categoryId: "", content: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(["categoryId", "content"]);
  });

  it("no acepta textos de más de 2000 caracteres", () => {
    expect(noteSchema.safeParse({ categoryId, content: "a".repeat(2001) }).success).toBe(false);
  });

  it("el sujeto es «general» o el id de un paciente", () => {
    expect(noteSubjectSchema.safeParse("general").success).toBe(true);
    expect(noteSubjectSchema.safeParse(categoryId).success).toBe(true);
    expect(noteSubjectSchema.safeParse("todos").success).toBe(false);
  });

  it("el comentario al resolver es opcional", () => {
    expect(resolveSchema.parse({})).toEqual({ resolutionNote: null });
    expect(resolveSchema.parse({ resolutionNote: " Listo " })).toEqual({ resolutionNote: "Listo" });
  });
});

describe("Novedades: reglas", () => {
  it("el autor corrige hasta 24 h después", () => {
    const created = new Date("2026-11-01T10:00:00Z");
    expect(canStillEdit(created, new Date("2026-11-02T09:59:00Z"))).toBe(true);
    expect(canStillEdit(created, new Date("2026-11-02T10:00:00Z"))).toBe(false);
  });

  it("el cursor de la lista ida y vuelta", () => {
    const item = { createdAt: new Date("2026-11-02T07:15:00.123Z"), id: categoryId };
    expect(decodeCursor(encodeCursor(item))).toEqual(item);
    expect(decodeCursor("cualquier cosa")).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });

  it("muestra hoy, ayer o la fecha, en la hora de la sede", () => {
    const now = new Date("2026-11-02T15:00:00Z"); // 12:00 en Buenos Aires
    expect(formatWhen(new Date("2026-11-02T10:15:00Z"), now)).toBe("hoy 07:15");
    expect(formatWhen(new Date("2026-11-02T00:40:00Z"), now)).toBe("ayer 21:40");
    expect(formatWhen(new Date("2026-10-28T12:05:00Z"), now)).toBe("28/10 09:05");
  });
});
