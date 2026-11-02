import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { listNoteCategories } from "@/features/settings/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";

import { CategoryForm, MoveButtons } from "../settings-forms";

export const metadata: Metadata = { title: "Categorías de novedades" };

export default async function CategoriesSettingsPage() {
  const context = await requirePermission("settings.manage");
  const categories = await inTenant(context, (tx) => listNoteCategories(tx));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Categorías de novedades"
        description="Se ofrecen en este orden al registrar una novedad."
        back={{ href: "/configuracion", label: "Configuración" }}
      />
      <ul className="flex flex-col gap-2">
        {categories.map((category, index) => (
          <li key={category.id} className="rounded-[14px] border bg-card">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{category.name}</span>
                {category.active ? null : <Badge>Inactiva</Badge>}
              </span>
              <MoveButtons
                catalog="note_categories"
                itemId={category.id}
                first={index === 0}
                last={index === categories.length - 1}
                name={category.name}
              />
            </div>
            <details className="border-t px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-primary">Editar</summary>
              <div className="pt-4">
                <CategoryForm category={category} />
              </div>
            </details>
          </li>
        ))}
      </ul>
      <Card>
        <CardHeader title="Agregar categoría" />
        <div className="p-5">
          <CategoryForm />
        </div>
      </Card>
    </div>
  );
}
