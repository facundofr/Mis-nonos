/*
 * Aviso de privacidad del formulario público (12.9). BORRADOR: lo tiene que
 * revisar el abogado antes de publicar la landing (F0-07). Cada solicitud
 * guarda la versión que aceptó la familia (consent_text_version); si el
 * texto cambia, cambia la versión.
 */

export const PRIVACY_NOTICE_VERSION = "2026-11-02-borrador";

/** ¿El texto todavía no lo revisó el abogado? Se muestra un aviso en Configuración. */
export const PRIVACY_NOTICE_IS_DRAFT = PRIVACY_NOTICE_VERSION.endsWith("-borrador");

export const CONSENT_LABEL =
  "Leí el aviso de privacidad y acepto que la residencia use estos datos para responder la solicitud.";

export interface PrivacySection {
  title: string;
  paragraphs: string[];
}

/** Texto del aviso. `{residencia}` se reemplaza por el nombre de la sede. */
export const PRIVACY_NOTICE: PrivacySection[] = [
  {
    title: "Quién recibe los datos",
    paragraphs: [
      "Los datos de este formulario los recibe {residencia}, que es responsable de su tratamiento, para responder tu solicitud de ingreso.",
    ],
  },
  {
    title: "Qué datos pedimos y para qué",
    paragraphs: [
      "Pedimos lo mínimo para volver a contactarte: nombre, fecha de nacimiento y cobertura de la persona que ingresaría, y tus datos de contacto. No pedimos diagnósticos, medicación ni fotos de documentos.",
      "Los usamos solo para llamarte, coordinar una entrevista y, si hay acuerdo, preparar el ingreso. No los compartimos con terceros ni los usamos para publicidad.",
    ],
  },
  {
    title: "Cuánto tiempo los guardamos",
    paragraphs: [
      "Si la solicitud no termina en un ingreso, se borra a los 12 meses de su última actividad. Si termina en un ingreso, pasa al legajo de la persona.",
    ],
  },
  {
    title: "Tus derechos",
    paragraphs: [
      "Podés pedir ver, corregir o borrar tus datos en cualquier momento, comunicándote con la residencia. La Agencia de Acceso a la Información Pública es el órgano de control de la Ley 25.326 de Protección de los Datos Personales.",
    ],
  },
];
