/*
 * Montos en pesos (7.3-C4). En la base son numeric(12,2) y llegan como
 * texto ("150000.50"); las cuentas se hacen en centavos enteros para no
 * arrastrar errores de punto flotante.
 */

const MAX_CENTS = 9_999_999_999_99n;

/**
 * Lo que escribe la persona → "150000.50". Acepta "150000", "150.000",
 * "150.000,50", "150000,5" y "$ 150.000". Devuelve null si no es un monto.
 */
export function parseMoney(input: string): string | null {
  let text = input
    .trim()
    .replace(/^\$\s*/, "")
    .replace(/\s/g, "");
  if (!text) return null;
  if (text.includes(",")) {
    // Formato argentino: puntos de miles y coma decimal.
    if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(text)) return null;
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    // "150.000": puntos de miles.
    text = text.replace(/\./g, "");
  } else if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return null;
  }
  const cents = toCents(text);
  if (cents > MAX_CENTS) return null;
  return fromCents(cents);
}

export function toCents(value: string): bigint {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
}

export function fromCents(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

const formatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "150000.50" → "$ 150.000,50" */
export function formatMoney(value: string | bigint): string {
  const cents = typeof value === "bigint" ? value : toCents(value);
  return formatter.format(Number(cents) / 100).replace(/ /g, " ");
}
