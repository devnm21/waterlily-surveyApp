import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { models } from "../models/index.js";

export const usersRouter = Router();

usersRouter.post(
  "/users",
  asyncHandler(async (req, res) => {
    const user = await models.users.create({
      email: String(req.body?.email ?? ""),
      password: String(req.body?.password ?? ""),
    });
    res.status(201).json({ user });
  }),
);
