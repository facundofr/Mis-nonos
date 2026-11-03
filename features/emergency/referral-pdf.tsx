import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";

import { ageOn, formatNationalId, fullName } from "../residents/format";
import { COVERAGE_TYPES } from "../residents/schemas";
import type { EmergencySheet } from "./queries";

/*
 * Hoja de derivación (7.3-E, 8.4; diseño HojaDerivacion): para entregar a la
 * ambulancia o a la guardia. Sin novedades (DC-06: no se incluyen por
 * defecto). Generada en el servidor: igual en cualquier teléfono (10.10).
 */

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    color: "#16201E",
    lineHeight: 1.35,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "2pt solid #863A2A",
    paddingBottom: 10,
    marginBottom: 14,
  },
  kicker: { fontSize: 9, color: "#863A2A", textTransform: "uppercase", letterSpacing: 1 },
  name: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 2 },
  muted: { color: "#57625F" },
  right: { alignItems: "flex-end", maxWidth: 220 },
  bold: { fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 12 },
  label: {
    fontSize: 8.5,
    color: "#57625F",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  allergy: {
    backgroundColor: "#FEF3F2",
    border: "1pt solid #FDA29B",
    padding: 8,
    color: "#B42318",
    fontFamily: "Helvetica-Bold",
  },
  grid: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  table: { borderTop: "1pt solid #DFE6E3" },
  row: { flexDirection: "row", borderBottom: "1pt solid #DFE6E3", paddingVertical: 5 },
  cellNumber: { width: 20 },
  cellName: { flex: 2 },
  cellRelation: { flex: 2 },
  cellPhone: { flex: 1.5 },
  signatures: { flexDirection: "row", gap: 24, marginTop: 28 },
  signature: {
    flex: 1,
    borderTop: "1pt solid #16201E",
    paddingTop: 4,
    fontSize: 9,
    color: "#57625F",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#57625F",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export interface ReferralSheetInput {
  sheet: EmergencySheet;
  today: string;
  generatedAt: string;
  generatedBy: string;
}

function ReferralSheet({ sheet, today, generatedAt, generatedBy }: ReferralSheetInput) {
  const { resident, site, allergies, contacts } = sheet;
  const age = ageOn(resident.birthDate, today);
  const identity = [
    resident.nationalId ? `DNI ${formatNationalId(resident.nationalId)}` : null,
    age !== null ? `${age} años` : null,
    resident.roomLabel ? `Hab. ${resident.roomLabel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const coverage = [
    COVERAGE_TYPES[resident.coverageType as keyof typeof COVERAGE_TYPES],
    resident.coverageName,
    resident.coverageMemberNumber ? `N.º ${resident.coverageMemberNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document title="Hoja de derivación" author={site.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Hoja de derivación</Text>
            <Text style={styles.name}>{fullName(resident)}</Text>
            <Text style={styles.muted}>{identity}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.bold}>{site.name}</Text>
            {site.address ? <Text style={styles.muted}>{site.address}</Text> : null}
            {site.phone ? <Text style={styles.muted}>Tel. {site.phone}</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Alergias</Text>
          {allergies.length > 0 ? (
            <Text style={styles.allergy}>
              {allergies
                .map(
                  (allergy) =>
                    `${allergy.substance.toLocaleUpperCase("es-AR")}${allergy.reaction ? ` (${allergy.reaction})` : ""}`,
                )
                .join(" · ")}
            </Text>
          ) : (
            <Text>Sin alergias registradas.</Text>
          )}
        </View>

        <View style={[styles.section, styles.grid]}>
          <View style={styles.col}>
            <Text style={styles.label}>Cobertura</Text>
            <Text>{coverage || "—"}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Médico de cabecera</Text>
            <Text>
              {[resident.primaryPhysicianName, resident.primaryPhysicianPhone]
                .filter(Boolean)
                .join(" · ") || "—"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Indicaciones especiales</Text>
          <Text>{resident.specialInstructions || "—"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Contactos de emergencia (en orden)</Text>
          <View style={styles.table}>
            {contacts.map((contact, index) => (
              <View key={contact.id} style={styles.row}>
                <Text style={styles.cellNumber}>{index + 1}</Text>
                <Text style={styles.cellName}>{contact.name}</Text>
                <Text style={styles.cellRelation}>
                  {[
                    contact.relationship,
                    contact.isAdmissionResponsible ? "responsable de la internación" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <Text style={styles.cellPhone}>
                  {contact.phoneMobile ?? contact.phonePrimary ?? contact.phoneWork ?? "—"}
                </Text>
              </View>
            ))}
            {contacts.length === 0 ? (
              <Text style={styles.row}>Sin contactos de emergencia cargados.</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.signatures}>
          <Text style={styles.signature}>Entregó (nombre y firma)</Text>
          <Text style={styles.signature}>Recibió (servicio de emergencia)</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            Generada {generatedAt} por {generatedBy} · registrada en la auditoría
          </Text>
          <Text>Documento confidencial · datos de salud</Text>
        </View>
      </Page>
    </Document>
  );
}

export function renderReferralSheet(input: ReferralSheetInput): Promise<Buffer> {
  return renderToBuffer(<ReferralSheet {...input} />);
}
