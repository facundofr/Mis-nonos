import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { isSectionHidden } from "@/lib/navigation/hidden";

/** Sección oculta por ahora (lib/navigation/hidden): no se puede abrir. */
export default function HiddenSectionLayout({ children }: { children: ReactNode }) {
  if (isSectionHidden("novedades")) notFound();
  return children;
}
