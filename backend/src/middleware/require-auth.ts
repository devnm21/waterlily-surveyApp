import type { RequestHandler } from "express";
import { HttpError } from "./error.js";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const userId = req.session.userId;
  if (!userId) {
    next(new HttpError(401, "Unauthorized"));
    return;
  }
  req.user = { id: userId };
  next();
};
