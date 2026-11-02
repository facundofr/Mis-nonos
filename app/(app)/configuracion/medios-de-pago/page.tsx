import type { Metadata } from "next";

import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { listPaymentMethods } from "@/features/fees/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";

import { PaymentMethodForm } from "../../abonos/fee-forms";

export const metadata: Metadata = { title: "Medios de pago" };

/** Medios de pago del abono, configurables por sede (DC-21). */
export default async function PaymentMethodsPage() {
  const context = await requirePermission("settings.manage");
  const { site } = await getSiteContext(context);
  const methods = await inTenant(context, (tx) => listPaymentMethods(tx, site.id, false));
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Medios de pago"
        description="Los que se ofrecen al registrar un pago del abono."
        back={{ href: "/configuracion", label: "Configuración" }}
      />
      <Card>
        <CardHeader title="Agregar" />
        <div className="p-5">
          <PaymentMethodForm />
        </div>
      </Card>
      {methods.map((method) => (
        <Card key={method.id}>
          <CardHeader title={method.name} description={method.active ? "Activo" : "Inactivo"} />
          <div className="p-5">
            <PaymentMethodForm method={method} />
          </div>
        </Card>
      ))}
    </div>
  );
}
