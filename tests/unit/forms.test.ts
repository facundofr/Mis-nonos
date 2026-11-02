import { describe, expect, it } from "vitest";

import { formValues, isPasswordField } from "@/lib/forms";

describe("formValues", () => {
  it("no devuelve contraseñas, pero sí los demás campos (aunque digan «confirm»)", () => {
    const data = new FormData();
    data.set("password", "secreta");
    data.set("currentPassword", "vieja");
    data.set("temporaryPassword", "provisoria");
    data.set("confirm", "secreta");
    data.set("handoverRequiresConfirmation", "on");
    data.set("name", "Sede central");
    expect(formValues(data)).toEqual({ handoverRequiresConfirmation: "on", name: "Sede central" });
  });

  it("reconoce los campos de contraseña", () => {
    expect(isPasswordField("confirm")).toBe(true);
    expect(isPasswordField("nuevaContrasena")).toBe(true);
    expect(isPasswordField("handoverRequiresConfirmation")).toBe(false);
  });
});
