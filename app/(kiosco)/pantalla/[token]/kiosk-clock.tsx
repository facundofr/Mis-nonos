"use client";

import { useEffect, useState } from "react";

/** Hora grande de la pantalla de fichaje (la del dispositivo). */
export function KioskClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(tick);
    };
  }, []);
  return (
    <p className="text-5xl font-semibold tabular-nums">
      {now
        ? now.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
          })
        : " "}
    </p>
  );
}
