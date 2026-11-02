import { z } from "zod";

import { parseMoney } from "./money";

/*
 * Validación del abono (7.3-C4, DC-20 a DC-22). Los montos llegan como los
 * escribe la persona ("150.000,50") y se guardan como "150000.50".
 */

const moneyField = (options: { allowZero: boolean }) =>
  z
    .string({ message: "Escribí el monto." })
    .trim()
    .min(1, "Escribí el monto.")
    .transform((value, context) => {
      const parsed = parseMoney(value);
      if (parsed === null) {
        context.addIssue({ code: "custom", message: "Revisá el monto: por ejemplo, 150.000." });
        return z.NEVER;
      }
      if (!options.allowZero && parsed === "0.00") {
        context.addIssue({ code: "custom", message: "El monto tiene que ser mayor que cero." });
        return z.NEVER;
      }
      return parsed;
    });

const isoDate = (message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message);

const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on");

/** Paso 4 del ingreso: abono, próximo vencimiento y primer mes cobrado. */
export const feeSetupSchema = z
  .object({
    feeAmount: moneyField({ allowZero: true }),
    firstDueDate: isoDate("Elegí el próximo vencimiento."),
    firstMonthPaid: checkbox,
    firstPaymentMethodId: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.firstMonthPaid && value.feeAmount !== "0.00") {
      if (!z.uuid().safeParse(value.firstPaymentMethodId).success) {
        context.addIssue({
          code: "custom",
          path: ["firstPaymentMethodId"],
          message: "Elegí cómo se pagó el primer mes.",
        });
      }
    }
  });
export type FeeSetupInput = z.infer<typeof feeSetupSchema>;

export const paymentSchema = z.object({
  amount: moneyField({ allowZero: false }),
  paidOn: isoDate("Elegí la fecha del pago."),
  methodId: z.uuid("Elegí el medio de pago."),
  notes: z
    .string()
    .trim()
    .max(300, "Como máximo 300 caracteres.")
    .optional()
    .transform((value) => value || null),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const priceChangeSchema = z.object({
  amount: moneyField({ allowZero: true }),
  reason: z
    .string()
    .trim()
    .min(3, "Escribí el motivo del cambio.")
    .max(200, "Como máximo 200 caracteres."),
});
export type PriceChangeInput = z.infer<typeof priceChangeSchema>;

export const voidPaymentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Escribí por qué se anula.")
    .max(200, "Como máximo 200 caracteres."),
});

export const paymentMethodSchema = z.object({
  name: z.string().trim().min(1, "Escribí el nombre.").max(40, "Como máximo 40 caracteres."),
  active: checkbox,
});

/** Estado para mostrar: "vencida" se calcula (pendiente y ya pasó el vencimiento). */
export type ChargeDisplayStatus = "paid" | "pending" | "overdue" | "void";

export function displayStatus(status: string, dueDate: string, today: string): ChargeDisplayStatus {
  if (status === "paid" || status === "void") return status;
  return dueDate < today ? "overdue" : "pending";
}

export const CHARGE_STATUS_LABELS: Record<ChargeDisplayStatus, string> = {
  paid: "Pagada",
  pending: "Pendiente",
  overdue: "Vencida",
  void: "Anulada",
};
