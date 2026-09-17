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
sqlite.pragma("foreign_keys = ON");
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
`);

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;
