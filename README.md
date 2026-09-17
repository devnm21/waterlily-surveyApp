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
