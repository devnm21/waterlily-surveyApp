import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

function sqlitePathFromUrl(url: string): string {
  return url.startsWith("file:") ? url.slice("file:".length) : url;
}

const dbUrl = process.env.DATABASE_URL ?? "file:./data/app.db";
const dbPath = sqlitePathFromUrl(dbUrl);
fs.mkdirSync(path.dirname(dbPath) || ".", { recursive: true });

const sqlite = new Database(dbPath);
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY NOT NULL,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;
