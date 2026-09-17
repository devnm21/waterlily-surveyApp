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
