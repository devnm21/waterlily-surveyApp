# Survey App Boilerplate Design

Date: 2026-09-17  
Status: approved in conversation; first resource updated to `User` from `SCHEMA.md`

## Goal

Scaffold a local survey-app starting point: a Next.js frontend and an Express API, wired together with a register/login form and a `users` table. This is infrastructure, not the survey product.

Success looks like: two `npm run dev` processes, open `http://localhost:3000`, register with email + password, see the public user (`id`, `email`) with no hash, then log in with the same credentials.

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Layout | `frontend/` + `backend/` at repo root (no npm workspaces) |
| Language | TypeScript on both apps |
| Frontend | Latest Next.js via `create-next-app`, App Router, Tailwind, ESLint, `src/`, import alias `@/*` |
| Forms | `react-hook-form` only (no Zod, no `@hookform/resolvers`) |
| API | Express on port 3001; Next does not own the API |
| Database now | SQLite file on disk (`better-sqlite3`) |
| Database later | Postgres-shaped schema so the driver/dialect can change without rewriting routes |
| ORM | Drizzle + a thin model class; a `models` object is the registry |
| First resource | `User` from `SCHEMA.md`: `id` (uuid), `email` (unique), `password_hash` |
| Password hashing | `node:crypto` `scrypt` + random salt + `timingSafeEqual`. Do **not** add `bcrypt` / `bcryptjs` |
| Tests | Backend smoke tests only (Vitest + Supertest) plus unit tests for hash/verify |

## Password hashing

`node:crypto` is enough. Do not install bcrypt.

- **Hash:** 16-byte random salt via `randomBytes`, `scrypt(password, salt, 64)`, store as `scrypt$<saltHex>$<keyHex>`.
- **Compare:** split the stored string, `scrypt` the candidate with the same salt, `timingSafeEqual` on the buffers (after a length check).
- Never use `createHash('sha256')` for passwords (too fast, no salt story).
- Never return `passwordHash` / `password_hash` in JSON.

Sessions, cookies, and JWT are still out of scope. Login exists only to prove `verifyPassword`.

## Architecture

```
waterlily-surveyApp/
  frontend/     # create-next-app@latest
  backend/      # Express + Drizzle + SQLite
  README.md     # how to run both
  SCHEMA.md     # domain notes (User first)
  docs/superpowers/specs/
```

- The browser talks only to Express (`NEXT_PUBLIC_API_URL`, default `http://localhost:3001`).
- Next never imports SQLite or Drizzle.
- CORS: frontend origin `http://localhost:3000`, API `http://localhost:3001`. No Next rewrites in this scaffold.

## Frontend

### Scaffold

From `waterlily-surveyApp/`, non-interactive:

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Do not add Next Route Handlers as the product API. Drop any flag that `create-next-app@latest --help` no longer accepts and keep the same intent.

Then: `npm install react-hook-form` in `frontend/`.

### Files that matter

- `src/app/page.tsx` — Server Component: heading plus a client island.
- `src/components/AuthForm.tsx` — `"use client"`. `useForm<{ email: string; password: string }>()`. Email required; password required, minLength 8. Register → `POST ${API}/users`. Login → `POST ${API}/auth/login`. Show field errors and a submit-level error from API JSON. On success, show `{ id, email }` (never a hash).
- `src/lib/api.ts` — `export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"`.

Do not `fetch` Express from a Server Component during `next build`.

### UI

Email input, password input, Register button, Login button, inline field errors, success panel with id + email. Tailwind for spacing and borders only.

## Backend

### Layout

```
backend/
  src/
    index.ts                 # app.listen
    app.ts                   # express() + middleware + routes (exported for tests)
    middleware/error.ts      # HttpError + 4-arg JSON error handler
    lib/password.ts          # hashPassword / verifyPassword
    routes/health.ts         # GET /health
    routes/users.ts          # POST /users
    routes/auth.ts           # POST /auth/login
    db/index.ts              # better-sqlite3 + drizzle + CREATE TABLE IF NOT EXISTS
    db/schema.ts             # users table
    models/user.ts           # UserModel
    models/index.ts          # models registry
  drizzle.config.ts
  package.json
  tsconfig.json
  vitest.config.ts
  .env.example
  data/                      # gitignored
```

Dev: `tsx watch src/index.ts`.

### Middleware (order)

1. `cors({ origin: "http://localhost:3000" })`
2. `express.json()`
3. `express.urlencoded({ extended: false })`
4. Routes
5. JSON 404 for unknown paths
6. Error middleware last

Skip Helmet, rate limiting, and morgan. Optional: one-line `console.log` of `METHOD path`.

### Routes

| Method | Path | Success | Failure |
| --- | --- | --- | --- |
| GET | `/health` | 200 `{ ok: true }` | — |
| POST | `/users` | 201 `{ user: { id, email } }` | 400 missing/blank email or password &lt; 8 chars; 409 duplicate email |
| POST | `/auth/login` | 200 `{ user: { id, email } }` | 400 missing fields; 401 invalid email or password |

Handlers call `models.users` only. They do not import Drizzle tables.

Env: `PORT=3001`, `DATABASE_URL=file:./data/app.db`.

## Data layer

### Schema (`users`) — matches `SCHEMA.md`

Portable columns:

- `id` — text primary key, default `crypto.randomUUID()` (uuid). Postgres later: `uuid` type, same app field `id`.
- `email` — text, not null, unique.
- `password_hash` — text, not null. Drizzle property name: `passwordHash` mapped to column `password_hash`.

### Client

- Parse `DATABASE_URL` (`file:` prefix optional) into a filesystem path; create the directory on boot if missing.
- `better-sqlite3` `Database` + `drizzle(sqlite, { schema })`.
- On first open, `CREATE TABLE IF NOT EXISTS users (...)` so tests and first boot do not require a prior `db:push`.

### Migrations

`drizzle-kit push` via `npm run db:push` for humans.  
`dialect: "sqlite"`, `schema: "./src/db/schema.ts"`, `out: "./drizzle"`.

### Public vs stored shapes

```ts
type PublicUser = {
  id: string;
  email: string;
};

type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
};
```

JSON uses `id` and `email` only.

### Model registry

Methods are **async** even though `better-sqlite3` is sync.

```ts
class UserModel {
  constructor(private db: Db) {}
  create(input: { email: string; password: string }): Promise<PublicUser>
  findByEmail(email: string): Promise<UserRow | undefined>
}

export const models = {
  users: new UserModel(db),
};
```

- `create` trims email, lowercases it, rejects blank email or password shorter than 8 with `HttpError(400)`, hashes via `hashPassword`, inserts, maps unique-constraint failures to `HttpError(409)`.
- `findByEmail` is for login only; routes must not send `UserRow` to the client.
- New tables later: new class + one line on `models`.

### Postgres later (not in this scaffold)

- New drizzle config with `postgresql`.
- `pgTable` with the same column names and application types (`id` uuid, `email` text unique, `password_hash` text).
- Swap `better-sqlite3` for `postgres` / `node-postgres`.
- Keep `UserModel` method names and `PublicUser` / `UserRow` shapes.

## Errors

- `HttpError` with `status` and `message`.
- Response body always JSON: `{ "error": string, "status": number }`.
- Unknown routes: JSON 404.
- Uncaught errors: 500 `{ error: "Internal server error", status: 500 }`. Do not send the stack.
- Login always uses the message `"Invalid email or password"` for unknown email and bad password (no user enumeration).

## Scripts and developer UX

- `frontend`: `npm run dev` → Next on 3000.
- `backend`: `npm run dev` → `tsx watch` on 3001.
- `backend`: `npm run db:push` → `drizzle-kit push`.
- `backend`: `npm test` → Vitest.
- Root README: two terminals, env vars, register then login.
- `backend/data/` gitignored.
- `.env` gitignored; `.env.example` committed in both apps.

## Tests

Backend only. Vitest + Supertest against the exported `app` (do not call `listen`).

Tests set `DATABASE_URL` to a temp file **before** importing `app.ts` / `db/index.ts` (Vitest `setupFiles`). The db module creates the directory and `users` table on first open.

Required cases:

1. `GET /health` → 200 `{ ok: true }`
2. `hashPassword` / `verifyPassword`: matching password true; wrong password false; output is not the plaintext
3. `POST /users` `{ email, password }` (password length ≥ 8) → 201 `{ user: { id, email } }` and body has no `passwordHash` / `password_hash`
4. `POST /users` `{}` → 400
5. Second `POST /users` with the same email → 409
6. `POST /auth/login` with the registered credentials → 200 `{ user: { id, email } }`
7. `POST /auth/login` with a wrong password → 401 `{ error, status }`

No Playwright / frontend e2e in this scaffold.

## Out of scope

- Survey domain tables (`surveys`, `questions`, `responses`)
- Sessions, cookies, JWT, password-reset
- `bcrypt` / `bcryptjs` / `argon2` packages
- Zod and form resolvers
- Helmet, rate limits, production logging
- Docker
- npm workspaces / shared package
- Prisma, Kysely
- Next Route Handlers as the API
- Python or the parent-folder `assignment.js` / `main.py`
- Toy `Item` table (replaced by `User`)

## Implementation notes

1. Spec (this file).
2. Implementation plan via writing-plans.
3. Scaffold backend (Express, middleware, scrypt helpers, Drizzle `users`, tests).
4. Scaffold `frontend` with `create-next-app@latest`, React Hook Form register/login.
5. Update root README.
6. Verify: API tests pass; browser register + login shows `{ id, email }`.
