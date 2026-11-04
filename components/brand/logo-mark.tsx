import Image from "next/image";

import logo from "@/assets/logo-misnonos-cuadrado.jpg";
import { cn } from "@/lib/utils";

/**
 * Logo de Mis Nonos (la nona en la mecedora). Es el mismo en toda la app:
 * menús, ingreso, página pública y kiosco. El tamaño y el redondeo los da
 * quien lo usa (por ejemplo, "size-9 rounded-[10px]").
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt=""
      aria-hidden="true"
      sizes="48px"
      className={cn("shrink-0 bg-white object-contain ring-1 ring-black/5", className)}
    />
  );
}
