import { sql } from "drizzle-orm";

import * as schema from "@/db/schema";

/**
 * Nombre del rol para mostrar: a Profesional se le suma la profesión que
 * cargó Administración ("Profesional · Kinesiólogo", docs/decisions/0021).
 * Se usa en las consultas que unen membresías con roles.
 */
export const roleLabel = sql<string>`case
  when ${schema.roles.key} = 'profesional'
    and nullif(trim(${schema.organizationMemberships.profession}), '') is not null
  then ${schema.roles.name} || ' · ' || trim(${schema.organizationMemberships.profession})
  else ${schema.roles.name}
end`;
