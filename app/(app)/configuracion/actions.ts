"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import {
  categorySchema,
  documentTypeSchema,
  shiftSchema,
  siteSettingsSchema,
} from "@/features/settings/schemas";
import {
  moveCatalogItem,
  saveCategory,
  saveDocumentType,
  saveShift,
  updateSiteSettings,
} from "@/features/settings/service";
import { publicIntakeSettingsSchema } from "@/features/public-intake/schemas";
import { updatePublicIntakeSettings } from "@/features/public-intake/settings";
import { inTenant, runAction } from "@/lib/actions";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { getSiteContext } from "@/lib/site/server";

const optionalId = z.uuid().nullable();

export async function updateSiteAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = siteSettingsSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  return runAction(
    "settings.manage",
    async (context) => {
      const { site } = await getSiteContext(context);
      await inTenant(context, (tx) => updateSiteSettings(tx, context.tenant, site.id, parsed.data));
      refresh();
      return { success: "Los datos de la residencia quedaron guardados.", values };
    },
    { values },
  );
}

/** Landing con el formulario público (12.9): dirección, presentación y si está publicada. */
export async function updatePublicIntakeAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = publicIntakeSettingsSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  return runAction(
    "settings.manage",
    async (context) => {
      const { site } = await getSiteContext(context);
      await inTenant(context, (tx) =>
        updatePublicIntakeSettings(tx, context.tenant, site.id, parsed.data),
      );
      refresh();
      return {
        success: parsed.data.publicIntakeEnabled
          ? "Formulario publicado."
          : "Guardado. El formulario no está publicado.",
        values,
      };
    },
    { values },
  );
}

export async function saveShiftAction(
  shiftId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = shiftSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  if (!optionalId.safeParse(shiftId).success) return { error: "Turno inválido." };
  return runAction(
    "settings.manage",
    async (context) => {
      const { site } = await getSiteContext(context);
      await inTenant(context, (tx) => saveShift(tx, context.tenant, site.id, shiftId, parsed.data));
      refresh();
      return {
        success: shiftId ? "Turno guardado." : "Turno agregado.",
        values: shiftId ? values : undefined,
      };
    },
    { values },
  );
}

export async function saveCategoryAction(
  categoryId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  if (!optionalId.safeParse(categoryId).success) return { error: "Categoría inválida." };
  return runAction(
    "settings.manage",
    async (context) => {
      await inTenant(context, (tx) => saveCategory(tx, context.tenant, categoryId, parsed.data));
      refresh();
      return { success: categoryId ? "Categoría guardada." : "Categoría agregada." };
    },
    { values },
  );
}

export async function saveDocumentTypeAction(
  documentTypeId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = documentTypeSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  if (!optionalId.safeParse(documentTypeId).success) return { error: "Documento inválido." };
  return runAction(
    "settings.manage",
    async (context) => {
      await inTenant(context, (tx) =>
        saveDocumentType(tx, context.tenant, documentTypeId, parsed.data),
      );
      refresh();
      return { success: documentTypeId ? "Documento guardado." : "Documento agregado." };
    },
    { values },
  );
}

export async function moveCatalogItemAction(
  catalog: "note_categories" | "document_types",
  itemId: string,
  direction: "up" | "down",
): Promise<void> {
  if (!z.uuid().safeParse(itemId).success) return;
  await runAction("settings.manage", async (context) => {
    await inTenant(context, (tx) =>
      moveCatalogItem(tx, context.tenant, catalog, itemId, direction),
    );
    refresh();
    return null;
  });
}
