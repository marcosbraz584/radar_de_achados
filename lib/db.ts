import { neon } from "@neondatabase/serverless";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não está configurada.");
  }

  return databaseUrl;
}

export function getDb() {
  return neon(getDatabaseUrl());
}
