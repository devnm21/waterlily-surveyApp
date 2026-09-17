import cors from "cors";
import express from "express";
import session from "express-session";
import { readFileSync } from "node:fs";
import { SqliteSessionStore } from "./db/session-store.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { surveysRouter } from "./routes/surveys.js";
import { usersRouter } from "./routes/users.js";

export const app = express();

const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET ??
  (process.env.SESSION_SECRET_FILE
    ? readFileSync(process.env.SESSION_SECRET_FILE, "utf8").trim()
    : undefined);
if (isProduction && !sessionSecret) {
  throw new Error("SESSION_SECRET is required in production");
}

app.set("trust proxy", isProduction ? 1 : false);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(
  session({
    name: "sid",
    secret: sessionSecret ?? "dev-insecure-secret",
    store: isProduction ? new SqliteSessionStore() : undefined,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
app.use(healthRouter);
app.use(usersRouter);
app.use(authRouter);
app.use(surveysRouter);
app.use(notFoundHandler);
app.use(errorHandler);
