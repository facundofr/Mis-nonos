import { redirect } from "next/navigation";

// La raíz lleva a la app. Sin sesión, proxy.ts la manda a la landing
// (HOME_LANDING_SLUG) o al ingreso.
export default function RootPage() {
  redirect("/inicio");
}
