import { randomInt } from "node:crypto";

// Sin letras ni números que se confunden al dictarlos (0/o, 1/l/i).
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Contraseña provisoria fácil de dictar: "k7m2-p9qx-4rtz" (DC-11). */
export function suggestTemporaryPassword(): string {
  const group = () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}
