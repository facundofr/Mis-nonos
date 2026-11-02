# 0016 — Landing y formulario público de solicitud de ingreso

- **Fecha:** 02/11/2026
- **Estado:** aceptada.
  - DC-15: el 02/11/2026 se decidió no usar captcha por ahora.
  - DC-16 y DC-17: se aplicaron las propuestas, que quedan a confirmar.
  - DC-19: falta el contenido de Mis Nonos.
  - El aviso de privacidad es un borrador hasta que lo revise el abogado
    (F0-07).
- **Contexto:** F1-SOL-03 y F1-SOL-04. Secciones 7.3-C3, 12.9 y 17.8.

## Decisiones

1. **Es una vía opcional más.** La solicitud que manda una familia cae en
   la misma tabla (`admission_requests`) y en la misma bandeja que la que
   carga el personal, con `origin = 'landing'` y "Formulario web" como
   canal. Se revisa, se edita, se convierte o se descarta igual que las
   demás. La carga manual y el ingreso directo no cambian.
2. **Dirección de la landing:** `/residencia/<dirección>`, con tres
   pantallas: presentación, formulario en 2 pasos y confirmación, más el
   aviso de privacidad. Cada sede la activa en Configuración › Formulario
   público: elige la dirección (única entre residencias), escribe una
   presentación y marca "Publicar el formulario".
   - Sin publicar o con la residencia inactiva, la dirección da 404, sin
     decir si la residencia existe.
   - El dominio propio de la landing queda para DC-09.
3. **La residencia se resuelve en el servidor**, con la función
   `app.public_intake_site(dirección)` (SECURITY DEFINER). Devuelve solo
   lo que muestra la landing: nombre, dirección, teléfono y presentación.
   Nunca se usa un dato que mande el navegador.
4. **Rol de base de datos `r360_public`, que solo agrega:**
   - es NOLOGIN; la app lo asume con `SET LOCAL ROLE` solo en esa
     transacción. Lo crea `db/init/01-roles.sh` (y el manual de
     producción); `GRANT r360_public TO r360_app WITH INHERIT FALSE`, así
     la app no recibe sus políticas;
   - tiene `INSERT` en `admission_requests`, `domain_events` y
     `audit_events`, y nada de `SELECT`, `UPDATE` ni `DELETE`;
   - las políticas RLS solo le dejan agregar una solicitud nueva, sin
     autor ni notas internas, de la residencia de la transacción, con su
     evento `admission_request.created` y su auditoría sin persona;
   - como no puede leer, escribe sin `RETURNING` y el id (UUIDv7) se
     genera en la app (`lib/ids.ts`).
5. **Doble envío:** la clave del formulario (`client_request_id`) es
   única. Si se repite, la base la rechaza y se responde igual que la
   primera vez.
6. **Defensas sin captcha (DC-15):** se rechaza todo envío que no pase
   estas tres barreras:
   - un campo oculto que solo completan los robots;
   - un sello firmado con la hora en que se abrió el formulario (menos
     de 3 s o un sello falso se descarta);
   - un límite de envíos por IP (5 por hora) y por residencia (40 por
     hora), en memoria, porque en el piloto hay una sola instancia.

   Ante un robot, la respuesta es la misma que ante un envío correcto. En
   el VPS, el proxy suma su propio límite. Si aparece spam, se agrega
   ALTCHA.

7. **Misma respuesta siempre:** no se revisa si el DNI existe; los
   posibles duplicados solo los ve el personal, en el detalle.
8. **Campos (DC-17):**
   - obligatorios: nombre, apellido, nacimiento y modalidad del futuro
     residente, y nombre y teléfono de quien llama, más la casilla del
     aviso de privacidad;
   - opcionales: DNI, cobertura, n.º de beneficiario, fecha deseada,
     vínculo, email, un familiar más y un mensaje de hasta 600
     caracteres;
   - nunca se piden diagnósticos, medicación ni fotos;
   - se guardan la fecha del consentimiento y la versión del aviso
     (`consent_text_version`).
9. **Avisos:**
   - al personal, el de siempre: Administración y Dirección, sin datos
     del paciente;
   - a la familia (DC-16), solo si dejó un email: un acuse genérico
     ("Recibimos tu solicitud en …"), sin datos del futuro residente
     (cola `email.admission-request-receipt`).
10. **Auditoría y logs:**
    - la auditoría registra el alta sin persona y sin copiar datos
      (`origin`, versión del aviso);
    - los logs solo registran el motivo de un descarte o de un límite,
      nunca lo que escribió la familia;
    - el borrado a los 12 meses (DC-14) incluye estas solicitudes.

## Consecuencias

- Migraciones: `0032_public_intake` (columnas de `sites` y políticas) y
  `0033_public_intake_grants` (permisos y función). En una base ya creada,
  el rol se crea a mano antes de migrar, con el mismo SQL de
  `01-roles.sh`.
- Pruebas: `tests/unit/public-intake.test.ts`,
  `tests/integration/public-intake.test.ts` (no lee nada, solo agrega lo
  permitido, doble envío, residencia por dirección, apagada, aislamiento,
  conversión, acuse) y `tests/e2e/landing.spec.ts`.
- Antes de compartir la dirección con las familias:
  - el abogado tiene que revisar el aviso
    (`features/public-intake/privacy.ts`; al cambiarlo, cambia la
    versión);
  - hay que confirmar DC-16 y DC-17 y tener el contenido de DC-19.
- La landing no se indexa en buscadores mientras siga en borrador, igual
  que el resto de la app.
- Arreglo general: las listas desplegables perdían la opción elegida
  cuando un formulario volvía con un error. Pasaba en toda la app; se
  corrigió en `components/ui/field.tsx`.
- Raíz del dominio: con `HOME_LANDING_SLUG` (por ejemplo `mis-nonos`),
  quien entra a `/` sin sesión va a la landing; el personal entra por
  `/ingresar`. Vacía, la raíz lleva al ingreso como antes. Se usa en
  `www.mis-nonos.facundofr.com` (DEPLOY.md), donde la app y la landing
  comparten el dominio.
