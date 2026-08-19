import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

type DatabaseGlobal = typeof globalThis & {
  buhoSql?: Sql;
  buhoDb?: PostgresJsDatabase<typeof schema>;
};

const databaseGlobal = globalThis as DatabaseGlobal;

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

  if (!databaseGlobal.buhoSql) {
    databaseGlobal.buhoSql = postgres(databaseUrl, {
      max: process.env.NODE_ENV === "production" ? 10 : 3,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }
  return databaseGlobal.buhoSql;
}

export function getDb() {
  if (!databaseGlobal.buhoDb) databaseGlobal.buhoDb = drizzle(getSql(), { schema });
  return databaseGlobal.buhoDb;
}
