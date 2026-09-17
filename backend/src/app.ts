import cors from "cors";
import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { usersRouter } from "./routes/users.js";

export const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
app.use(healthRouter);
app.use(usersRouter);
app.use(authRouter);
app.use(notFoundHandler);
app.use(errorHandler);
