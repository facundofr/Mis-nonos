import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Convención: lo que empieza con "_" se recibe a propósito y no se usa
      // (el estado previo de useActionState, campos que se descartan).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "dist/**",
    "next-env.d.ts",
    // Diseño de referencia (canvas): no es código de la app.
    "project/**",
    // Skills y scripts de herramientas de agentes (Impeccable): no es código de la app.
    ".claude/**",
  ]),
]);
