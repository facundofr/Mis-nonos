import { describe, expect, it } from "vitest";

import { documentsFor, missingRequired } from "@/features/documents/requirements";
import { ageOn, formatNationalId, telHref, whatsappHref } from "@/features/residents/format";
import { contactSchema, residentDataSchema } from "@/features/residents/schemas";

const resident = {
  firstName: " Elena ",
  lastName: "Ramírez",
  nationalId: "4.512.778",
  birthDate: "1942-03-14",
  roomLabel: "12",
  admissionDate: "2026-11-01",
  admissionModality: "pami",
  coverageType: "pami",
  coverageMemberNumber: "15-0452778-0-00",
  primaryPhysicianPhone: "11 4789-2201",
};

describe("Datos del paciente", () => {
  it("normaliza el DNI, recorta textos y trata como vacío lo que no se envía", () => {
    const parsed = residentDataSchema.parse(resident);
    expect(parsed).toMatchObject({
      firstName: "Elena",
      nationalId: "4512778",
      coverageName: null,
      birthPlace: null,
      nationalIdInCustody: false,
      primaryPhysicianPhone: "11 4789-2201",
    });
  });

  it("rechaza DNI y teléfonos con letras", () => {
    expect(residentDataSchema.safeParse({ ...resident, nationalId: "45s12778" }).success).toBe(
      false,
    );
    expect(
      residentDataSchema.safeParse({ ...resident, primaryPhysicianPhone: "11 sss 2201" }).success,
    ).toBe(false);
  });

  it("con modalidad PAMI la cobertura es PAMI y lleva número", () => {
    expect(residentDataSchema.safeParse({ ...resident, coverageType: "prepaga" }).success).toBe(
      false,
    );
    expect(residentDataSchema.safeParse({ ...resident, coverageMemberNumber: "" }).success).toBe(
      false,
    );
    expect(
      residentDataSchema.safeParse({
        ...resident,
        admissionModality: "private",
        coverageType: "none",
        coverageMemberNumber: "",
      }).success,
    ).toBe(true);
  });

  it("no acepta nacimientos futuros", () => {
    expect(residentDataSchema.safeParse({ ...resident, birthDate: "2999-01-01" }).success).toBe(
      false,
    );
  });
});

describe("Contactos", () => {
  const contact = { name: "Silvia Ramírez", phoneMobile: "11 5821-4430", emergencyPriority: "1" };

  it("hace falta al menos un teléfono", () => {
    expect(contactSchema.safeParse({ name: "Silvia" }).success).toBe(false);
    expect(contactSchema.parse(contact)).toMatchObject({
      emergencyPriority: 1,
      canReceiveInfo: false,
    });
  });

  it("el responsable de la internación lleva DNI y domicilio", () => {
    const result = contactSchema.safeParse({ ...contact, isAdmissionResponsible: "on" });
    expect(result.success).toBe(false);
    expect(
      contactSchema.safeParse({
        ...contact,
        isAdmissionResponsible: "on",
        nationalId: "20.111.222",
        address: "Calle Falsa 123",
      }).success,
    ).toBe(true);
  });
});

describe("Formato", () => {
  it("calcula la edad cumplida", () => {
    expect(ageOn("1942-03-14", "2026-03-13")).toBe(83);
    expect(ageOn("1942-03-14", "2026-03-14")).toBe(84);
    expect(ageOn(null, "2026-03-14")).toBeNull();
  });

  it("arma enlaces para llamar y para WhatsApp", () => {
    expect(telHref("11 5821-4430")).toBe("tel:1158214430");
    expect(whatsappHref("011 5821-4430")).toBe("https://wa.me/5491158214430");
    expect(formatNationalId("4512778")).toBe("4.512.778");
  });
});

describe("Documentos por modalidad", () => {
  const types = [
    { id: "a", requiredFor: "all", required: true, active: true },
    { id: "b", requiredFor: "pami", required: true, active: true },
    { id: "c", requiredFor: "private", required: true, active: true },
    { id: "d", requiredFor: "all", required: false, active: true },
    { id: "e", requiredFor: "all", required: true, active: false },
  ];

  it("filtra por modalidad y por activos", () => {
    expect(documentsFor(types, "pami").map((type) => type.id)).toEqual(["a", "b", "d"]);
    expect(documentsFor(types, "private").map((type) => type.id)).toEqual(["a", "c", "d"]);
  });

  it("los faltantes son los obligatorios sin cargar", () => {
    expect(missingRequired(types, "pami", new Set(["a"])).map((type) => type.id)).toEqual(["b"]);
  });
});
