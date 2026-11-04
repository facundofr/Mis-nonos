import { describe, expect, it } from "vitest";

import { ACTION_LABELS } from "@/features/activity/labels";
import { logGroupOf } from "@/features/activity/log-groups";

// Registro de cambios (docs/decisions/0021): cada acción cae en un tipo.
describe("tipos de cambio del registro", () => {
  it("clasifica altas, cambios, bajas y aperturas", () => {
    expect(logGroupOf("note.created")).toBe("altas");
    expect(logGroupOf("fee.payment_registered")).toBe("altas");
    expect(logGroupOf("resident.updated")).toBe("cambios");
    expect(logGroupOf("membership.role_changed")).toBe("cambios");
    expect(logGroupOf("care.encounter_voided")).toBe("bajas");
    expect(logGroupOf("resident.allergy_discarded")).toBe("bajas");
    expect(logGroupOf("membership.disabled")).toBe("bajas");
    expect(logGroupOf("resident.contact_removed")).toBe("bajas");
    expect(logGroupOf("emergency.viewed")).toBe("aperturas");
    expect(logGroupOf("emergency.pdf_generated")).toBe("aperturas");
  });

  it("todas las acciones con nombre tienen un tipo", () => {
    for (const action of Object.keys(ACTION_LABELS)) {
      expect(["altas", "cambios", "bajas", "aperturas"]).toContain(logGroupOf(action));
    }
  });
});
