import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

import { runMigrations } from "../../db/migrator";

let container: StartedPostgreSqlContainer | undefined;

/** Levanta un PostgreSQL 18, crea los roles con el mismo script de desarrollo y migra. */
export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer("postgres:18.6-bookworm")
    .withDatabase("residencia360")
    .withUsername("postgres")
    .withPassword("postgres_test")
    .withEnvironment({
      R360_OWNER_PASSWORD: "owner_test",
      R360_APP_PASSWORD: "app_test",
      R360_WORKER_PASSWORD: "worker_test",
    })
    .withCopyFilesToContainer([
      { source: "db/init/01-roles.sh", target: "/docker-entrypoint-initdb.d/01-roles.sh" },
    ])
    .withCommand(["postgres", "-c", "shared_preload_libraries=pg_stat_statements"])
    .start();

  const address = `${container.getHost()}:${container.getPort()}/residencia360`;
  const ownerUrl = `postgres://r360_owner:owner_test@${address}`;
  const appUrl = `postgres://r360_app:app_test@${address}`;
  const workerUrl = `postgres://r360_worker:worker_test@${address}`;

  await runMigrations(ownerUrl);
  project.provide("databaseUrls", { ownerUrl, appUrl, workerUrl });
}

export async function teardown() {
  await container?.stop();
}
