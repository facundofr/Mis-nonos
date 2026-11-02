import { describe, expect, it } from "vitest";

import { ALLOWED_FROM, extraContacts, requestSchema } from "@/features/admission-requests/schemas";

const base = {
  contactChannel: "whatsapp",
  firstName: "Rosa",
  lastName: "Medina",
  responsibleName: "Carla Medina",
  responsiblePhone: "11 5555 1234",
};

describe("Solicitudes: validación", () => {
  it("alcanza con el nombre del paciente y el nombre y teléfono del responsable", () => {
    const parsed = requestSchema.parse(base);
    expect(parsed).toMatchObject({ firstName: "Rosa", nationalId: null, admissionModality: null });
  });

  it("pide canal, nombre y teléfono del responsable", () => {
    const result = requestSchema.safeParse({ firstName: "Rosa", lastName: "Medina" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(["contactChannel", "responsibleName", "responsiblePhone"]),
    );
  });

  it("un familiar extra lleva nombre y teléfono", () => {
    const result = requestSchema.safeParse({ ...base, contact2Name: "Pedro" });
    expect(result.error?.issues[0]).toMatchObject({ path: ["contact2Phone"] });
    const ok = requestSchema.parse({
      ...base,
      contact3Name: "Pedro",
      contact3Phone: "11 4444 0000",
    });
    expect(extraContacts(ok)).toEqual([
      { name: "Pedro", relationship: null, phone: "11 4444 0000" },
    ]);
  });

  it("con modalidad PAMI, la cobertura es PAMI; el DNI se guarda sin puntos", () => {
    expect(
      requestSchema.safeParse({ ...base, admissionModality: "pami", coverageType: "prepaga" })
        .success,
    ).toBe(false);
    expect(requestSchema.parse({ ...base, nationalId: "3.811.222" }).nationalId).toBe("3811222");
  });

  it("convertida y descartada son estados finales (DC-18)", () => {
    for (const target of Object.values(ALLOWED_FROM)) {
      expect(target).not.toContain("converted");
      expect(target).not.toContain("discarded");
    }
  });
});
