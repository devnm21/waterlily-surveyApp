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

export const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("journal_mode = WAL");

function ensureColumn(table: string, name: string, sqlType: string) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  if (!cols.some((col) => col.name === name)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${sqlType}`);
  }
}

function ensureTimestampColumns(table: string) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  const names = new Set(cols.map((col) => col.name));
  const now = Date.now();
  if (!names.has("created_at")) {
    sqlite.exec(
      `ALTER TABLE ${table} ADD COLUMN created_at integer NOT NULL DEFAULT ${now}`,
    );
  }
  if (!names.has("updated_at")) {
    sqlite.exec(
      `ALTER TABLE ${table} ADD COLUMN updated_at integer NOT NULL DEFAULT ${now}`,
    );
  }
}

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY NOT NULL,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  );

  CREATE TABLE IF NOT EXISTS surveys (
    id text PRIMARY KEY NOT NULL,
    title text NOT NULL,
    user_id text NOT NULL REFERENCES users(id),
    status text NOT NULL DEFAULT 'draft',
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  );

  CREATE TABLE IF NOT EXISTS survey_questions (
    id text PRIMARY KEY NOT NULL,
    survey_id text NOT NULL REFERENCES surveys(id),
    title text NOT NULL,
    description text,
    type text NOT NULL,
    sort_order integer NOT NULL,
    options text,
    created_at integer NOT NULL,
    updated_at integer NOT NULL,
    UNIQUE (survey_id, sort_order)
  );

  CREATE TABLE IF NOT EXISTS survey_submissions (
    id text PRIMARY KEY NOT NULL,
    email text NOT NULL,
    survey_id text NOT NULL REFERENCES surveys(id),
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  );

  CREATE TABLE IF NOT EXISTS survey_answers (
    id text PRIMARY KEY NOT NULL,
    survey_question_id text NOT NULL REFERENCES survey_questions(id),
    submission_id text NOT NULL REFERENCES survey_submissions(id),
    value text NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL,
    UNIQUE (survey_question_id, submission_id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id text PRIMARY KEY NOT NULL,
    data text NOT NULL,
    expires_at integer NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_expires_idx
    ON sessions (expires_at);

  CREATE INDEX IF NOT EXISTS survey_owner_idx
    ON surveys (user_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS survey_submissions_survey_created_idx
    ON survey_submissions (survey_id, created_at DESC);
`);

for (const table of [
  "users",
  "surveys",
  "survey_questions",
  "survey_submissions",
  "survey_answers",
]) {
  ensureTimestampColumns(table);
}

ensureColumn("survey_questions", "description", "text");

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;
