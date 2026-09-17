# Survey App Boilerplate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold `frontend/` (Next.js + React Hook Form) and `backend/` (Express + Drizzle + SQLite) so a user can register and log in; passwords hashed with `node:crypto` scrypt, never bcrypt.

**Architecture:** Two folders at repo root. The browser calls Express on `:3001`. Drizzle + `better-sqlite3` own a `users` table. Routes talk only to `models.users`. Password hash/verify live in `lib/password.ts` using `scrypt`, a random salt, and `timingSafeEqual`.

**Tech Stack:** Next.js (create-next-app@latest), Tailwind, react-hook-form, Express, Drizzle, better-sqlite3, Vitest, Supertest, TypeScript, tsx. Node built-in `crypto` only for passwords.

**Spec:** `docs/superpowers/specs/2026-09-17-survey-app-boilerplate-design.md`

## Global Constraints

- TypeScript on both apps; no npm workspaces
- Express JSON body: `{ "error": string, "status": number }` on failures
- Public user JSON is `{ id: string, email: string }` — never `passwordHash` / `password_hash`
- Email stored trimmed and lowercased
- Password min length 8
- Login failure message is always `Invalid email or password`
- `DATABASE_URL` default `file:./data/app.db`; tests override before importing db
- Do not install `bcrypt`, `bcryptjs`, or `argon2`
- Do not add Next Route Handlers as the product API
- Do not add survey tables, JWT, sessions, Zod, Helmet, Docker

## File structure

| Path | Responsibility |
| --- | --- |
| `backend/package.json` | Scripts: `dev`, `test`, `db:push` |
| `backend/tsconfig.json` | Node ESM/NodeNext TS |
| `backend/vitest.config.ts` | Node env + `setupFiles` for temp SQLite |
| `backend/drizzle.config.ts` | sqlite dialect, schema path |
| `backend/.env.example` | `PORT`, `DATABASE_URL` |
| `backend/.gitignore` | `data/`, `.env`, `node_modules` |
| `backend/src/index.ts` | `listen` |
| `backend/src/app.ts` | Middleware + route mount |
| `backend/src/middleware/error.ts` | `HttpError` + JSON error/404 handlers |
| `backend/src/lib/password.ts` | `hashPassword`, `verifyPassword` |
| `backend/src/db/schema.ts` | `users` table |
| `backend/src/db/index.ts` | SQLite + drizzle + `CREATE TABLE IF NOT EXISTS` |
| `backend/src/models/user.ts` | `UserModel` |
| `backend/src/models/index.ts` | `models` registry |
| `backend/src/routes/health.ts` | `GET /health` |
| `backend/src/routes/users.ts` | `POST /users` |
| `backend/src/routes/auth.ts` | `POST /auth/login` |
| `backend/src/test/setup-env.ts` | Temp `DATABASE_URL` before imports |
| `backend/src/lib/password.test.ts` | Hash/verify unit tests |
| `backend/src/app.test.ts` | HTTP smoke tests |
| `frontend/` | create-next-app output + AuthForm |
| `frontend/src/lib/api.ts` | `API_URL` |
| `frontend/src/components/AuthForm.tsx` | Register/login client form |
| `frontend/.env.example` | `NEXT_PUBLIC_API_URL` |
| `README.md` | How to run both |

---

### Task 1: Backend package + health endpoint

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/.gitignore`
- Create: `backend/.env.example`
- Create: `backend/src/test/setup-env.ts`
- Create: `backend/src/middleware/error.ts`
- Create: `backend/src/routes/health.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/index.ts`
- Create: `backend/src/app.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `app` Express application; `GET /health` → `{ ok: true }`; `HttpError`; `notFoundHandler`; `errorHandler`

- [ ] **Step 1: Scaffold backend package**

```bash
mkdir -p backend/src/routes backend/src/middleware backend/src/test
cd backend
npm init -y
npm install express cors
npm install -D typescript tsx vitest supertest @types/express @types/cors @types/supertest @types/node
```

Write `backend/package.json` scripts (keep the installed dependency versions npm chose):

```json
{
  "name": "survey-api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "db:push": "drizzle-kit push"
  }
}
```

`backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}
```

`backend/.gitignore`:

```
node_modules
dist
data
.env
```

`backend/.env.example`:

```
PORT=3001
DATABASE_URL=file:./data/app.db
```

`backend/src/test/setup-env.ts`:

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wl-api-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
```

`backend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup-env.ts"],
    fileParallelism: false,
  },
});
```

- [ ] **Step 2: Write the failing health test**

`backend/src/app.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./app.js";

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npm test`

Expected: FAIL because `./app.js` does not exist (or `app` is not exported).

- [ ] **Step 4: Minimal implementation**

`backend/src/middleware/error.ts`:

```ts
import type { ErrorRequestHandler, RequestHandler } from "express";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found", status: 404 });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, status: err.status });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error", status: 500 });
};
```

`backend/src/routes/health.ts`:

```ts
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});
```

`backend/src/app.ts`:

```ts
import cors from "cors";
import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { healthRouter } from "./routes/health.js";

export const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
app.use(healthRouter);
app.use(notFoundHandler);
app.use(errorHandler);
```

`backend/src/index.ts`:

```ts
import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  console.log(`api listening on ${port}`);
});
```

- [ ] **Step 5: Run tests and make sure they pass**

Run: `cd backend && npm test`

Expected: PASS (`GET /health`).

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "$(cat <<'EOF'
Add Express health endpoint with JSON errors.

Give the API a testable app export and a temp-SQLite test harness.
EOF
)"
```

---

### Task 2: Password hash and verify (`node:crypto` scrypt)

**Files:**
- Create: `backend/src/lib/password.ts`
- Create: `backend/src/lib/password.test.ts`

**Interfaces:**
- Consumes: Node `crypto` / `util` only
- Produces:
  - `hashPassword(password: string): Promise<string>` → `scrypt$<saltHex>$<keyHex>`
  - `verifyPassword(password: string, stored: string): Promise<boolean>`

- [ ] **Step 1: Write failing tests**

`backend/src/lib/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("hashes to a scrypt string that is not the plaintext", async () => {
    const stored = await hashPassword("secret-ok");
    expect(stored).toMatch(/^scrypt\$[0-9a-f]+\$[0-9a-f]+$/);
    expect(stored).not.toContain("secret-ok");
  });

  it("verifies the matching password", async () => {
    const stored = await hashPassword("secret-ok");
    await expect(verifyPassword("secret-ok", stored)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("secret-ok");
    await expect(verifyPassword("nope-nope", stored)).resolves.toBe(false);
  });

  it("rejects a malformed stored value", async () => {
    await expect(verifyPassword("secret-ok", "not-a-hash")).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/lib/password.test.ts`

Expected: FAIL — `password.js` cannot be resolved.

- [ ] **Step 3: Implement**

`backend/src/lib/password.ts`:

```ts
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `cd backend && npx vitest run src/lib/password.test.ts`

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/password.ts backend/src/lib/password.test.ts
git commit -m "$(cat <<'EOF'
Hash passwords with scrypt from node:crypto.

Avoid a bcrypt native addon; salt and timing-safe compare live in one helper.
EOF
)"
```

---

### Task 3: Drizzle users table and UserModel

**Files:**
- Create: `backend/src/db/schema.ts`
- Create: `backend/src/db/index.ts`
- Create: `backend/src/models/user.ts`
- Create: `backend/src/models/index.ts`
- Create: `backend/drizzle.config.ts`
- Modify: `backend/package.json` (add drizzle deps)
- Create: `backend/src/models/user.test.ts`

**Interfaces:**
- Consumes: `hashPassword`; `HttpError`; `DATABASE_URL`
- Produces:
  - `PublicUser = { id: string; email: string }`
  - `UserRow = { id: string; email: string; passwordHash: string }`
  - `UserModel.create(input: { email: string; password: string }): Promise<PublicUser>`
  - `UserModel.findByEmail(email: string): Promise<UserRow | undefined>`
  - `models.users: UserModel`

- [ ] **Step 1: Install Drizzle**

```bash
cd backend
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

`backend/drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/app.db",
  },
});
```

- [ ] **Step 2: Write failing UserModel tests**

`backend/src/models/user.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { HttpError } from "../middleware/error.js";
import { models } from "./index.js";

describe("UserModel", () => {
  it("creates a public user and can look up the row by email", async () => {
    const created = await models.users.create({
      email: "  Ada@Example.com ",
      password: "password1",
    });
    expect(created.email).toBe("ada@example.com");
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(created).not.toHaveProperty("passwordHash");

    const row = await models.users.findByEmail("ada@example.com");
    expect(row?.email).toBe("ada@example.com");
    expect(row?.passwordHash).toMatch(/^scrypt\$/);
    expect(row?.passwordHash).not.toContain("password1");
  });

  it("rejects a short password", async () => {
    await expect(
      models.users.create({ email: "a@b.co", password: "short" }),
    ).rejects.toMatchObject({ status: 400 } satisfies Partial<HttpError>);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npx vitest run src/models/user.test.ts`

Expected: FAIL — `./index.js` or db module missing.

- [ ] **Step 4: Implement schema, db, model**

`backend/src/db/schema.ts`:

```ts
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});
```

`backend/src/db/index.ts`:

```ts
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
```

`backend/src/models/user.ts`:

```ts
import { eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { users } from "../db/schema.js";
import { hashPassword } from "../lib/password.js";
import { HttpError } from "../middleware/error.js";

export type PublicUser = {
  id: string;
  email: string;
};

export type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
};

function toPublic(row: UserRow): PublicUser {
  return { id: row.id, email: row.email };
}

export class UserModel {
  constructor(private db: Db) {}

  async create(input: { email: string; password: string }): Promise<PublicUser> {
    const email = input.email.trim().toLowerCase();
    const password = input.password ?? "";
    if (!email) {
      throw new HttpError(400, "Email is required");
    }
    if (password.length < 8) {
      throw new HttpError(400, "Password must be at least 8 characters");
    }

    const row: UserRow = {
      id: crypto.randomUUID(),
      email,
      passwordHash: await hashPassword(password),
    };

    try {
      await this.db.insert(users).values(row);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("UNIQUE") || message.includes("unique")) {
        throw new HttpError(409, "Email already registered");
      }
      throw err;
    }

    return toPublic(row);
  }

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const normalized = email.trim().toLowerCase();
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);
    return rows[0];
  }
}
```

`backend/src/models/index.ts`:

```ts
import { db } from "../db/index.js";
import { UserModel } from "./user.js";

export const models = {
  users: new UserModel(db),
};
```

- [ ] **Step 5: Run tests and make sure they pass**

Run: `cd backend && npx vitest run src/models/user.test.ts src/lib/password.test.ts src/app.test.ts`

Expected: PASS. If unique-constraint detection fails on duplicate later, tighten the `catch` using `(err as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE"`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/db backend/src/models backend/drizzle.config.ts backend/package.json backend/package-lock.json
git commit -m "$(cat <<'EOF'
Add Drizzle users table and UserModel.

Store uuid, unique email, and a scrypt hash; return public users without the hash.
EOF
)"
```

---

### Task 4: POST /users and POST /auth/login

**Files:**
- Create: `backend/src/routes/users.ts`
- Create: `backend/src/routes/auth.ts`
- Modify: `backend/src/app.ts` (mount routers)
- Modify: `backend/src/app.test.ts` (HTTP cases from spec)

**Interfaces:**
- Consumes: `models.users.create`, `models.users.findByEmail`, `verifyPassword`, `HttpError`
- Produces:
  - `POST /users` 201 `{ user: PublicUser }`
  - `POST /auth/login` 200 `{ user: PublicUser }`

- [ ] **Step 1: Add failing HTTP tests to `backend/src/app.test.ts`**

Append (keep the existing health test):

```ts
describe("users and auth", () => {
  const email = "user@example.com";
  const password = "password1";

  it("registers a user without leaking the hash", async () => {
    const res = await request(app)
      .post("/users")
      .send({ email, password });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.id).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it("rejects empty register bodies", async () => {
    const res = await request(app).post("/users").send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ status: 400, error: expect.any(String) });
  });

  it("rejects a duplicate email", async () => {
    await request(app).post("/users").send({
      email: "dup@example.com",
      password,
    });
    const res = await request(app).post("/users").send({
      email: "dup@example.com",
      password,
    });
    expect(res.status).toBe(409);
  });

  it("logs in with the same credentials", async () => {
    await request(app).post("/users").send({
      email: "login@example.com",
      password,
    });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("login@example.com");
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it("rejects a wrong password without enumerating users", async () => {
    await request(app).post("/users").send({
      email: "wrong-pw@example.com",
      password,
    });
    const badPassword = await request(app)
      .post("/auth/login")
      .send({ email: "wrong-pw@example.com", password: "password2" });
    expect(badPassword.status).toBe(401);
    expect(badPassword.body).toEqual({
      error: "Invalid email or password",
      status: 401,
    });

    const unknownUser = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password });
    expect(unknownUser.body).toEqual(badPassword.body);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/app.test.ts`

Expected: FAIL — `POST /users` 404.

- [ ] **Step 3: Implement routes and wrap async handlers**

Express 4 does not catch async rejections unless you wrap them. Add this helper at the top of each router file (or a tiny `src/lib/async-handler.ts` if you prefer one file):

```ts
import type { RequestHandler } from "express";

export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

If you add `backend/src/lib/async-handler.ts`, import it from both routers.

`backend/src/routes/users.ts`:

```ts
import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { models } from "../models/index.js";

export const usersRouter = Router();

usersRouter.post(
  "/users",
  asyncHandler(async (req, res) => {
    const user = await models.users.create({
      email: String(req.body?.email ?? ""),
      password: String(req.body?.password ?? ""),
    });
    res.status(201).json({ user });
  }),
);
```

`backend/src/routes/auth.ts`:

```ts
import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { verifyPassword } from "../lib/password.js";
import { HttpError } from "../middleware/error.js";
import { models } from "../models/index.js";

export const authRouter = Router();

authRouter.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? "");
    const password = String(req.body?.password ?? "");
    if (!email.trim() || password.length < 8) {
      throw new HttpError(400, "Email and password are required");
    }
    const row = await models.users.findByEmail(email);
    const ok = row ? await verifyPassword(password, row.passwordHash) : false;
    if (!row || !ok) {
      throw new HttpError(401, "Invalid email or password");
    }
    res.json({ user: { id: row.id, email: row.email } });
  }),
);
```

Mount in `backend/src/app.ts` **before** `notFoundHandler`:

```ts
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";

app.use(usersRouter);
app.use(authRouter);
```

Keep `healthRouter` mounted as well.

- [ ] **Step 4: Run tests and make sure they pass**

Run: `cd backend && npm test`

Expected: PASS (health, password unit tests, UserModel tests, HTTP tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes backend/src/app.ts backend/src/app.test.ts backend/src/lib/async-handler.ts
git commit -m "$(cat <<'EOF'
Add user register and login routes.

Hash on create, timing-safe compare on login, and never serialize password hashes.
EOF
)"
```

---

### Task 5: Next.js frontend with React Hook Form

**Files:**
- Create: `frontend/` via create-next-app
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/components/AuthForm.tsx`
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/.env.example`

**Interfaces:**
- Consumes: `POST /users`, `POST /auth/login`, `PublicUser`
- Produces: client form that registers and logs in against `API_URL`

- [ ] **Step 1: Scaffold Next.js**

From `waterlily-surveyApp/`:

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

If `--yes` is rejected, drop it and pass the same intent with whatever flags `npx create-next-app@latest --help` lists.

```bash
cd frontend
npm install react-hook-form
```

`frontend/.env.example`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 2: Add API helper and AuthForm**

`frontend/src/lib/api.ts`:

```ts
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type PublicUser = {
  id: string;
  email: string;
};

type ErrorBody = {
  error?: string;
  status?: number;
};

async function jsonFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json()) as T & ErrorBody;
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body;
}

export function registerUser(email: string, password: string) {
  return jsonFetch<{ user: PublicUser }>("/users", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function loginUser(email: string, password: string) {
  return jsonFetch<{ user: PublicUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
```

`frontend/src/components/AuthForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { loginUser, registerUser, type PublicUser } from "@/lib/api";

type FormValues = {
  email: string;
  password: string;
};

export function AuthForm() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  async function onRegister(values: FormValues) {
    setSubmitError(null);
    try {
      const data = await registerUser(values.email, values.password);
      setUser(data.user);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Register failed");
    }
  }

  async function onLogin(values: FormValues) {
    setSubmitError(null);
    try {
      const data = await loginUser(values.email, values.password);
      setUser(data.user);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <form className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            className="rounded border border-zinc-300 px-3 py-2"
            type="email"
            autoComplete="email"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && (
            <span className="text-red-600">{errors.email.message}</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            className="rounded border border-zinc-300 px-3 py-2"
            type="password"
            autoComplete="current-password"
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 8,
                message: "Password must be at least 8 characters",
              },
            })}
          />
          {errors.password && (
            <span className="text-red-600">{errors.password.message}</span>
          )}
        </label>
        <div className="flex gap-2">
          <button
            className="rounded bg-zinc-900 px-3 py-2 text-white"
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit(onRegister)}
          >
            Register
          </button>
          <button
            className="rounded border border-zinc-300 px-3 py-2"
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit(onLogin)}
          >
            Login
          </button>
        </div>
      </form>
      {submitError && <p className="text-sm text-red-600">{submitError}</p>}
      {user && (
        <p className="text-sm">
          Signed in as {user.email} ({user.id})
        </p>
      )}
    </div>
  );
}
```

Replace `frontend/src/app/page.tsx` with:

```tsx
import { AuthForm } from "@/components/AuthForm";

export default function Home() {
  return (
    <main>
      <h1 className="p-6 text-2xl font-semibold">Waterlily survey</h1>
      <AuthForm />
    </main>
  );
}
```

- [ ] **Step 3: Typecheck / lint the frontend**

Run: `cd frontend && npx tsc --noEmit`

Expected: PASS (no type errors). If `@/` alias fails, confirm `tsconfig` `paths` from create-next-app.

- [ ] **Step 4: Commit**

```bash
git add frontend
git commit -m "$(cat <<'EOF'
Add Next.js auth form with React Hook Form.

Register and login against the Express API without putting SQLite in the Next bundle.
EOF
)"
```

---

### Task 6: Root README and manual check

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: running `frontend` and `backend` scripts
- Produces: documented two-terminal workflow

- [ ] **Step 1: Replace root README**

`README.md`:

```markdown
# Waterlily survey app

Boilerplate: Next.js + Express + SQLite.

## Run

Terminal 1:

```bash
cd backend
cp .env.example .env
npm install
npm run db:push
npm run dev
```

API: http://localhost:3001 (`GET /health`).

Terminal 2:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App: http://localhost:3000. Register with an email and a password of at least 8 characters, then Login. The page shows `id` and `email` only.

## Tests

```bash
cd backend
npm test
```

Passwords are hashed with Node `crypto.scrypt` (not bcrypt).
```

- [ ] **Step 2: Run backend tests once more**

Run: `cd backend && npm test`

Expected: PASS.

- [ ] **Step 3: Manual / browser check**

Start both `npm run dev` processes. Open `http://localhost:3000`. Register `ada@example.com` / `password1`. Confirm the UI shows email + uuid and not a hash. Login with the same values. Confirm `GET http://localhost:3001/health` is `{ "ok": true }`.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/superpowers/specs/2026-09-17-survey-app-boilerplate-design.md
git commit -m "$(cat <<'EOF'
Document how to run the survey boilerplate.

Point at register/login and scrypt so bcrypt is not added by habit.
EOF
)"
```

(Include the updated spec in this commit if it is still unstaged.)

---

## Self-review

**Spec coverage:** Health, CORS, JSON middleware, scrypt helpers, `users` table (uuid, unique email, password_hash), UserModel async API, POST /users, POST /auth/login, no hash in JSON, RHF form, Vitest cases 1–7, README — each has a task. Item table intentionally removed. bcrypt not installed.

**Placeholders:** None. Commands and file contents are inlined.

**Types:** `PublicUser`, `UserRow`, `hashPassword`, `verifyPassword`, `models.users.create`, `models.users.findByEmail`, `HttpError` stay consistent across tasks.
