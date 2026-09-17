import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { verifyPassword } from "../lib/password.js";
import { HttpError } from "../middleware/error.js";
import { requireAuth } from "../middleware/require-auth.js";
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
    req.session.userId = row.id;
    res.json({ user: { id: row.id, email: row.email } });
  }),
);

authRouter.post(
  "/auth/logout",
  asyncHandler(async (req, res) => {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    res.clearCookie("sid");
    res.json({ ok: true });
  }),
);

authRouter.get(
  "/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await models.users.findById(req.user!.id);
    if (!row) {
      throw new HttpError(401, "Unauthorized");
    }
    res.json({ user: { id: row.id, email: row.email } });
  }),
);
