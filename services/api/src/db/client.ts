import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for the Octo API database client.");
}

const queryClient = postgres(connectionString, {
  max: Number(process.env.DB_POOL_SIZE ?? 10),
  prepare: false,
});

export const db = drizzle(queryClient, { schema });
