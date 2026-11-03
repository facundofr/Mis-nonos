"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Pantallas en tiempo real (Fichaje): vuelve a pedir los datos cada tantos
 * segundos y muestra la hora, que corre sola.
 */
export function LiveRefresh({
  everySeconds = 20,
  timeZone,
  className,
}: {
  everySeconds?: number;
  timeZone: string;
  className?: string;
}) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    const refresh = setInterval(() => router.refresh(), everySeconds * 1000);
    const first = setTimeout(() => setNow(new Date()), 0);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
      clearTimeout(first);
    };
  }, [router, everySeconds]);

  return (
    <span className={className} aria-live="off">
      {now
        ? now.toLocaleTimeString("es-AR", {
            timeZone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
          })
        : " "}
    </span>
  );
}
