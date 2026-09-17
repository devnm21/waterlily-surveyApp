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
