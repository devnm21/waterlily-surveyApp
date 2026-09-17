import cors from "cors";
import express from "express";
import session from "express-session";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { surveysRouter } from "./routes/surveys.js";
import { usersRouter } from "./routes/users.js";

export const app = express();

const sessionSecret = process.env.SESSION_SECRET ?? "dev-insecure-secret";

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    name: "sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
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
