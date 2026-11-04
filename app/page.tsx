import { redirect } from "next/navigation";

// La raíz lleva a la app. Sin sesión, proxy.ts la manda a /ingresar.
export default function RootPage() {
  redirect("/inicio");
}
