# Survey App Boilerplate Design

Date: 2026-09-17  
Status: approved in conversation; pending implementation plan

## Goal

Scaffold a local survey-app starting point: a Next.js frontend and an Express API, wired together with one example form and one example database table. This is infrastructure, not the survey product.

Success looks like: two `npm run dev` processes, open `http://localhost:3000`, submit a title, see it persist in SQLite and reappear in the list.

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
| First resource | `Item` (`id`, `title`, `createdAt`) |
| Tests | Backend smoke tests only (Vitest + Supertest) |

## Architecture

```
waterlily-surveyApp/
  frontend/     # create-next-app@latest
  backend/      # Express + Drizzle + SQLite
  README.md     # how to run both
  docs/superpowers/specs/
```

- The browser talks only to Express (`NEXT_PUBLIC_API_URL`, default `http://localhost:3001`).
- Next never imports SQLite or Drizzle. That keeps `create-next-app` vanilla (no native `better-sqlite3` in the Next bundle) and keeps a future Postgres cut backend-only.
- CORS is required: frontend origin `http://localhost:3000`, API `http://localhost:3001`. No Next rewrites in this scaffold.

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
- `src/components/ItemForm.tsx` — `"use client"`. `useForm<{ title: string }>()`, `register("title", { required: "Title is required" })`, `handleSubmit` → `POST ${API}/items` with `Content-Type: application/json` and `JSON.stringify`. Show `errors.title`. On success, refresh the in-memory list (or re-fetch `GET /items`).
- `src/lib/api.ts` — `export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"`.

One client island loads items on mount (`GET /items`) and appends/refreshes after submit. Do not `fetch` Express from a Server Component during `next build`; the API will not be up.

### UI

Title input, submit button, list of saved titles, inline field error. Tailwind for spacing and borders only. No design system.

## Backend

### Layout

```
backend/
  src/
    index.ts              # app.listen
    app.ts                # express() + middleware + routes (exported for tests)
    middleware/error.ts   # HttpError + 4-arg JSON error handler
    routes/items.ts       # GET/POST /items
    routes/health.ts      # GET /health
    db/index.ts           # better-sqlite3 + drizzle
    db/schema.ts          # items table
    models/item.ts        # ItemModel
    models/index.ts       # models registry
  drizzle.config.ts
  package.json
  tsconfig.json
  .env.example
  data/                   # gitignored; app.db lands here
```

Dev: `tsx watch src/index.ts`. No compile step for local run.

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
| GET | `/items` | 200 `{ items: Item[] }` | — |
| POST | `/items` | 201 `{ item }` | 400 if `title` missing or blank |

No `PUT` or `DELETE` in this scaffold.

Handlers call `models.items` only. They do not import Drizzle tables.

Env: `PORT=3001`, `DATABASE_URL=file:./data/app.db`.

## Data layer

### Schema (`items`)

Portable columns only:

- `id` — integer primary key, autoincrement (SQLite). App field name stays `id` if Postgres later uses `serial` / identity.
- `title` — text, not null.
- `createdAt` — integer Unix milliseconds (avoid SQLite datetime affinity surprises).

### Client

- Parse `DATABASE_URL` into a filesystem path; create `data/` on boot if missing.
- `better-sqlite3` `Database` + `drizzle(sqlite, { schema })`.

### Migrations

For this scaffold: `drizzle-kit push` via `npm run db:push`.  
`dialect: "sqlite"`, `schema: "./src/db/schema.ts"`, `out: "./drizzle"`.

Generate/migrate files come later, when the schema is no longer a single toy table.

### Item shape

```ts
type Item = {
  id: number;
  title: string;
  createdAt: number; // Unix ms
};
```

JSON field names match this type (`createdAt`, not `created_at`).

### Model registry

`ItemModel` methods are **async** even though `better-sqlite3` is sync, so handlers stay `await`-based when the driver becomes Postgres.

```ts
class ItemModel {
  constructor(private db: Db) {}
  getAll(): Promise<Item[]>
  getById(id: number): Promise<Item | undefined>
  create(input: { title: string }): Promise<Item>
}

export const models = {
  items: new ItemModel(db),
};
```

- Explicit methods, not Active Record `save()` or property getters/setters on row instances.
- `create` rejects blank/missing title with `HttpError(400)`.
- New tables later: new class + one line on `models`.

### Postgres later (not in this scaffold)

- New drizzle config with `postgresql`.
- `pgTable` with the same column names and application types.
- Swap `better-sqlite3` for `postgres` / `node-postgres`.
- Keep `ItemModel` method names and return shapes.

Do not use SQLite-only column types on this first table.

## Errors

- `HttpError` with `status` and `message`.
- Response body always JSON: `{ "error": string, "status": number }`.
- Unknown routes: JSON 404, not Express HTML `Cannot GET`.
- Uncaught errors: 500 `{ error: "Internal server error", status: 500 }`. Do not send the stack.

## Scripts and developer UX

- `frontend`: `npm run dev` → Next on 3000.
- `backend`: `npm run dev` → `tsx watch` on 3001.
- `backend`: `npm run db:push` → `drizzle-kit push`.
- Root README: two terminals, env vars (`PORT`, `DATABASE_URL`, `NEXT_PUBLIC_API_URL`), “open `/` and submit a title”.
- `backend/data/` gitignored.
- `.env` gitignored; `.env.example` committed in both apps.

## Tests

Backend only, Vitest + Supertest against the exported `app` (do not call `listen` in tests).

Use a temp SQLite file so `data/app.db` is untouched. Tests set `DATABASE_URL` to that file **before** importing `app.ts` / `db/index.ts`. On first open, the db module creates the directory and applies the `items` table (same as a local `db:push`, or an explicit `CREATE TABLE` equivalent) so tests do not depend on a developer having run migrations.

Required cases:

1. `GET /health` → 200 `{ ok: true }`
2. `POST /items` `{ title: "hello" }` → 201; `GET /items` includes that title
3. `POST /items` `{}` → 400 JSON error shape

No Playwright / frontend e2e in this scaffold.

## Out of scope

- Survey domain tables (`surveys`, `questions`, `responses`)
- Auth
- Zod and form resolvers
- Helmet, rate limits, production logging
- Docker
- npm workspaces / shared package
- Prisma, Kysely, hand-rolled SQL registry
- Next Route Handlers as the API
- `PUT` / `DELETE` on items
- Python or the parent-folder `assignment.js` / `main.py`

## Implementation notes

1. Write this spec (done when committed).
2. Implementation plan via writing-plans.
3. Scaffold `frontend` with `create-next-app@latest`, then add React Hook Form and the example page.
4. Scaffold `backend` (Express, middleware, Drizzle, Item model, tests).
5. Update root README run instructions.
6. Verify: API tests pass; browser flow submits a title and lists it (manual or closest substitute if browser tools are used).
