import { PROFESSIONAL_KINDS } from "@/features/care/schemas";
import { COVERAGE_TYPES, DISCHARGE_REASONS, MODALITIES } from "@/features/residents/schemas";
import { STATUS_LABELS } from "@/features/residents/format";
import { formatDateKey } from "@/lib/time/format";

/*
 * Cómo se lee el historial: acciones y campos en palabras, y valores
 * legibles (Sí/No, fechas, estados). Solo para mostrar.
 */

export const ACTION_LABELS: Record<string, string> = {
  "admission.started": "Empezó el ingreso",
  "admission.confirmed": "Confirmó el ingreso",
  "admission.cancelled": "Canceló el ingreso",
  "resident.updated": "Editó los datos",
  "resident.contact_added": "Agregó un contacto",
  "resident.contact_updated": "Editó un contacto",
  "resident.contact_removed": "Quitó un contacto",
  "resident.allergy_added": "Agregó una alergia",
  "resident.allergy_discarded": "Descartó una alergia",
  "resident.status_changed": "Cambió el estado",
  "resident.returned": "Registró la vuelta de la internación",
  "resident.document_uploaded": "Subió un documento al legajo",
  "resident.document_file_removed": "Quitó un archivo del legajo",
  "resident.document_viewed": "Abrió un documento del legajo",
  "emergency.viewed": "Abrió la ficha de emergencia",
  "emergency.pdf_generated": "Generó la hoja de derivación",
  "note.created": "Registró una novedad",
  "note.corrected": "Corrigió una novedad",
  "note.resolved": "Resolvió un seguimiento",
  "handover.delivered": "Entregó el turno",
  "admission_request.created": "Cargó la solicitud de ingreso",
  "admission_request.updated": "Editó la solicitud",
  "admission_request.status_changed": "Cambió el estado de la solicitud",
  "admission_request.discarded": "Descartó la solicitud",
  "admission_request.converted": "Convirtió la solicitud en ingreso",
  "admission_request.purged": "Borró solicitudes vencidas",
  "fee.plan_created": "Fijó el abono",
  "fee.price_changed": "Cambió el precio del abono",
  "fee.payment_registered": "Registró un pago del abono",
  "fee.payment_voided": "Anuló un pago del abono",
  "settings.payment_method_created": "Agregó un medio de pago",
  "settings.payment_method_updated": "Editó un medio de pago",
  "handover.confirmed": "Confirmó la recepción del turno",
  "site.public_intake_updated": "Cambió el formulario público",
  "care.specialty_created": "Agregó una especialidad",
  "care.specialty_updated": "Editó una especialidad",
  "care.professional_created": "Agregó un profesional",
  "care.professional_updated": "Editó un profesional",
  "care.encounter_recorded": "Registró una atención",
  "care.encounter_voided": "Anuló una atención",
  "emergency.recorded": "Registró una emergencia",
  "emergency.closed": "Cerró una emergencia",
};

const FIELD_LABELS: Record<string, string> = {
  publicIntakeEnabled: "Formulario publicado",
  publicSlug: "Dirección pública",
  publicIntro: "Presentación",
  firstName: "Nombre",
  lastName: "Apellido",
  nationalId: "DNI",
  birthDate: "Nacimiento",
  birthPlace: "Lugar de nacimiento",
  previousAddress: "Domicilio anterior",
  roomLabel: "Habitación",
  admissionDate: "Fecha de ingreso",
  referralInstitution: "Institución que lo deriva",
  admissionModality: "Modalidad",
  coverageType: "Cobertura",
  coverageName: "Obra social o prepaga",
  coverageMemberNumber: "N.º de beneficiario o afiliado",
  coveragePlan: "Plan",
  nationalIdInCustody: "DNI en custodia",
  primaryPhysicianName: "Médico de cabecera",
  primaryPhysicianPhone: "Teléfono del médico",
  specialInstructions: "Indicaciones especiales",
  status: "Estado",
  hospitalizationPlace: "Internado en",
  hospitalizedSince: "Internado desde",
  dischargeDate: "Fecha de egreso",
  dischargeReason: "Motivo de egreso",
  dischargeNotes: "Observación del egreso",
  name: "Nombre",
  relationship: "Vínculo",
  address: "Domicilio",
  phonePrimary: "Teléfono",
  phoneMobile: "Celular",
  phoneWork: "Teléfono laboral",
  whatsapp: "WhatsApp",
  email: "Email",
  emergencyPriority: "Orden en emergencias",
  isAdmissionResponsible: "Responsable de la internación",
  isLegalRepresentative: "Referente legal",
  canReceiveInfo: "Recibe información",
  canPickUp: "Puede retirarlo/a",
  isPayer: "Paga el abono",
  availabilityNotes: "Disponibilidad",
  lastVerifiedAt: "Verificado",
  substance: "Alergia",
  reaction: "Reacción",
  severity: "Gravedad",
  category: "Categoría",
  followUp: "Requiere seguimiento",
  amount: "Monto",
  billingDay: "Día de vencimiento",
  paidOn: "Fecha del pago",
  transferred: "Hubo traslado",
  kind: "Tipo",
  licenseNumber: "Matrícula",
  institution: "Institución",
  notes: "Notas",
  active: "Activo",
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  status: { ...STATUS_LABELS, discarded: "Descartada" },
  admissionModality: MODALITIES,
  coverageType: COVERAGE_TYPES,
  dischargeReason: DISCHARGE_REASONS,
  kind: PROFESSIONAL_KINDS,
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

export function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  const text = String(value);
  const mapped = VALUE_LABELS[field]?.[text];
  if (mapped) return mapped;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return formatDateKey(text);
  return text;
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
